-- Story 8.3 : état d'indexation d'une note (en attente, indexée, échec).
create type public.index_status as enum ('pending', 'indexed', 'failed');

alter table public.notes
  add column index_status public.index_status not null default 'pending';
