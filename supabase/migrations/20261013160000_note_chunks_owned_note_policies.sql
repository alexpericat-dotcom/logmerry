-- Story 8.1 (revue) : un extrait ne peut viser qu'une note que je possède.
-- Appliqué à la main dans le SQL Editor de Supabase (l'outil MCP refusait l'appel) : la version
-- ci-dessus n'est donc pas enregistrée par Supabase. Le script est rejouable (drop puis create).
drop policy note_chunks_insert on public.note_chunks;
drop policy note_chunks_update on public.note_chunks;

create policy note_chunks_insert on public.note_chunks for insert to authenticated
  with check (
    owner_id = (select auth.uid())
    and exists (select 1 from public.notes n where n.id = note_id and n.owner_id = (select auth.uid()))
  );
create policy note_chunks_update on public.note_chunks for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (
    owner_id = (select auth.uid())
    and exists (select 1 from public.notes n where n.id = note_id and n.owner_id = (select auth.uid()))
  );
