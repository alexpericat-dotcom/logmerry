-- Story 8.1 : extension pgvector et table des extraits de notes (RLS : owner_id = auth.uid()).
create extension if not exists vector with schema extensions;

create table public.note_chunks (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  note_id uuid not null references public.notes (id) on delete cascade,
  chunk_index integer not null check (chunk_index >= 0),
  content text not null check (char_length(btrim(content)) > 0),
  embedding extensions.vector(1024),
  embedding_model text not null check (char_length(btrim(embedding_model)) > 0),
  created_at timestamptz not null default now(),
  unique (note_id, chunk_index)
);

create index note_chunks_owner_idx on public.note_chunks (owner_id);
create index note_chunks_embedding_idx on public.note_chunks
  using hnsw (embedding extensions.vector_cosine_ops);

alter table public.note_chunks enable row level security;

create policy note_chunks_select on public.note_chunks for select to authenticated
  using (owner_id = (select auth.uid()));
create policy note_chunks_insert on public.note_chunks for insert to authenticated
  with check (owner_id = (select auth.uid()));
create policy note_chunks_update on public.note_chunks for update to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy note_chunks_delete on public.note_chunks for delete to authenticated
  using (owner_id = (select auth.uid()));
