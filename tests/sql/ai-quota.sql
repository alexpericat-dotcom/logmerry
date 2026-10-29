-- Audit de sécurité, lot B : plafond d'appels à l'IA (table ai_calls, fonction consume_ai_quota) vérifié en base sous la RLS de deux comptes fictifs.
-- Ce que tests/isolation.test.ts ne peut pas faire (les comptes ne peuvent ni insérer ni supprimer leurs lignes) : fenêtre d'une minute, plafond du jour,
-- ménage des lignes de plus de deux jours, absence de session. Rien n'est conservé : tout s'exécute dans une transaction qui se termine par une
-- erreur voulue, « ROLLBACK_OK passed=N failed=0 | ... ». À coller dans l'éditeur SQL de Supabase (rôle postgres). Prérequis : deux comptes @example.com.

create temp table rep (label text, ok boolean, got text);

-- Joue `stmt` en tant que `who` (RLS appliquée). Renvoie 'ok:<lignes>' ou le code d'erreur SQL.
create function pg_temp.act(who uuid, stmt text) returns text language plpgsql as $f$
declare n int; out text;
begin
  perform set_config('request.jwt.claims', json_build_object('sub', who, 'role', 'authenticated')::text, true);
  set local role authenticated;
  begin
    execute stmt;
    get diagnostics n = row_count;
    out := 'ok:' || n;
  exception when others then
    out := sqlstate;
  end;
  reset role;
  return out;
end $f$;

-- Appelle consume_ai_quota() en tant que `who` (NULL : aucune session).
create function pg_temp.q(who uuid) returns text language plpgsql as $f$
declare out text;
begin
  perform set_config('request.jwt.claims', case when who is null then '{"role":"authenticated"}' else json_build_object('sub', who, 'role', 'authenticated')::text end, true);
  set local role authenticated;
  select public.consume_ai_quota() into out;
  reset role;
  return out;
end $f$;

create function pg_temp.chk(label text, got text, want text) returns void language sql as $f$
  insert into rep values (label, got is not distinct from want, got);
$f$;

do $t$
declare ua uuid; ub uuid; i int; r text; oks int := 0;
begin
  select id into ua from auth.users where email like '%@example.com' order by email limit 1;
  select id into ub from auth.users where email like '%@example.com' order by email desc limit 1;
  delete from public.ai_calls where owner_id in (ua, ub);

  for i in 1..20 loop if pg_temp.q(ua) = 'ok' then oks := oks + 1; end if; end loop;
  perform pg_temp.chk('vingt appels par minute passent', oks::text, '20');
  perform pg_temp.chk('le vingt-et-unième est refusé (minute)', pg_temp.q(ua), 'minute');
  perform pg_temp.chk('un refus n''enregistre rien', (select count(*) from public.ai_calls where owner_id = ua)::text, '20');
  perform pg_temp.chk('l''autre compte n''est pas touché', pg_temp.q(ub), 'ok');

  update public.ai_calls set at = now() - interval '61 seconds' where owner_id = ua;
  perform pg_temp.chk('lignes de 61 s : la fenêtre d''une minute est libre', pg_temp.q(ua), 'ok');

  delete from public.ai_calls where owner_id = ua;
  insert into public.ai_calls (owner_id, at) select ua, now() - interval '2 hours' from generate_series(1, 299);
  perform pg_temp.chk('299 appels dans la journée : le 300e passe', pg_temp.q(ua), 'ok');
  perform pg_temp.chk('le 301e est refusé (day), pas « minute »', pg_temp.q(ua), 'day');
  perform pg_temp.chk('un refus du jour n''enregistre rien', (select count(*) from public.ai_calls where owner_id = ua)::text, '300');

  delete from public.ai_calls where owner_id = ua;
  insert into public.ai_calls (owner_id, at) values (ua, now() - interval '3 days'), (ua, now() - interval '25 hours');
  perform pg_temp.chk('une ligne de 3 jours part, celle de 25 h reste, la nouvelle est comptée', pg_temp.q(ua) || ':' || (select count(*) from public.ai_calls where owner_id = ua)::text, 'ok:2');

  perform pg_temp.chk('sans session : « error », rien enregistré', pg_temp.q(null) || ':' || (select count(*) from public.ai_calls where owner_id is null)::text, 'error:0');

  -- Le client ne peut plus écrire dans la table : ni insérer (même pour lui), ni modifier, ni supprimer ; il ne voit que ses lignes.
  perform pg_temp.chk('A n''insère pas de ligne dans ai_calls', pg_temp.act(ua, format('insert into public.ai_calls (owner_id) values (%L)', ua)), '42501');
  perform pg_temp.chk('A ne modifie pas ses lignes', pg_temp.act(ua, format('update public.ai_calls set at = now() - interval ''5 days'' where owner_id = %L', ua)), '42501');
  perform pg_temp.chk('A ne supprime aucune ligne (le plafond reste)', pg_temp.act(ua, format('delete from public.ai_calls where owner_id = %L', ua)), '42501');
  perform pg_temp.chk('les lignes de A sont toujours là', (select count(*) from public.ai_calls where owner_id = ua)::text, '2');
  perform pg_temp.chk('B ne voit aucune ligne de A', pg_temp.act(ub, format('select * from public.ai_calls where owner_id = %L', ua)), 'ok:0');
  perform pg_temp.chk('B n''insère pas de ligne au nom de A', pg_temp.act(ub, format('insert into public.ai_calls (owner_id) values (%L)', ua)), '42501');

  perform pg_temp.chk('consume_ai_quota n''est pas appelable sans connexion', has_function_privilege('anon', 'public.consume_ai_quota()', 'execute')::text, 'false');
  perform pg_temp.chk('ni la table lisible sans connexion', has_table_privilege('anon', 'public.ai_calls', 'select')::text, 'false');

  select 'ROLLBACK_OK passed=' || count(*) filter (where ok) || ' failed=' || count(*) filter (where not ok)
         || coalesce(' | ' || string_agg(label || ' (obtenu ' || got || ')', ' ; ') filter (where not ok), '')
    into r from rep;
  raise exception '%', r;
end $t$;
