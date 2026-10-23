-- Story 4.1b : règles réglementaires versionnées (RLS : owner_id = auth.uid()).
-- La table est livrée VIDE : aucune valeur, aucun taux, aucune source n'est écrite ici. Les valeurs sont saisies par l'auteur ;
-- seul `seed:demo` crée des règles d'essai fictives (statut « essai », source « DEMO »).
-- `rule_key` n'est volontairement pas un enum : le catalogue fermé vit dans `lib/domain/finance/rule-keys.ts` (avec le schéma des `params` de chaque clé).
create extension if not exists btree_gist with schema extensions;

create type public.regulatory_rule_status as enum ('a_verifier', 'verifiee', 'essai');

create table public.regulatory_rules (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  rule_key text not null check (char_length(rule_key) between 1 and 100),
  activity_category text not null check (activity_category in ('bnc', 'bic')),
  description text check (char_length(btrim(description)) between 1 and 500),
  -- valeur, unité et paramètres de calcul de la clé (schéma vérifié par le code à la saisie)
  params jsonb not null check (jsonb_typeof(params) = 'object'),
  effective_from date not null, -- inclus
  effective_to date, -- exclu ; null = en vigueur
  source text not null check (char_length(btrim(source)) between 1 and 500), -- lien officiel, ou « DEMO » pour une règle d'essai
  verified_on date not null,
  revalidate_after date not null,
  status public.regulatory_rule_status not null default 'a_verifier',
  previous_version_id uuid references public.regulatory_rules (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  check (effective_to is null or effective_to > effective_from),
  check (revalidate_after >= verified_on),
  -- « Vérifiée » exige un vrai lien officiel ; « Essai » exige la source « DEMO » et rien d'autre ne peut la porter.
  check (status <> 'verifiee' or source ~ '^https://[^[:space:]]+$'),
  check ((status = 'essai') = (source = 'DEMO')),
  -- Deux versions d'une même règle ne se chevauchent jamais : [effective_from, effective_to) disjoints.
  constraint regulatory_rules_no_overlap exclude using gist (
    owner_id with =, rule_key with =, activity_category with =,
    daterange(effective_from, effective_to, '[)') with &&
  )
);

create index regulatory_rules_lookup_idx on public.regulatory_rules (owner_id, rule_key, activity_category, effective_from desc);

alter table public.regulatory_rules enable row level security;

create policy regulatory_rules_select on public.regulatory_rules for select to authenticated
  using (owner_id = (select auth.uid()));
-- La clé étrangère contourne la RLS : la version précédente doit être à moi et de la même règle.
create policy regulatory_rules_insert on public.regulatory_rules for insert to authenticated
  with check (
    owner_id = (select auth.uid())
    and (previous_version_id is null or exists (
      select 1 from public.regulatory_rules p
      where p.id = previous_version_id and p.owner_id = (select auth.uid()) and p.rule_key = regulatory_rules.rule_key
    ))
  );
create policy regulatory_rules_update on public.regulatory_rules for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));
-- Seule une règle jamais vérifiée (ou d'essai) se supprime : une version vérifiée est de l'histoire.
-- (Une règle de politique, pas un déclencheur : la suppression d'un compte supprime ses règles en cascade.)
create policy regulatory_rules_delete on public.regulatory_rules for delete to authenticated
  using (owner_id = (select auth.uid()) and status in ('a_verifier', 'essai'));

-- Ce qui ne change jamais après la création (clé, catégorie, date d'effet, chaînage) ; `effective_to` ne se pose que par create_rule_version ;
-- `params` ne se corrige que tant que la règle est « à vérifier » (une règle vérifiée a d'abord besoin de repasser « à vérifier ») ;
-- on n'entre ni ne sort du statut « essai ».
create function public.regulatory_rules_guard() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.owner_id is distinct from old.owner_id
     or new.rule_key is distinct from old.rule_key
     or new.activity_category is distinct from old.activity_category
     or new.effective_from is distinct from old.effective_from
     or new.previous_version_id is distinct from old.previous_version_id
     or new.created_at is distinct from old.created_at then
    raise exception 'rule identity is immutable' using errcode = '23514';
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
  new.updated_at := now();
  return new;
end;
$$;

create trigger regulatory_rules_guard before update on public.regulatory_rules
  for each row execute function public.regulatory_rules_guard();

-- Nouvelle version en une transaction : ferme la version précédente à la date d'effet, insère la nouvelle, les chaîne.
-- SECURITY INVOKER : la RLS s'applique à chaque écriture. Deux versions ne se chevauchent jamais (contrainte d'exclusion).
create function public.create_rule_version(
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
  -- La version juste avant la date d'effet (la plus récente), verrouillée.
  select * into prev from public.regulatory_rules
    where owner_id = (select auth.uid()) and rule_key = p_rule_key and activity_category = p_activity_category and effective_from < p_effective_from
    order by effective_from desc limit 1 for update;

  -- (prev.id est nul quand aucune version ne précède : « found » changerait de valeur après l'UPDATE)
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

revoke execute on function public.create_rule_version(text, text, date, jsonb, text, date, date, text, public.regulatory_rule_status) from public, anon;
grant execute on function public.create_rule_version(text, text, date, jsonb, text, date, date, text, public.regulatory_rule_status) to authenticated;

-- Fonction de déclencheur : jamais appelable par l'API.
revoke execute on function public.regulatory_rules_guard() from public, anon, authenticated;
