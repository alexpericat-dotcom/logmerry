-- Dette lot C (2) : index des clés étrangères `on delete set null` (suppression d'une note ou d'un extrait).
create index message_citations_note_idx on public.message_citations (note_id) where note_id is not null;
create index message_citations_chunk_idx on public.message_citations (chunk_id) where chunk_id is not null;
