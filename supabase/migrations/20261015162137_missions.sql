-- Story 3.4 : missions d'une fiche client (RLS : owner_id = auth.uid()).
create type public.mission_status as enum ('in_progress', 'done', 'cancelled');

create table public.missions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  client_id uuid not null references public.clients (id) on delete restrict,
  title text not null check (char_length(btrim(title)) between 1 and 200),
  status public.mission_status not null default 'in_progress',
  start_date date,
  end_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (start_date is null or end_date is null or end_date >= start_date)
);

create index missions_client_idx on public.missions (client_id);
create index missions_owner_idx on public.missions (owner_id);

create trigger missions_set_updated_at before update on public.missions
  for each row execute function public.set_updated_at();

alter table public.missions enable row level security;

-- Les clés étrangères contournent la RLS : insertion et mise à jour exigent une fiche à moi.
create policy missions_select on public.missions for select to authenticated
  using (owner_id = (select auth.uid()));
create policy missions_insert on public.missions for insert to authenticated
  with check (
    owner_id = (select auth.uid())
    and exists (select 1 from public.clients c where c.id = client_id and c.owner_id = (select auth.uid()))
  );
create policy missions_update on public.missions for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (
    owner_id = (select auth.uid())
    and exists (select 1 from public.clients c where c.id = client_id and c.owner_id = (select auth.uid()))
  );
create policy missions_delete on public.missions for delete to authenticated
  using (owner_id = (select auth.uid()));
