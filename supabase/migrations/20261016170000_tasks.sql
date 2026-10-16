-- Story 3.5b : tâches d'une user story (RLS : owner_id = auth.uid()).
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  story_id uuid not null references public.user_stories (id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 200),
  done boolean not null default false,
  position integer not null check (position >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index tasks_story_idx on public.tasks (story_id, position);
create index tasks_owner_idx on public.tasks (owner_id);

create trigger tasks_set_updated_at before update on public.tasks
  for each row execute function public.set_updated_at();

alter table public.tasks enable row level security;

-- Les clés étrangères contournent la RLS : insertion et mise à jour exigent une story à moi.
create policy tasks_select on public.tasks for select to authenticated
  using (owner_id = (select auth.uid()));
create policy tasks_insert on public.tasks for insert to authenticated
  with check (
    owner_id = (select auth.uid())
    and exists (select 1 from public.user_stories s where s.id = story_id and s.owner_id = (select auth.uid()))
  );
create policy tasks_update on public.tasks for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (
    owner_id = (select auth.uid())
    and exists (select 1 from public.user_stories s where s.id = story_id and s.owner_id = (select auth.uid()))
  );
create policy tasks_delete on public.tasks for delete to authenticated
  using (owner_id = (select auth.uid()));
