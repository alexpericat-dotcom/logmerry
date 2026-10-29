-- Essai de suppression d'un compte jetable (dette lot C, 29 octobre 2026) : à lancer dans l'éditeur SQL de Supabase AVANT la purge de la base, au passage à l'outil pro.
-- Il crée un compte fictif avec un jeu de données complet, tente de le supprimer, puis ANNULE TOUT : le résultat se lit dans le message d'erreur final
-- (« RESULTAT (tout est annulé) : … OK » ou « ECHEC (…) » avec la clé qui bloque). Résultat du 29 octobre 2026 : OK. Aucune ligne ne reste.
-- Les colonnes de auth.users évoluent avec Supabase : si l'insertion échoue, corriger la liste de colonnes, pas la base.
do $$
declare uid uuid := gen_random_uuid(); cid uuid := gen_random_uuid(); result text;
begin
  insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token, email_change, email_change_token_new)
    values (uid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'jetable-' || uid || '@example.com', 'x', now(), '{}', '{}', now(), now(), '', '', '', '');
  insert into public.clients (id, owner_id, name, origin) values (cid, uid, 'Fiche jetable (essai)', 'demo');
  insert into public.missions (owner_id, client_id, title) values (uid, cid, 'Mission jetable (essai)');
  begin
    delete from auth.users where id = uid;
    result := 'suppression du compte : OK';
  exception when others then
    result := 'suppression du compte : ECHEC (' || sqlstate || ' ' || sqlerrm || ')';
  end;
  raise exception 'RESULTAT (tout est annulé) : %', result;
end $$;

-- Jeu complet (profil, fiche, mission, devis, facture, encaissement, sprint, story, tâche, note, message, citation) : remplacer le corps du bloc ci-dessus par celui-ci.
-- do $$
-- declare uid uuid := gen_random_uuid(); cid uuid := gen_random_uuid(); mid uuid := gen_random_uuid();
--         qid uuid := gen_random_uuid(); iid uuid := gen_random_uuid(); sid uuid := gen_random_uuid();
--         stid uuid := gen_random_uuid(); nid uuid := gen_random_uuid(); msg uuid := gen_random_uuid(); result text;
-- begin
--   insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token, email_change, email_change_token_new)
--     values (uid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'jetable-' || uid || '@example.com', 'x', now(), '{}', '{}', now(), now(), '', '', '', '');
--   insert into public.professional_profile (owner_id) values (uid);
--   insert into public.clients (id, owner_id, name, origin) values (cid, uid, 'Fiche jetable (essai)', 'demo');
--   insert into public.missions (id, owner_id, client_id, title) values (mid, uid, cid, 'Mission jetable (essai)');
--   insert into public.quotes (id, owner_id, client_id, mission_id, amount_ht_cents) values (qid, uid, cid, mid, 100000);
--   insert into public.invoices (id, owner_id, mission_id, quote_id, amount_ht_cents, due_on) values (iid, uid, mid, qid, 100000, current_date);
--   insert into public.payments (owner_id, invoice_id, amount_ht_cents, received_on) values (uid, iid, 50000, current_date);
--   insert into public.sprints (id, owner_id, mission_id, name, start_date, end_date) values (sid, uid, mid, 'Sprint jetable', current_date, current_date + 7);
--   insert into public.user_stories (id, owner_id, mission_id, sprint_id, title, position) values (stid, uid, mid, sid, 'Story jetable', 0);
--   insert into public.tasks (owner_id, story_id, title, position) values (uid, stid, 'Tâche jetable', 0);
--   insert into public.notes (id, owner_id, client_id, title) values (nid, uid, cid, 'Note jetable');
--   insert into public.messages (id, owner_id, role, content) values (msg, uid, 'assistant', 'Réponse jetable');
--   insert into public.message_citations (owner_id, message_id, position, note_id) values (uid, msg, 0, nid);
--   begin
--     delete from auth.users where id = uid;
--     result := 'suppression du compte (jeu complet) : OK';
--   exception when others then
--     result := 'suppression du compte (jeu complet) : ECHEC (' || sqlstate || ' ' || sqlerrm || ')';
--   end;
--   raise exception 'RESULTAT (tout est annulé) : %', result;
-- end $$;
