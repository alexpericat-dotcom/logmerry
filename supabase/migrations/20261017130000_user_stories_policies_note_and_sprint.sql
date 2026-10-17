-- Correctif de la story 3.5c : la migration des sprints a remplacé les policies d'insertion et de mise à jour de `user_stories`
-- sans reprendre le contrôle de la note d'origine ajouté par la story 8.16 (la note citée doit être à moi).
-- Les deux contrôles (note d'origine ET sprint de la même mission) sont maintenant ensemble. Les clés étrangères contournent la RLS.
drop policy if exists user_stories_insert on public.user_stories;
drop policy if exists user_stories_update on public.user_stories;

create policy user_stories_insert on public.user_stories for insert to authenticated
  with check (
    owner_id = (select auth.uid())
    and exists (select 1 from public.missions m where m.id = mission_id and m.owner_id = (select auth.uid()))
    and (source_note_id is null
         or exists (select 1 from public.notes n where n.id = source_note_id and n.owner_id = (select auth.uid())))
    and (sprint_id is null
         or exists (select 1 from public.sprints sp where sp.id = sprint_id and sp.owner_id = (select auth.uid()) and sp.mission_id = user_stories.mission_id))
  );
create policy user_stories_update on public.user_stories for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (
    owner_id = (select auth.uid())
    and exists (select 1 from public.missions m where m.id = mission_id and m.owner_id = (select auth.uid()))
    and (source_note_id is null
         or exists (select 1 from public.notes n where n.id = source_note_id and n.owner_id = (select auth.uid())))
    and (sprint_id is null
         or exists (select 1 from public.sprints sp where sp.id = sprint_id and sp.owner_id = (select auth.uid()) and sp.mission_id = user_stories.mission_id))
  );
