-- Story 8.10 : historique de l'assistant (messages et citations), sous RLS sur owner_id.
-- Les citations ne gardent que des références (note, extrait) : jamais une copie du texte.
create type public.message_role as enum ('user', 'assistant');

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  role public.message_role not null,
  content text not null check (char_length(content) between 1 and 20000),
  created_at timestamptz not null default now()
);
create index messages_owner_created_idx on public.messages (owner_id, created_at);

create table public.message_citations (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  message_id uuid not null references public.messages (id) on delete cascade,
  position integer not null check (position >= 0),
  note_id uuid references public.notes (id) on delete set null,
  chunk_id uuid references public.note_chunks (id) on delete set null,
  unique (message_id, position)
);
create index message_citations_message_idx on public.message_citations (message_id);

alter table public.messages enable row level security;
alter table public.message_citations enable row level security;

create policy messages_select on public.messages for select to authenticated using (owner_id = (select auth.uid()));
create policy messages_insert on public.messages for insert to authenticated with check (owner_id = (select auth.uid()));
create policy messages_delete on public.messages for delete to authenticated using (owner_id = (select auth.uid()));

create policy message_citations_select on public.message_citations for select to authenticated using (owner_id = (select auth.uid()));
create policy message_citations_insert on public.message_citations for insert to authenticated
  with check (
    owner_id = (select auth.uid())
    and exists (select 1 from public.messages m where m.id = message_id and m.owner_id = (select auth.uid()))
    and (note_id is null or exists (select 1 from public.notes n where n.id = note_id and n.owner_id = (select auth.uid())))
    and (chunk_id is null or exists (select 1 from public.note_chunks c where c.id = chunk_id and c.owner_id = (select auth.uid())))
  );
create policy message_citations_delete on public.message_citations for delete to authenticated using (owner_id = (select auth.uid()));
