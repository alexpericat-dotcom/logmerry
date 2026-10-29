-- Story 3.6 : cycle de vie des devis, vérifié en base sous la RLS de deux comptes fictifs.
-- Rien n'est conservé : tout s'exécute dans une transaction qui se termine par une erreur voulue,
-- « ROLLBACK_OK passed=N failed=0 | ... ». Un devis envoyé, refusé ou accepté ne se supprime jamais, donc ce scénario
-- ne peut pas tourner dans `tests/isolation.test.ts` (il laisserait des lignes impossibles à nettoyer).
-- À coller dans l'éditeur SQL de Supabase (rôle postgres). Prérequis : deux comptes @example.com existent.

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

create function pg_temp.chk(label text, got text, want text) returns void language sql as $f$
  insert into rep values (label, got is not distinct from want, got);
$f$;

do $t$
declare
  ua uuid; ub uuid;
  ca uuid := gen_random_uuid(); ca2 uuid := gen_random_uuid(); cb uuid := gen_random_uuid();
  ma uuid := gen_random_uuid(); ma2 uuid := gen_random_uuid();
  q1 uuid := gen_random_uuid(); q2 uuid := gen_random_uuid(); q3 uuid := gen_random_uuid();
  q4 uuid := gen_random_uuid(); q5 uuid := gen_random_uuid(); q6 uuid := gen_random_uuid();
  m1 uuid; m2 uuid; q7 uuid := gen_random_uuid(); cl uuid := gen_random_uuid(); r text;
