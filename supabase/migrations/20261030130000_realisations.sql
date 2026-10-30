-- Épopée 6 (story 6.1 et 6.2) : réalisations du portfolio du propriétaire (RLS : owner_id = auth.uid()).
-- La vue publique `public_realisations` vient avec la story 6.3 ; ici, aucun droit pour `anon`.
create type public.realisation_origin as enum ('real_client', 'training', 'friend', 'demo');

create table public.realisations (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 200),
  description text not null check (char_length(btrim(description)) between 1 and 600),
  origin public.realisation_origin not null,
  -- Texte libre : jamais de lien vers `clients`, pour qu'aucune donnée privée n'entre dans la vue publique.
  client_name text check (client_name is null or char_length(btrim(client_name)) between 1 and 200),
  client_sector text check (client_sector is null or char_length(btrim(client_sector)) between 1 and 100),
  result_figure text check (result_figure is null or char_length(btrim(result_figure)) between 1 and 200),
  stack text[] not null default '{}' check (cardinality(stack) <= 12),
  client_consent boolean not null default false,
  published boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Jamais publiée sans l'accord du client, même par l'API.
  constraint realisations_publish_needs_consent check (not published or client_consent)
);

create index realisations_owner_created_idx on public.realisations (owner_id, created_at desc);

-- set_updated_at() existe déjà (migration des notes).
create trigger realisations_set_updated_at before update on public.realisations
  for each row execute function public.set_updated_at();

-- `published_at` est posée par la base : le client ne peut pas la forger.
create function public.realisations_set_published_at() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.published then
    new.published_at := case when tg_op = 'UPDATE' and old.published then old.published_at else now() end;
  else
    new.published_at := null;
  end if;
  return new;
end;
$$;

create trigger realisations_published_at before insert or update on public.realisations
  for each row execute function public.realisations_set_published_at();

alter table public.realisations enable row level security;

create policy realisations_select on public.realisations for select to authenticated
  using (owner_id = (select auth.uid()));
create policy realisations_insert on public.realisations for insert to authenticated
  with check (owner_id = (select auth.uid()));
create policy realisations_update on public.realisations for update to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy realisations_delete on public.realisations for delete to authenticated
  using (owner_id = (select auth.uid()));

revoke all on public.realisations from anon;
