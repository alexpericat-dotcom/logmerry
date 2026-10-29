-- Dette lot C (1) : quand une tâche a été faite, posé par la base (le cockpit lisait updated_at : un renommage la faisait réapparaître).
alter table public.tasks add column done_at timestamptz;

-- Tâches déjà faites : leur dernière modification est la meilleure date connue (le déclencheur d'updated_at est suspendu le temps de cette reprise : elle ne doit pas la faire bouger).
alter table public.tasks disable trigger tasks_set_updated_at;
update public.tasks set done_at = updated_at where done and done_at is null;
alter table public.tasks enable trigger tasks_set_updated_at;

alter table public.tasks add constraint tasks_done_at_matches_done check (done = (done_at is not null));

create function public.tasks_set_done_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  -- Inforgeable : l'API ne choisit jamais done_at.
  if new.done then
    new.done_at := case when tg_op = 'UPDATE' and old.done then old.done_at else now() end;
  else
    new.done_at := null;
  end if;
  return new;
end;
$$;

revoke execute on function public.tasks_set_done_at() from public, anon, authenticated;

create trigger tasks_done_at before insert or update on public.tasks
  for each row execute function public.tasks_set_done_at();
