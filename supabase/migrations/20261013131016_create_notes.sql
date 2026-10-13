-- Story 2.1 : table des notes du propriétaire (RLS : owner_id = auth.uid()).
create type public.note_status as enum ('draft', 'active');

create table public.notes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 200),
  body text not null default '',
  status public.note_status not null default 'active',
  created_at timestamptz not null default now()
);

create index notes_owner_created_idx on public.notes (owner_id, created_at desc);

alter table public.notes enable row level security;

create policy notes_select on public.notes for select to authenticated
  using (owner_id = (select auth.uid()));
create policy notes_insert on public.notes for insert to authenticated
  with check (owner_id = (select auth.uid()));
create policy notes_update on public.notes for update to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy notes_delete on public.notes for delete to authenticated
  using (owner_id = (select auth.uid()));
