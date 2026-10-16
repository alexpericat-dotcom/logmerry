-- Story 3.5a : user stories du backlog d'une mission (RLS : owner_id = auth.uid()).
create type public.story_status as enum ('todo', 'in_progress', 'done');

create table public.user_stories (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  mission_id uuid not null references public.missions (id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 200),
  role text check (role is null or char_length(btrim(role)) between 1 and 200),
  benefit text check (benefit is null or char_length(btrim(benefit)) between 1 and 300),
  acceptance_criteria text check (acceptance_criteria is null or char_length(btrim(acceptance_criteria)) between 1 and 4000),
  points smallint check (points is null or points in (1, 2, 3, 5, 8, 13)),
  status public.story_status not null default 'todo',
  position integer not null check (position >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index user_stories_mission_idx on public.user_stories (mission_id, position);
create index user_stories_owner_idx on public.user_stories (owner_id);

create trigger user_stories_set_updated_at before update on public.user_stories
  for each row execute function public.set_updated_at();

alter table public.user_stories enable row level security;

-- Les clés étrangères contournent la RLS : insertion et mise à jour exigent une mission à moi.
create policy user_stories_select on public.user_stories for select to authenticated
  using (owner_id = (select auth.uid()));
create policy user_stories_insert on public.user_stories for insert to authenticated
  with check (
    owner_id = (select auth.uid())
    and exists (select 1 from public.missions m where m.id = mission_id and m.owner_id = (select auth.uid()))
  );
create policy user_stories_update on public.user_stories for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (
    owner_id = (select auth.uid())
    and exists (select 1 from public.missions m where m.id = mission_id and m.owner_id = (select auth.uid()))
  );
create policy user_stories_delete on public.user_stories for delete to authenticated
  using (owner_id = (select auth.uid()));
