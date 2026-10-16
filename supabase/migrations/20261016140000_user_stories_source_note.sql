-- Story 8.16 : note d'origine d'une user story proposée par l'IA (facultative).
alter table public.user_stories
  add column source_note_id uuid references public.notes (id) on delete set null;

create index user_stories_source_note_idx on public.user_stories (source_note_id);

-- Les clés étrangères contournent la RLS : la note citée doit être à moi.
drop policy user_stories_insert on public.user_stories;
drop policy user_stories_update on public.user_stories;

create policy user_stories_insert on public.user_stories for insert to authenticated
  with check (
    owner_id = (select auth.uid())
    and exists (select 1 from public.missions m where m.id = mission_id and m.owner_id = (select auth.uid()))
    and (source_note_id is null
         or exists (select 1 from public.notes n where n.id = source_note_id and n.owner_id = (select auth.uid())))
  );
create policy user_stories_update on public.user_stories for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (
    owner_id = (select auth.uid())
    and exists (select 1 from public.missions m where m.id = mission_id and m.owner_id = (select auth.uid()))
    and (source_note_id is null
         or exists (select 1 from public.notes n where n.id = source_note_id and n.owner_id = (select auth.uid())))
  );
