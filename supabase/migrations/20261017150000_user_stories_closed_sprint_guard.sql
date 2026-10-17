-- Story 3.5c (relecture) : le contenu d'un sprint clos est figé EN BASE, pas seulement à l'écran.
-- Refuse : une story qui entre dans un sprint clos (insertion ou changement de sprint) ; une story qui sort d'un sprint clos.
-- Supprimer un sprint (ou une mission) reste possible : la clé étrangère `on delete set null` s'exécute APRÈS la suppression du sprint,
-- qui n'existe donc plus quand le déclencheur le cherche.
create function public.user_stories_guard_closed_sprint() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.sprint_id is not null and (tg_op = 'INSERT' or new.sprint_id is distinct from old.sprint_id)
     and exists (select 1 from public.sprints sp where sp.id = new.sprint_id and sp.status = 'closed') then
    raise exception 'sprint closed' using errcode = '23514';
  end if;
  if tg_op = 'UPDATE' and old.sprint_id is not null and new.sprint_id is distinct from old.sprint_id
     and exists (select 1 from public.sprints sp where sp.id = old.sprint_id and sp.status = 'closed') then
    raise exception 'sprint closed' using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger user_stories_guard_closed_sprint before insert or update of sprint_id on public.user_stories
  for each row execute function public.user_stories_guard_closed_sprint();
