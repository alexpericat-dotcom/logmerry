-- Story 3.3 : lien facultatif d'une note vers une fiche client ou prospect.
alter table public.notes
  add column client_id uuid references public.clients (id) on delete set null;

create index notes_client_idx on public.notes (client_id);

-- Les clés étrangères contournent la RLS : le lien doit viser une fiche à moi.
drop policy notes_insert on public.notes;
drop policy notes_update on public.notes;

create policy notes_insert on public.notes for insert to authenticated
  with check (
    owner_id = (select auth.uid())
    and (client_id is null
         or exists (select 1 from public.clients c where c.id = client_id and c.owner_id = (select auth.uid())))
  );
create policy notes_update on public.notes for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (
    owner_id = (select auth.uid())
    and (client_id is null
         or exists (select 1 from public.clients c where c.id = client_id and c.owner_id = (select auth.uid())))
  );
