-- Story 5.1b : calendrier administratif complet (priorité, récurrence par occurrence).
-- La RLS de 5.1a (owner_id = auth.uid()) s'applique telle quelle aux nouvelles colonnes.
create type public.deadline_priority as enum ('low', 'normal', 'high');
create type public.deadline_recurrence as enum ('monthly', 'quarterly', 'yearly');

alter table public.deadlines
  add column priority public.deadline_priority not null default 'normal',
  -- Une série = des lignes de même series_id. `recurrence` et `series_day` (jour du mois visé) ne sont posés que tant que la série vit :
  -- supprimer la série les remet à null sur les occurrences faites, qui restent.
  add column recurrence public.deadline_recurrence,
  add column series_id uuid,
  add column series_day smallint check (series_day between 1 and 31),
  add constraint deadlines_series_check check (
    (recurrence is null) = (series_day is null) and (recurrence is null or series_id is not null)
  );

-- Une date par série : deux lectures simultanées ne créent pas deux fois la même occurrence.
create unique index deadlines_series_due_idx on public.deadlines (series_id, due_on);

-- Supprime la série d'une occurrence en une transaction : les occurrences à faire partent, les faites restent sans récurrence.
-- SECURITY INVOKER (défaut) : la RLS limite aux lignes du propriétaire.
create function public.delete_deadline_series(p_series_id uuid) returns void
language sql
set search_path = ''
as $$
  update public.deadlines set recurrence = null, series_day = null where series_id = p_series_id and done_at is not null;
  delete from public.deadlines where series_id = p_series_id and done_at is null;
$$;

revoke execute on function public.delete_deadline_series(uuid) from public, anon;
grant execute on function public.delete_deadline_series(uuid) to authenticated;