begin
  select id into ua from auth.users where email like '%@example.com' order by email limit 1;
  select id into ub from auth.users where email like '%@example.com' order by email desc limit 1;
  if ua is null or ua = ub then raise exception 'il faut deux comptes @example.com'; end if;

  -- Fixtures (administrateur) : un prospect et un client à A, un client à B.
  insert into public.clients (id, owner_id, name, status, origin) values
    (ca, ua, 'Cabinet Test', 'prospect', 'demo'), (ca2, ua, 'Client Deux', 'client', 'demo'), (cb, ub, 'Fiche de B', 'client', 'demo');
  insert into public.missions (id, owner_id, client_id, title) values (ma, ua, ca, 'Mission 1'), (ma2, ua, ca2, 'Mission 2');

  -- Création et contraintes
  perform pg_temp.chk('A crée un brouillon', pg_temp.act(ua, format('insert into public.quotes (id, client_id, amount_ht_cents) values (%L, %L, 125050)', q1, ca)), 'ok:1');
  perform pg_temp.chk('défauts : brouillon, propriétaire A, taxe inconnue', (select status || '/' || (owner_id = ua) || '/' || coalesce(tax_cents::text, 'null') from public.quotes where id = q1), 'draft/true/null');
  perform pg_temp.chk('montant 0 refusé', pg_temp.act(ua, format('insert into public.quotes (client_id, amount_ht_cents) values (%L, 0)', ca)), '23514');
  perform pg_temp.chk('taxe négative refusée', pg_temp.act(ua, format('insert into public.quotes (client_id, amount_ht_cents, tax_cents) values (%L, 100, -1)', ca)), '23514');
  -- Un devis naît brouillon (règle d'insertion, migration 20261018100300) : aucun autre statut à l'insertion.
  perform pg_temp.chk('insertion directe « accepté » refusée', pg_temp.act(ua, format('insert into public.quotes (client_id, amount_ht_cents, status, sent_on) values (%L, 100, ''accepted'', ''2026-10-19'')', ca)), '42501');
  perform pg_temp.chk('insertion directe « refusé » refusée', pg_temp.act(ua, format('insert into public.quotes (client_id, amount_ht_cents, status, sent_on) values (%L, 100, ''refused'', ''2026-10-19'')', ca)), '42501');
  perform pg_temp.chk('insertion directe « envoyé » refusée', pg_temp.act(ua, format('insert into public.quotes (client_id, amount_ht_cents, status, sent_on) values (%L, 100, ''sent'', ''2026-10-19'')', ca)), '42501');
  perform pg_temp.chk('un brouillon peut garder une date d''envoi saisie', pg_temp.act(ua, format('insert into public.quotes (client_id, amount_ht_cents, sent_on) values (%L, 100, ''2026-10-19'')', ca)), 'ok:1');
  perform pg_temp.chk('brouillon : la date d''envoi s''efface', pg_temp.act(ua, format('update public.quotes set sent_on = null where client_id = %L and status = ''draft'' and sent_on is not null', ca)), 'ok:1'); -- brouillon : la date est facultative
  perform pg_temp.chk('propriétaire forgé refusé', pg_temp.act(ua, format('insert into public.quotes (owner_id, client_id, amount_ht_cents) values (%L, %L, 100)', ub, ca)), '42501');
  perform pg_temp.chk('mission d''un autre client refusée', pg_temp.act(ua, format('insert into public.quotes (client_id, mission_id, amount_ht_cents) values (%L, %L, 100)', ca, ma2)), '42501');

  -- Transitions
  perform pg_temp.chk('brouillon -> accepté refusé', pg_temp.act(ua, format('update public.quotes set status = ''accepted'' where id = %L', q1)), '23514');
  perform pg_temp.chk('brouillon -> refusé refusé', pg_temp.act(ua, format('update public.quotes set status = ''refused'' where id = %L', q1)), '23514');
  perform pg_temp.chk('brouillon -> envoyé sans date refusé', pg_temp.act(ua, format('update public.quotes set status = ''sent'' where id = %L', q1)), '23514');
  perform pg_temp.chk('brouillon -> envoyé avec date', pg_temp.act(ua, format('update public.quotes set status = ''sent'', sent_on = ''2026-10-19'' where id = %L', q1)), 'ok:1');
  perform pg_temp.chk('envoyé -> brouillon refusé', pg_temp.act(ua, format('update public.quotes set status = ''draft'' where id = %L', q1)), '23514');
  perform pg_temp.chk('envoyé -> accepté hors accept_quote refusé', pg_temp.act(ua, format('update public.quotes set status = ''accepted'' where id = %L', q1)), '23514');
  perform pg_temp.chk('envoyé modifiable', pg_temp.act(ua, format('update public.quotes set amount_ht_cents = 130000, tax_cents = 26000 where id = %L', q1)), 'ok:1');

  -- Acceptation
  insert into public.quotes (id, owner_id, client_id, amount_ht_cents) values (q2, ua, ca, 5000); -- brouillon
  perform pg_temp.chk('accepter un brouillon refusé', pg_temp.act(ua, format('select public.accept_quote(%L)', q2)), '23514');
  perform pg_temp.chk('B ne peut pas accepter le devis de A', pg_temp.act(ub, format('select public.accept_quote(%L)', q1)), 'P0002');
  perform pg_temp.chk('accept_quote sur prospect', pg_temp.act(ua, format('select public.accept_quote(%L)', q1)), 'ok:1');
  select mission_id into m1 from public.quotes where id = q1;
  perform pg_temp.chk('devis accepté, mission liée', (select (status = 'accepted' and m1 is not null)::text from public.quotes where id = q1), 'true');
  perform pg_temp.chk('mission « à planifier », titre « client — devis du … »', (select status || ' | ' || title from public.missions where id = m1), 'planned | Cabinet Test — devis du 19/10/2026');
  perform pg_temp.chk('le prospect est devenu client', (select status::text from public.clients where id = ca), 'client');
  perform pg_temp.chk('accepter une 2e fois : même résultat', pg_temp.act(ua, format('select public.accept_quote(%L)', q1)), 'ok:1');
  perform pg_temp.chk('une seule mission créée (2 avec la première)', (select count(*)::text from public.missions where client_id = ca), '2');
  perform pg_temp.chk('mission inchangée après 2e acceptation', (select (mission_id = m1)::text from public.quotes where id = q1), 'true');
  perform pg_temp.chk('accepté : modification refusée', pg_temp.act(ua, format('update public.quotes set amount_ht_cents = 1 where id = %L', q1)), '23514');
  perform pg_temp.chk('accepté : suppression sans effet', pg_temp.act(ua, format('delete from public.quotes where id = %L', q1)), 'ok:0');

  -- Titre de la mission créée : un nom de fiche de 200 caractères avec accents et guillemets tient dans la limite de 200
  insert into public.clients (id, owner_id, name, status, origin) values (cl, ua, repeat('É"l''', 50), 'prospect', 'demo');
  insert into public.quotes (id, owner_id, client_id, amount_ht_cents, status, sent_on) values (q7, ua, cl, 100, 'sent', '2026-10-23');
  perform pg_temp.chk('accept_quote avec un nom de fiche de 200 caractères', pg_temp.act(ua, format('select public.accept_quote(%L)', q7)), 'ok:1');
  select mission_id into m2 from public.quotes where id = q7;
  perform pg_temp.chk('titre de mission borné à 200, nom en tête, date en queue', (select (char_length(title) <= 200 and title like 'É"l''%' and title like '% — devis du 23/10/2026')::text from public.missions where id = m2), 'true');

  -- Refus
  insert into public.quotes (id, owner_id, client_id, amount_ht_cents, status, sent_on) values (q3, ua, ca, 7000, 'sent', '2026-10-20');
  perform pg_temp.chk('envoyé -> refusé', pg_temp.act(ua, format('update public.quotes set status = ''refused'' where id = %L', q3)), 'ok:1');
  perform pg_temp.chk('refusé -> envoyé refusé (définitif)', pg_temp.act(ua, format('update public.quotes set status = ''sent'' where id = %L', q3)), '23514');
  perform pg_temp.chk('accepter un refusé refusé', pg_temp.act(ua, format('select public.accept_quote(%L)', q3)), '23514');
  perform pg_temp.chk('refusé : suppression sans effet', pg_temp.act(ua, format('delete from public.quotes where id = %L', q3)), 'ok:0');

  -- Devis lié à une mission existante : rien d'autre ne change
  insert into public.quotes (id, owner_id, client_id, mission_id, amount_ht_cents, status, sent_on) values (q4, ua, ca2, ma2, 9000, 'sent', '2026-10-21');
  perform pg_temp.chk('accept_quote avec mission existante', pg_temp.act(ua, format('select public.accept_quote(%L)', q4)), 'ok:1');
  perform pg_temp.chk('aucune mission créée, fiche inchangée', (select (select count(*) from public.missions where client_id = ca2)::text || '/' || (select status from public.clients where id = ca2)), '1/client');
  perform pg_temp.chk('mission liée gardée en cours', (select status::text from public.missions where id = ma2), 'in_progress');

  -- Suppression : brouillon seulement
  perform pg_temp.chk('brouillon supprimable', pg_temp.act(ua, format('delete from public.quotes where id = %L', q2)), 'ok:1');
  insert into public.quotes (id, owner_id, client_id, amount_ht_cents, status, sent_on) values (q5, ua, ca, 100, 'sent', '2026-10-22');
  perform pg_temp.chk('envoyé : suppression sans effet', pg_temp.act(ua, format('delete from public.quotes where id = %L', q5)), 'ok:0');

  -- Isolation : B face aux devis de A
  insert into public.quotes (id, owner_id, client_id, amount_ht_cents) values (q6, ua, ca, 200); -- brouillon de A
  perform pg_temp.chk('B ne voit aucun devis de A', pg_temp.act(ub, format('select 1 from public.quotes where owner_id = %L', ua)), 'ok:0');
  perform pg_temp.chk('B ne modifie pas le brouillon de A', pg_temp.act(ub, format('update public.quotes set amount_ht_cents = 1 where id = %L', q6)), 'ok:0');
  perform pg_temp.chk('B ne supprime pas le brouillon de A', pg_temp.act(ub, format('delete from public.quotes where id = %L', q6)), 'ok:0');
  perform pg_temp.chk('B ne crée pas de devis sur la fiche de A', pg_temp.act(ub, format('insert into public.quotes (client_id, amount_ht_cents) values (%L, 100)', ca)), '42501');
  perform pg_temp.chk('B ne lie pas son devis à la mission de A', pg_temp.act(ub, format('insert into public.quotes (client_id, mission_id, amount_ht_cents) values (%L, %L, 100)', cb, ma)), '42501');
  perform pg_temp.chk('A ne déplace pas son devis vers la fiche de B', pg_temp.act(ua, format('update public.quotes set client_id = %L where id = %L', cb, q6)), '42501');
  perform pg_temp.chk('accept_quote n''est pas appelable sans connexion', has_function_privilege('anon', 'public.accept_quote(uuid)', 'execute')::text, 'false');

  select 'ROLLBACK_OK passed=' || count(*) filter (where ok) || ' failed=' || count(*) filter (where not ok)
         || coalesce(' | ' || string_agg(label || ' (obtenu ' || got || ')', ' ; ') filter (where not ok), '')
    into r from rep;
  raise exception '%', r;
end $t$;
