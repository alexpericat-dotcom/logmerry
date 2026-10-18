-- Story 4.1b : cycle de vie des règles réglementaires versionnées, vérifié en base sous la RLS de deux comptes fictifs.
-- Rien n'est conservé : tout s'exécute dans une transaction qui se termine par une erreur voulue,
-- « ROLLBACK_OK passed=N failed=0 | ... ». Une règle « vérifiée » ne se supprime jamais, donc ce scénario
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
  ua uuid; ub uuid; r text; v1 uuid; v2 uuid; e1 uuid; bb uuid; a1 uuid; a2 uuid; early uuid;
  ok_src text := 'https://example.org/source';
begin
  select id into ua from auth.users where email like '%@example.com' order by email limit 1;
  select id into ub from auth.users where email like '%@example.com' order by email desc limit 1;
  if ua is null or ua = ub then raise exception 'il faut deux comptes @example.com'; end if;

  -- Piège SQL à trois valeurs : avant tout appel de create_rule_version, le réglage n'existe pas (NULL) ; la fin ne doit pas se poser à la main.
  insert into public.regulatory_rules (owner_id, rule_key, activity_category, params, effective_from, source, verified_on, revalidate_after)
    values (ua, 'early_key', 'bnc', '{}', '2026-01-01', ok_src, '2026-10-01', '2027-01-01') returning id into early;
  perform pg_temp.chk('effective_to à la main refusé, réglage encore inexistant (NULL)', pg_temp.act(ua, format('update public.regulatory_rules set effective_to = ''2027-01-01'' where id = %L', early)), '23514');

  -- Création par la fonction
  perform pg_temp.chk('A crée la version 1', pg_temp.act(ua, format('select public.create_rule_version(%L, %L, %L, %L::jsonb, %L, %L, %L)', 'test_key', 'bnc', '2026-01-01', '{"v":1}', ok_src, '2026-10-01', '2027-10-01')), 'ok:1');
  select id into v1 from public.regulatory_rules where owner_id = ua and rule_key = 'test_key';
  perform pg_temp.chk('défauts : A propriétaire, à vérifier, en vigueur, sans précédente', (select (owner_id = ua)::text || '/' || status || '/' || coalesce(effective_to::text, 'null') || '/' || coalesce(previous_version_id::text, 'null') from public.regulatory_rules where id = v1), 'true/a_verifier/null/null');

  -- Contraintes de saisie (insertion directe, sous RLS)
  perform pg_temp.chk('source vide refusée', pg_temp.act(ua, format('insert into public.regulatory_rules (rule_key, activity_category, params, effective_from, source, verified_on, revalidate_after) values (''k1'', ''bnc'', ''{}'', ''2026-01-01'', '''', ''2026-10-01'', ''2027-01-01'')')), '23514');
  perform pg_temp.chk('date de vérification absente refusée', pg_temp.act(ua, format('insert into public.regulatory_rules (rule_key, activity_category, params, effective_from, source, revalidate_after) values (''k1'', ''bnc'', ''{}'', ''2026-01-01'', %L, ''2027-01-01'')', ok_src)), '23502');
  perform pg_temp.chk('date d''effet absente refusée', pg_temp.act(ua, format('insert into public.regulatory_rules (rule_key, activity_category, params, source, verified_on, revalidate_after) values (''k1'', ''bnc'', ''{}'', %L, ''2026-10-01'', ''2027-01-01'')', ok_src)), '23502');
  perform pg_temp.chk('« vérifiée » d''emblée refusée à l''insertion (RLS)', pg_temp.act(ua, format('insert into public.regulatory_rules (rule_key, activity_category, params, effective_from, source, verified_on, revalidate_after, status) values (''k1'', ''bnc'', ''{}'', ''2026-01-01'', %L, ''2026-10-01'', ''2027-01-01'', ''verifiee'')', ok_src)), '42501');
  perform pg_temp.chk('create_rule_version refuse le statut « vérifiée »', pg_temp.act(ua, format('select public.create_rule_version(%L, %L, %L, %L::jsonb, %L, %L, %L, null, ''verifiee'')', 'k_link', 'bnc', '2026-01-01', '{}', ok_src, '2026-10-01', '2027-01-01')), '42501');
  perform pg_temp.chk('crée « à vérifier » avec une source sans lien', pg_temp.act(ua, format('select public.create_rule_version(%L, %L, %L, %L::jsonb, %L, %L, %L)', 'k_link', 'bnc', '2026-01-01', '{}', 'texte libre', '2026-10-01', '2027-01-01')), 'ok:1');
  perform pg_temp.chk('« vérifiée » sans lien refusée', pg_temp.act(ua, 'update public.regulatory_rules set status = ''verifiee'' where rule_key = ''k_link'''), '23514');
  perform pg_temp.chk('source http acceptée tant que la règle est « à vérifier »', pg_temp.act(ua, 'update public.regulatory_rules set source = ''http://example.org'' where rule_key = ''k_link'''), 'ok:1');
  perform pg_temp.chk('… http ne passe pas non plus en « vérifiée »', pg_temp.act(ua, 'update public.regulatory_rules set status = ''verifiee'' where rule_key = ''k_link'''), '23514');
  perform pg_temp.chk('« vérifiée » avec lien https acceptée (par mise à jour)', pg_temp.act(ua, 'update public.regulatory_rules set source = ' || quote_literal(ok_src) || ', status = ''verifiee'' where rule_key = ''k_link'''), 'ok:1');
  perform pg_temp.chk('« essai » sans source DEMO refusée', pg_temp.act(ua, format('insert into public.regulatory_rules (rule_key, activity_category, params, effective_from, source, verified_on, revalidate_after, status) values (''k2'', ''bnc'', ''{}'', ''2026-01-01'', %L, ''2026-10-01'', ''2027-01-01'', ''essai'')', ok_src)), '23514');
  perform pg_temp.chk('source DEMO sans « essai » refusée', pg_temp.act(ua, format('insert into public.regulatory_rules (rule_key, activity_category, params, effective_from, source, verified_on, revalidate_after) values (''k2'', ''bnc'', ''{}'', ''2026-01-01'', ''DEMO'', ''2026-10-01'', ''2027-01-01'')')), '23514');
  perform pg_temp.chk('« essai » avec source DEMO acceptée', pg_temp.act(ua, format('insert into public.regulatory_rules (rule_key, activity_category, params, effective_from, source, verified_on, revalidate_after, status) values (''k_demo'', ''bnc'', ''{}'', ''2026-01-01'', ''DEMO'', ''2026-10-01'', ''2027-01-01'', ''essai'')')), 'ok:1');
  perform pg_temp.chk('revérification avant la vérification refusée', pg_temp.act(ua, format('insert into public.regulatory_rules (rule_key, activity_category, params, effective_from, source, verified_on, revalidate_after) values (''k3'', ''bnc'', ''{}'', ''2026-01-01'', %L, ''2026-10-01'', ''2026-09-30'')', ok_src)), '23514');
  perform pg_temp.chk('version déjà close à l''insertion refusée (RLS)', pg_temp.act(ua, format('insert into public.regulatory_rules (rule_key, activity_category, params, effective_from, effective_to, source, verified_on, revalidate_after) values (''k3'', ''bnc'', ''{}'', ''2026-01-01'', ''2026-02-01'', %L, ''2026-10-01'', ''2027-01-01'')', ok_src)), '42501');
  perform pg_temp.chk('params qui n''est pas un objet refusé', pg_temp.act(ua, format('insert into public.regulatory_rules (rule_key, activity_category, params, effective_from, source, verified_on, revalidate_after) values (''k3'', ''bnc'', ''[1]'', ''2026-01-01'', %L, ''2026-10-01'', ''2027-01-01'')', ok_src)), '23514');
  perform pg_temp.chk('catégorie d''activité inconnue refusée', pg_temp.act(ua, format('insert into public.regulatory_rules (rule_key, activity_category, params, effective_from, source, verified_on, revalidate_after) values (''k3'', ''xyz'', ''{}'', ''2026-01-01'', %L, ''2026-10-01'', ''2027-01-01'')', ok_src)), '23514');
  perform pg_temp.chk('même clé, autre catégorie : autorisé', pg_temp.act(ua, format('select public.create_rule_version(%L, %L, %L, %L::jsonb, %L, %L, %L)', 'test_key', 'bic', '2026-01-01', '{"v":9}', ok_src, '2026-10-01', '2027-10-01')), 'ok:1');

  -- Vérifier, corriger : params modifiables seulement tant que « à vérifier »
  perform pg_temp.chk('vérifier la version 1', pg_temp.act(ua, format('update public.regulatory_rules set status = ''verifiee'' where id = %L', v1)), 'ok:1');
  perform pg_temp.chk('params d''une règle vérifiée figés', pg_temp.act(ua, format('update public.regulatory_rules set params = ''{"v":2}'' where id = %L', v1)), '23514');
  perform pg_temp.chk('repasser « à vérifier »', pg_temp.act(ua, format('update public.regulatory_rules set status = ''a_verifier'' where id = %L', v1)), 'ok:1');
  perform pg_temp.chk('params corrigeables « à vérifier »', pg_temp.act(ua, format('update public.regulatory_rules set params = ''{"v":2}'' where id = %L', v1)), 'ok:1');
  perform pg_temp.chk('re-vérifier avec une nouvelle date', pg_temp.act(ua, format('update public.regulatory_rules set status = ''verifiee'', verified_on = ''2026-10-10'', revalidate_after = ''2027-10-10'' where id = %L', v1)), 'ok:1');

  -- Nouvelle version : ferme la précédente, chaînée
  perform pg_temp.chk('A crée la version 2', pg_temp.act(ua, format('select public.create_rule_version(%L, %L, %L, %L::jsonb, %L, %L, %L)', 'test_key', 'bnc', '2026-07-01', '{"v":3}', ok_src, '2026-10-11', '2027-10-11')), 'ok:1');
  select id into v2 from public.regulatory_rules where owner_id = ua and rule_key = 'test_key' and activity_category = 'bnc' and effective_from = '2026-07-01';
  perform pg_temp.chk('la version 1 est close à la date d''effet de la 2', (select effective_to::text from public.regulatory_rules where id = v1), '2026-07-01');
  perform pg_temp.chk('la version 2 est en vigueur, chaînée, à vérifier', (select coalesce(effective_to::text, 'null') || '/' || (previous_version_id = v1)::text || '/' || status from public.regulatory_rules where id = v2), 'null/true/a_verifier');
  perform pg_temp.chk('la version 1 vérifiée garde son statut', (select status::text from public.regulatory_rules where id = v1), 'verifiee');

  -- Chevauchement : refusé par la base
  perform pg_temp.chk('même date d''effet que la version 2 refusée', pg_temp.act(ua, format('select public.create_rule_version(%L, %L, %L, %L::jsonb, %L, %L, %L)', 'test_key', 'bnc', '2026-07-01', '{}', ok_src, '2026-10-11', '2027-10-11')), '23P01');
  perform pg_temp.chk('date d''effet avant la version 1 refusée (chevauche)', pg_temp.act(ua, format('select public.create_rule_version(%L, %L, %L, %L::jsonb, %L, %L, %L)', 'test_key', 'bnc', '2025-06-01', '{}', ok_src, '2026-10-11', '2027-10-11')), '23P01');
  perform pg_temp.chk('date d''effet dans l''intervalle clos de la version 1 refusée', pg_temp.act(ua, format('select public.create_rule_version(%L, %L, %L, %L::jsonb, %L, %L, %L)', 'test_key', 'bnc', '2026-03-01', '{}', ok_src, '2026-10-11', '2027-10-11')), '23P01');
  perform pg_temp.chk('insertion directe qui chevauche refusée', pg_temp.act(ua, format('insert into public.regulatory_rules (rule_key, activity_category, params, effective_from, source, verified_on, revalidate_after) values (''test_key'', ''bnc'', ''{}'', ''2026-08-01'', %L, ''2026-10-01'', ''2027-01-01'')', ok_src)), '23P01');
  perform pg_temp.chk('la tentative refusée ne laisse aucune trace (2 versions bnc)', (select count(*)::text from public.regulatory_rules where owner_id = ua and rule_key = 'test_key' and activity_category = 'bnc'), '2');

  -- Ce qui ne change jamais, et effective_to réservé à la fonction
  perform pg_temp.chk('effective_to d''une version en vigueur : pas à la main', pg_temp.act(ua, format('update public.regulatory_rules set effective_to = ''2027-01-01'' where id = %L', v2)), '23514');
  perform pg_temp.chk('effective_to d''une version close : pas à la main', pg_temp.act(ua, format('update public.regulatory_rules set effective_to = ''2026-05-01'' where id = %L', v1)), '23514');
  perform pg_temp.chk('date d''effet figée', pg_temp.act(ua, format('update public.regulatory_rules set effective_from = ''2026-08-01'' where id = %L', v2)), '23514');
  perform pg_temp.chk('clé figée', pg_temp.act(ua, format('update public.regulatory_rules set rule_key = ''autre'' where id = %L', v2)), '23514');
  perform pg_temp.chk('catégorie figée', pg_temp.act(ua, format('update public.regulatory_rules set activity_category = ''bic'' where id = %L', v2)), '23514');
  perform pg_temp.chk('chaînage figé', pg_temp.act(ua, format('update public.regulatory_rules set previous_version_id = null where id = %L', v2)), '23514');
  perform pg_temp.chk('propriétaire figé', pg_temp.act(ua, format('update public.regulatory_rules set owner_id = %L where id = %L', ub, v2)), '23514');
  perform pg_temp.chk('revérifier une règle vérifiée : dates modifiables', pg_temp.act(ua, format('update public.regulatory_rules set verified_on = ''2026-10-12'', revalidate_after = ''2027-10-12'' where id = %L', v1)), 'ok:1');
  perform pg_temp.chk('id figé', pg_temp.act(ua, format('update public.regulatory_rules set id = gen_random_uuid() where id = %L', v2)), '23514');
  perform pg_temp.chk('created_at figé', pg_temp.act(ua, format('update public.regulatory_rules set created_at = now() - interval ''1 year'' where id = %L', v2)), '23514');
  perform pg_temp.chk('version close et vérifiée : ne repasse pas « à vérifier »', pg_temp.act(ua, format('update public.regulatory_rules set status = ''a_verifier'' where id = %L', v1)), '23514');
  perform pg_temp.chk('version vérifiée : la source ne change pas', pg_temp.act(ua, format('update public.regulatory_rules set source = ''https://example.org/autre'' where id = %L', v1)), '23514');
  perform pg_temp.chk('version vérifiée : la note ne change pas', pg_temp.act(ua, format('update public.regulatory_rules set description = ''x'' where id = %L', v1)), '23514');
  perform pg_temp.chk('version close et vérifiée : params figés', pg_temp.act(ua, format('update public.regulatory_rules set params = ''{"v":99}'' where id = %L', v1)), '23514');
  perform set_config('app.rule_version', 'on', true); -- même avec le réglage posé à la main, une version close ne bouge pas
  perform pg_temp.chk('effective_to d''une version close : refusé même réglage posé', pg_temp.act(ua, format('update public.regulatory_rules set effective_to = ''2026-05-01'' where id = %L', v1)), '23514');
  perform set_config('app.rule_version', 'off', true);

  -- Statut « essai » : on n'y entre pas, on n'en sort pas
  select id into e1 from public.regulatory_rules where owner_id = ua and rule_key = 'k_demo';
  perform pg_temp.chk('essai -> à vérifier refusé', pg_temp.act(ua, format('update public.regulatory_rules set status = ''a_verifier'', source = %L where id = %L', ok_src, e1)), '23514');
  perform pg_temp.chk('à vérifier -> essai refusé', pg_temp.act(ua, format('update public.regulatory_rules set status = ''essai'', source = ''DEMO'' where id = %L', v2)), '23514');
  perform pg_temp.chk('create_rule_version avec statut « essai » et source DEMO', pg_temp.act(ua, format('select public.create_rule_version(%L, %L, %L, %L::jsonb, %L, %L, %L, null, ''essai'')', 'k_demo', 'bnc', '2026-06-01', '{}', 'DEMO', '2026-10-01', '2027-01-01')), 'ok:1');

  -- Suppression : jamais une règle vérifiée
  perform pg_temp.chk('règle vérifiée : suppression sans effet', pg_temp.act(ua, format('delete from public.regulatory_rules where id = %L', v1)), 'ok:0');
  perform pg_temp.chk('règle d''essai supprimable', pg_temp.act(ua, format('delete from public.regulatory_rules where rule_key = ''k_demo'' and owner_id = %L', ua)), 'ok:2');
  perform pg_temp.chk('règle « à vérifier » supprimable', pg_temp.act(ua, format('delete from public.regulatory_rules where id = %L', v2)), 'ok:1');
  perform pg_temp.chk('crée a1', pg_temp.act(ua, format('select public.create_rule_version(%L, %L, %L, %L::jsonb, %L, %L, %L)', 'chain_key', 'bnc', '2026-01-01', '{}', ok_src, '2026-10-01', '2027-10-01')), 'ok:1');
  perform pg_temp.chk('crée a2 (chaînée à a1)', pg_temp.act(ua, format('select public.create_rule_version(%L, %L, %L, %L::jsonb, %L, %L, %L)', 'chain_key', 'bnc', '2026-06-01', '{}', ok_src, '2026-10-01', '2027-10-01')), 'ok:1');
  select id into a1 from public.regulatory_rules where owner_id = ua and rule_key = 'chain_key' and effective_from = '2026-01-01';
  select id into a2 from public.regulatory_rules where owner_id = ua and rule_key = 'chain_key' and effective_from = '2026-06-01';
  perform pg_temp.chk('supprimer a1 qui a une successeure : accepté', pg_temp.act(ua, format('delete from public.regulatory_rules where id = %L', a1)), 'ok:1');
  perform pg_temp.chk('a2 survit, sans chaînage', (select coalesce(previous_version_id::text, 'null') from public.regulatory_rules where id = a2), 'null');
  perform pg_temp.chk('a2 garde sa date d''effet et reste en vigueur', (select effective_from::text || '/' || coalesce(effective_to::text, 'null') from public.regulatory_rules where id = a2), '2026-06-01/null');
  perform pg_temp.chk('chaînage réécrit à la main refusé', pg_temp.act(ua, format('update public.regulatory_rules set previous_version_id = %L where id = %L', v1, a2)), '23514');

  -- Chaînage forgé (la clé étrangère contourne la RLS)
  insert into public.regulatory_rules (owner_id, rule_key, activity_category, params, effective_from, source, verified_on, revalidate_after)
    values (ub, 'test_key', 'bnc', '{}', '2026-01-01', ok_src, '2026-10-01', '2027-01-01') returning id into bb;
  perform pg_temp.chk('A ne chaîne pas sa version à celle de B', pg_temp.act(ua, format('insert into public.regulatory_rules (rule_key, activity_category, params, effective_from, source, verified_on, revalidate_after, previous_version_id) values (''test_key'', ''bnc'', ''{}'', ''2030-01-01'', %L, ''2026-10-01'', ''2027-01-01'', %L)', ok_src, bb)), '42501');
  perform pg_temp.chk('A ne chaîne pas à une autre clé à lui', pg_temp.act(ua, format('insert into public.regulatory_rules (rule_key, activity_category, params, effective_from, source, verified_on, revalidate_after, previous_version_id) values (''autre_cle'', ''bnc'', ''{}'', ''2030-01-01'', %L, ''2026-10-01'', ''2027-01-01'', %L)', ok_src, v1)), '42501');
  perform pg_temp.chk('A ne chaîne pas à une autre catégorie', pg_temp.act(ua, format('insert into public.regulatory_rules (rule_key, activity_category, params, effective_from, source, verified_on, revalidate_after, previous_version_id) values (''test_key'', ''bic'', ''{}'', ''2030-01-01'', %L, ''2026-10-01'', ''2027-01-01'', %L)', ok_src, v1)), '42501');
  perform pg_temp.chk('A ne chaîne pas à une version qui ne précède pas', pg_temp.act(ua, format('insert into public.regulatory_rules (rule_key, activity_category, params, effective_from, source, verified_on, revalidate_after, previous_version_id) values (''test_key'', ''bnc'', ''{}'', ''2025-01-01'', %L, ''2026-10-01'', ''2027-01-01'', %L)', ok_src, v1)), '42501');

  -- Isolation : B face aux règles de A
  perform pg_temp.chk('B ne voit aucune règle de A', pg_temp.act(ub, format('select 1 from public.regulatory_rules where owner_id = %L', ua)), 'ok:0');
  perform pg_temp.chk('B ne modifie pas la règle de A', pg_temp.act(ub, format('update public.regulatory_rules set description = ''x'' where id = %L', v1)), 'ok:0');
  perform pg_temp.chk('B ne supprime pas la règle de A', pg_temp.act(ub, format('delete from public.regulatory_rules where id = %L', v1)), 'ok:0');
  perform pg_temp.chk('B ne crée pas de règle au nom de A', pg_temp.act(ub, format('insert into public.regulatory_rules (owner_id, rule_key, activity_category, params, effective_from, source, verified_on, revalidate_after) values (%L, ''x'', ''bnc'', ''{}'', ''2026-01-01'', %L, ''2026-10-01'', ''2027-01-01'')', ua, ok_src)), '42501');
  perform pg_temp.chk('B crée après la version de A sans l''atteindre', pg_temp.act(ub, format('select public.create_rule_version(%L, %L, %L, %L::jsonb, %L, %L, %L)', 'test_key', 'bic', '2027-01-01', '{}', ok_src, '2026-10-01', '2027-10-01')), 'ok:1');
  perform pg_temp.chk('la version de B n''est chaînée à rien', (select coalesce(previous_version_id::text, 'null') from public.regulatory_rules where owner_id = ub and rule_key = 'test_key' and activity_category = 'bic'), 'null');
  perform pg_temp.chk('create_rule_version de B n''a pas fermé la version de A', (select coalesce(effective_to::text, 'null') from public.regulatory_rules where owner_id = ua and rule_key = 'test_key' and activity_category = 'bic'), 'null');

  -- Droits sur les fonctions
  perform pg_temp.chk('create_rule_version n''est pas appelable sans connexion', has_function_privilege('anon', 'public.create_rule_version(text,text,date,jsonb,text,date,date,text,public.regulatory_rule_status)', 'execute')::text, 'false');
  perform pg_temp.chk('rule_version_is_mine n''est pas appelable sans connexion', has_function_privilege('anon', 'public.rule_version_is_mine(uuid,text,text,date)', 'execute')::text, 'false');
  perform pg_temp.chk('la fonction du déclencheur n''est pas appelable par l''API', has_function_privilege('authenticated', 'public.regulatory_rules_guard()', 'execute')::text, 'false');

  select 'ROLLBACK_OK passed=' || count(*) filter (where ok) || ' failed=' || count(*) filter (where not ok)
         || coalesce(' | ' || string_agg(label || ' (obtenu ' || got || ')', ' ; ') filter (where not ok), '')
    into r from rep;
  raise exception '%', r;
end $t$;
