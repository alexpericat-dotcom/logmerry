-- Audit de sécurité, lot C : permet au test nocturne (tests/isolation.test.ts, clé publique) de vérifier la base RÉELLE : chaque table de `public`
-- a-t-elle la sécurité par ligne activée et au moins une politique ? Une table créée à la main dans l'éditeur SQL, sans migration, serait ainsi vue.
-- Lecture du catalogue seulement (visible de tous les rôles), exécutée avec les droits de l'appelant ; aucune donnée de l'application n'est lue.
create function public.rls_audit() returns table (table_name text, rls_enabled boolean, policy_count integer)
language sql
stable
set search_path = ''
as $$
  select c.relname::text, c.relrowsecurity, (select count(*)::integer from pg_catalog.pg_policy p where p.polrelid = c.oid)
  from pg_catalog.pg_class c
  join pg_catalog.pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind in ('r', 'p')
  order by c.relname;
$$;

revoke all on function public.rls_audit() from public, anon;
grant execute on function public.rls_audit() to authenticated;
