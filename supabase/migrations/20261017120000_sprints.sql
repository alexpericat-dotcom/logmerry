-- Story 3.5c : sprints d'une mission et rattachement des user stories (RLS : owner_id = auth.uid()).
create type public.sprint_status as enum ('planned', 'active', 'closed');

create table public.sprints (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  mission_id uuid not null references public.missions (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 120),
  goal text check (goal is null or char_length(btrim(goal)) between 1 and 300),
  start_date date not null,
  end_date date not null,
  status public.sprint_status not null default 'planned',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sprints_dates_check check (end_date >= start_date)
);

create index sprints_mission_idx on public.sprints (mission_id, start_date);
create index sprints_owner_idx on public.sprints (owner_id);
-- Un seul sprint « en cours » par mission.
create unique index sprints_one_active_per_mission on public.sprints (mission_id) where status = 'active';

create trigger sprints_set_updated_at before update on public.sprints
  for each row execute function public.set_updated_at();

alter table public.sprints enable row level security;

-- Les clés étrangères contournent la RLS : insertion et mise à jour exigent une mission à moi.
create policy sprints_select on public.sprints for select to authenticated
  using (owner_id = (select auth.uid()));
create policy sprints_insert on public.sprints for insert to authenticated
  with check (
    owner_id = (select auth.uid())
    and exists (select 1 from public.missions m where m.id = mission_id and m.owner_id = (select auth.uid()))
  );
create policy sprints_update on public.sprints for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (
    owner_id = (select auth.uid())
    and exists (select 1 from public.missions m where m.id = mission_id and m.owner_id = (select auth.uid()))
  );
create policy sprints_delete on public.sprints for delete to authenticated
  using (owner_id = (select auth.uid()));

-- Rattachement d'une story à un sprint : supprimer le sprint renvoie la story au backlog.
alter table public.user_stories add column sprint_id uuid references public.sprints (id) on delete set null;
create index user_stories_sprint_idx on public.user_stories (sprint_id, position);

-- Le sprint d'une story doit être à moi ET de la même mission (la clé étrangère contourne la RLS).
drop policy if exists user_stories_insert on public.user_stories;
drop policy if exists user_stories_update on public.user_stories;
create policy user_stories_insert on public.user_stories for insert to authenticated
  with check (
    owner_id = (select auth.uid())
    and exists (select 1 from public.missions m where m.id = mission_id and m.owner_id = (select auth.uid()))
    and (sprint_id is null or exists (select 1 from public.sprints sp where sp.id = sprint_id and sp.owner_id = (select auth.uid()) and sp.mission_id = user_stories.mission_id))
  );
create policy user_stories_update on public.user_stories for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (
    owner_id = (select auth.uid())
    and exists (select 1 from public.missions m where m.id = mission_id and m.owner_id = (select auth.uid()))
    and (sprint_id is null or exists (select 1 from public.sprints sp where sp.id = sprint_id and sp.owner_id = (select auth.uid()) and sp.mission_id = user_stories.mission_id))
  );
