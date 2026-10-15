-- Story 3.1 : prospects et clients du propriétaire (RLS : owner_id = auth.uid()).
create type public.client_status as enum ('prospect', 'client');
create type public.client_origin as enum ('real_client', 'training', 'friend', 'demo');

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 200),
  status public.client_status not null default 'prospect',
  origin public.client_origin not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index clients_owner_created_idx on public.clients (owner_id, created_at desc);

-- set_updated_at() existe déjà (migration des notes).
create trigger clients_set_updated_at before update on public.clients
  for each row execute function public.set_updated_at();

alter table public.clients enable row level security;

create policy clients_select on public.clients for select to authenticated
  using (owner_id = (select auth.uid()));
create policy clients_insert on public.clients for insert to authenticated
  with check (owner_id = (select auth.uid()));
create policy clients_update on public.clients for update to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy clients_delete on public.clients for delete to authenticated
  using (owner_id = (select auth.uid()));
