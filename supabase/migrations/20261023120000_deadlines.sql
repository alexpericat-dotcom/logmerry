-- Story 5.1a : échéances administratives saisies (RLS : owner_id = auth.uid()).
-- Le calendrier ne contient que des obligations, pas de rendez-vous. Priorité et récurrence arrivent avec la story 5.1b.
create type public.deadline_category as enum ('urssaf', 'france_travail', 'tax', 'vat', 'cfe', 'supporting_documents', 'renewals', 'custom');

create table public.deadlines (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  -- Une échéance saisie a toujours une date (elle peut être dans le passé : saisie d'une obligation déjà dépassée).
  due_on date not null,
  category public.deadline_category not null,
  -- Lien officiel obligatoire : même motif que la source d'une règle « vérifiée » (https, sans espace).
  source text not null check (char_length(source) <= 2000 and source ~ '^https://\S+$'),
  note text check (note is null or char_length(note) between 1 and 500),
  -- Moment où elle a été cochée « faite » ; null = à faire. Décocher remet à null.
  done_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index deadlines_owner_due_idx on public.deadlines (owner_id, due_on);

create trigger deadlines_set_updated_at before update on public.deadlines
  for each row execute function public.set_updated_at();

alter table public.deadlines enable row level security;

create policy deadlines_select on public.deadlines for select to authenticated
  using (owner_id = (select auth.uid()));
create policy deadlines_insert on public.deadlines for insert to authenticated
  with check (owner_id = (select auth.uid()));
create policy deadlines_update on public.deadlines for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));
-- Toujours supprimable (décision 3). (Une règle de politique, pas un déclencheur : la suppression d'un compte supprime ses échéances en cascade.)
create policy deadlines_delete on public.deadlines for delete to authenticated
  using (owner_id = (select auth.uid()));

-- Garde : id, propriétaire et date de création figés ; « faite » ne se date pas dans le futur (une minute de tolérance pour l'horloge).
-- Un CHECK ne peut pas le faire : now() n'est pas immuable.
create function public.deadlines_guard() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and (new.id is distinct from old.id or new.owner_id is distinct from old.owner_id or new.created_at is distinct from old.created_at) then
    raise exception 'deadline identity frozen' using errcode = '23514';
  end if;
  if new.done_at is not null
     and (tg_op = 'INSERT' or new.done_at is distinct from old.done_at)
     and new.done_at > now() + interval '1 minute' then
    raise exception 'completion date in the future' using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger deadlines_guard before insert or update on public.deadlines
  for each row execute function public.deadlines_guard();

-- Une fonction de déclencheur n'a pas à être exécutable par les rôles de l'API.
revoke execute on function public.deadlines_guard() from public, anon, authenticated;
