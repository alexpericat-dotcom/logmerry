-- Story 4.1a : profil professionnel (une ligne par propriétaire, RLS : owner_id = auth.uid()).
-- Chaque champ = une valeur + une date de confirmation : vide = « À confirmer », valeur sans date = « Déclaré », valeur + date = « Confirmé ».
-- Aucune valeur par défaut, sauf statut et catégorie (« Déclaré » au départ, décision de l'auteur).
create type public.pp_legal_status as enum ('micro_enterprise', 'sole_proprietorship', 'company', 'other');
create type public.pp_tax_regime as enum ('micro_bnc', 'controlled_declaration', 'other');
create type public.pp_activity_category as enum ('bnc', 'bic');
create type public.pp_service_nature as enum ('services', 'goods', 'mixed', 'other');
create type public.pp_urssaf_frequency as enum ('monthly', 'quarterly', 'other');
create type public.pp_vat_regime as enum ('franchise', 'simplified', 'normal', 'other');
create type public.pp_acre as enum ('eligible', 'not_eligible', 'unknown');
create type public.pp_job_seeker as enum ('registered', 'not_registered', 'other');

create function public.pp_thresholds_ok(t smallint[]) returns boolean
language sql immutable
set search_path = ''
as $$
  select t <@ array[50, 75, 90, 100]::smallint[] and cardinality(t) = (select count(distinct x) from unnest(t) x);
$$;

create table public.professional_profile (
  owner_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,

  legal_status public.pp_legal_status default 'micro_enterprise',
  legal_status_other text,
  legal_status_confirmed_at timestamptz,
  tax_regime public.pp_tax_regime,
  tax_regime_other text,
  tax_regime_confirmed_at timestamptz,
  activity_category public.pp_activity_category default 'bnc',
  activity_category_confirmed_at timestamptz,
  service_nature public.pp_service_nature,
  service_nature_other text,
  service_nature_confirmed_at timestamptz,
  activity_start_date date, -- une date future est permise (début prévu)
  activity_start_date_confirmed_at timestamptz,
  urssaf_frequency public.pp_urssaf_frequency,
  urssaf_frequency_other text,
  urssaf_frequency_confirmed_at timestamptz,
  vat_regime public.pp_vat_regime,
  vat_regime_other text,
  vat_regime_confirmed_at timestamptz,
  acre public.pp_acre,
  acre_confirmed_at timestamptz,
  job_seeker public.pp_job_seeker,
  job_seeker_other text,
  job_seeker_confirmed_at timestamptz,
  financial_goals text,
  financial_goals_confirmed_at timestamptz,
  reserve_rates text,
  reserve_rates_confirmed_at timestamptz,
  notification_prefs text, -- pas encore utilisé (aucun canal avant n8n)
  notification_prefs_confirmed_at timestamptz,

  alert_thresholds smallint[] not null default '{90,100}',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- « Autre » si et seulement si le texte libre est rempli (et non vide, 200 caractères au plus).
  check (coalesce(legal_status = 'other', false) = (legal_status_other is not null)),
  check (coalesce(tax_regime = 'other', false) = (tax_regime_other is not null)),
  check (coalesce(service_nature = 'other', false) = (service_nature_other is not null)),
  check (coalesce(urssaf_frequency = 'other', false) = (urssaf_frequency_other is not null)),
  check (coalesce(vat_regime = 'other', false) = (vat_regime_other is not null)),
  check (coalesce(job_seeker = 'other', false) = (job_seeker_other is not null)),
  check (coalesce(char_length(btrim(legal_status_other)) between 1 and 200, true)),
  check (coalesce(char_length(btrim(tax_regime_other)) between 1 and 200, true)),
  check (coalesce(char_length(btrim(service_nature_other)) between 1 and 200, true)),
  check (coalesce(char_length(btrim(urssaf_frequency_other)) between 1 and 200, true)),
  check (coalesce(char_length(btrim(vat_regime_other)) between 1 and 200, true)),
  check (coalesce(char_length(btrim(job_seeker_other)) between 1 and 200, true)),
  check (coalesce(char_length(btrim(financial_goals)) between 1 and 2000, true)),
  check (coalesce(char_length(btrim(reserve_rates)) between 1 and 2000, true)),
  check (coalesce(char_length(btrim(notification_prefs)) between 1 and 2000, true)),

  -- Pas de date de confirmation sans valeur.
  check (legal_status is not null or legal_status_confirmed_at is null),
  check (tax_regime is not null or tax_regime_confirmed_at is null),
  check (activity_category is not null or activity_category_confirmed_at is null),
  check (service_nature is not null or service_nature_confirmed_at is null),
  check (activity_start_date is not null or activity_start_date_confirmed_at is null),
  check (urssaf_frequency is not null or urssaf_frequency_confirmed_at is null),
  check (vat_regime is not null or vat_regime_confirmed_at is null),
  check (acre is not null or acre_confirmed_at is null),
  check (job_seeker is not null or job_seeker_confirmed_at is null),
  check (financial_goals is not null or financial_goals_confirmed_at is null),
  check (reserve_rates is not null or reserve_rates_confirmed_at is null),
  check (notification_prefs is not null or notification_prefs_confirmed_at is null),

  -- Seuils d'alerte : sous-ensemble de {50, 75, 90, 100}, sans doublon.
  check (public.pp_thresholds_ok(alert_thresholds))
);

-- Modifier la valeur d'un champ (ou son texte « Autre ») sans fournir de nouvelle date de confirmation le repasse en « Déclaré » :
-- la base est le dernier juge, même si une écriture oublie de remettre la date à zéro.
create function public.professional_profile_guard() returns trigger
language plpgsql
set search_path = ''
as $$
declare
  f text;
  o jsonb := to_jsonb(old);
  n jsonb := to_jsonb(new);
begin
  foreach f in array array[
    'legal_status', 'tax_regime', 'activity_category', 'service_nature', 'activity_start_date', 'urssaf_frequency',
    'vat_regime', 'acre', 'job_seeker', 'financial_goals', 'reserve_rates', 'notification_prefs'
  ] loop
    if (n -> f is distinct from o -> f or n -> (f || '_other') is distinct from o -> (f || '_other'))
       and n -> (f || '_confirmed_at') is not distinct from o -> (f || '_confirmed_at') then
      n := jsonb_set(n, array[f || '_confirmed_at'], 'null'::jsonb);
    end if;
  end loop;
  new := jsonb_populate_record(new, n);
  new.owner_id := old.owner_id;
  new.created_at := old.created_at;
  new.updated_at := now();
  return new;
end;
$$;

create trigger professional_profile_guard before update on public.professional_profile
  for each row execute function public.professional_profile_guard();

alter table public.professional_profile enable row level security;

create policy professional_profile_select on public.professional_profile for select to authenticated
  using (owner_id = (select auth.uid()));
create policy professional_profile_insert on public.professional_profile for insert to authenticated
  with check (owner_id = (select auth.uid()));
create policy professional_profile_update on public.professional_profile for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));
-- Pas de règle de suppression : la ligne ne se supprime pas depuis l'application (la suppression d'un compte la supprime en cascade).

-- Fonction de déclencheur : jamais appelable par l'API (même durcissement que quotes_guard, 3.6).
revoke execute on function public.professional_profile_guard() from public, anon, authenticated;
