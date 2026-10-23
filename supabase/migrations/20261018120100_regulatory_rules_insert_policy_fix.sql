-- Story 4.1b, correctif : la règle d'insertion relisait `regulatory_rules` depuis sa propre policy, ce que Postgres refuse
-- (42P17, récursion infinie dans une policy). La vérification « la version précédente est à moi et de la même clé »
-- passe par une fonction SECURITY DEFINER limitée à mes propres lignes : elle ne renvoie qu'un booléen.
create function public.rule_version_is_mine(p_id uuid, p_rule_key text) returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.regulatory_rules p
    where p.id = p_id and p.owner_id = (select auth.uid()) and p.rule_key = p_rule_key
  );
$$;

revoke execute on function public.rule_version_is_mine(uuid, text) from public, anon;
grant execute on function public.rule_version_is_mine(uuid, text) to authenticated;

drop policy regulatory_rules_insert on public.regulatory_rules;
create policy regulatory_rules_insert on public.regulatory_rules for insert to authenticated
  with check (
    owner_id = (select auth.uid())
    and (previous_version_id is null or public.rule_version_is_mine(previous_version_id, rule_key))
  );
