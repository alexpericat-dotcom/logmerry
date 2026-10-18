-- Story 4.1b, durcissement après relecture indépendante.
-- 1. Supprimer une version qui a une successeure : la clé étrangère `on delete set null` mettait `previous_version_id` à NULL sur la successeure,
--    et le garde le refusait (23514). Le passage à NULL est permis seulement quand la version précédente n'existe plus.
-- 2. L'historique est figé : une version close et vérifiée ne repasse plus « à vérifier » (donc ni modifiable ni supprimable) ;
--    la source et la note d'une règle vérifiée ne changent qu'après être repassée « à vérifier » (version en vigueur seulement) ; `id` est figé.
-- 3. À l'insertion : jamais « vérifiée » d'emblée, jamais déjà close ; `create_rule_version` refuse aussi le statut « vérifiée ».
-- 4. `rule_version_is_mine` contrôle aussi la catégorie d'activité et l'ordre des dates.
create or replace function public.regulatory_rules_guard() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.id is distinct from old.id
     or new.owner_id is distinct from old.owner_id
     or new.rule_key is distinct from old.rule_key
     or new.activity_category is distinct from old.activity_category
     or new.effective_from is distinct from old.effective_from
     or new.created_at is distinct from old.created_at then
    raise exception 'rule identity is immutable' using errcode = '23514';
  end if;
  -- Le chaînage ne change jamais, sauf le passage à NULL quand la version précédente vient d'être supprimée (action de la clé étrangère).
  if new.previous_version_id is distinct from old.previous_version_id
     and not (
       new.previous_version_id is null and old.previous_version_id is not null
       and not exists (select 1 from public.regulatory_rules p where p.id = old.previous_version_id)
     ) then
    raise exception 'rule chaining is immutable' using errcode = '23514';
  end if;
  -- coalesce : sans réglage, current_setting(..., true) vaut NULL et un « if NULL » ne lèverait rien.
  if new.effective_to is distinct from old.effective_to
     and not (coalesce(current_setting('app.rule_version', true), '') = 'on' and old.effective_to is null) then
    raise exception 'effective_to is set by create_rule_version only' using errcode = '23514';
  end if;
  if new.params is distinct from old.params and old.status <> 'a_verifier' then
    raise exception 'params are editable only while the rule is a_verifier' using errcode = '23514';
  end if;
  if new.status is distinct from old.status and (new.status = 'essai' or old.status = 'essai') then
    raise exception 'the essai status cannot be entered or left' using errcode = '23514';
  end if;
  -- Une version close et vérifiée est de l'histoire : elle ne repasse pas « à vérifier ».
  if old.status = 'verifiee' and new.status is distinct from old.status and old.effective_to is not null then
    raise exception 'a closed verified version cannot be unverified' using errcode = '23514';
  end if;
  -- Une règle vérifiée garde sa source et sa note ; seules les dates de vérification se renouvellent.
  if old.status = 'verifiee' and new.status = 'verifiee'
     and (new.source is distinct from old.source or new.description is distinct from old.description) then
    raise exception 'source and note are frozen while the rule is verified' using errcode = '23514';
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create or replace function public.create_rule_version(
  p_rule_key text,
  p_activity_category text,
  p_effective_from date,
  p_params jsonb,
  p_source text,
  p_verified_on date,
  p_revalidate_after date,
  p_description text default null,
  p_status public.regulatory_rule_status default 'a_verifier'
) returns uuid
language plpgsql
set search_path = ''
as $$
declare
  prev public.regulatory_rules;
  new_id uuid;
begin
  if p_status = 'verifiee' then
    raise exception 'a new version is never verified at creation' using errcode = '42501';
  end if;
  select * into prev from public.regulatory_rules
    where owner_id = (select auth.uid()) and rule_key = p_rule_key and activity_category = p_activity_category and effective_from < p_effective_from
    order by effective_from desc limit 1 for update;

  if prev.id is not null and prev.effective_to is null then
    perform set_config('app.rule_version', 'on', true);
    update public.regulatory_rules set effective_to = p_effective_from where id = prev.id;
    perform set_config('app.rule_version', 'off', true);
  end if;

  insert into public.regulatory_rules (rule_key, activity_category, description, params, effective_from, source, verified_on, revalidate_after, status, previous_version_id)
    values (p_rule_key, p_activity_category, p_description, p_params, p_effective_from, p_source, p_verified_on, p_revalidate_after, p_status, prev.id)
    returning id into new_id;
  return new_id;
end;
$$;

drop policy regulatory_rules_insert on public.regulatory_rules;
drop function public.rule_version_is_mine(uuid, text);

create function public.rule_version_is_mine(p_id uuid, p_rule_key text, p_activity_category text, p_effective_from date) returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.regulatory_rules p
    where p.id = p_id and p.owner_id = (select auth.uid()) and p.rule_key = p_rule_key
      and p.activity_category = p_activity_category and p.effective_from < p_effective_from
  );
$$;

revoke execute on function public.rule_version_is_mine(uuid, text, text, date) from public, anon;
grant execute on function public.rule_version_is_mine(uuid, text, text, date) to authenticated;

create policy regulatory_rules_insert on public.regulatory_rules for insert to authenticated
  with check (
    owner_id = (select auth.uid())
    and status <> 'verifiee'
    and effective_to is null
    and (previous_version_id is null or public.rule_version_is_mine(previous_version_id, rule_key, activity_category, effective_from))
  );
