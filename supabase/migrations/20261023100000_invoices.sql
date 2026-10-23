-- Story 4.2 : factures (RLS : owner_id = auth.uid()). Montants en centimes, hors taxe et taxe.
-- Ce n'est pas une facture légale : un suivi de ce que j'ai émis ailleurs. Le statut « payée » n'existe pas ici (déduit des encaissements, story 4.3).
create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  -- Pas de `on delete cascade` ni `set null` : l'historique des factures se garde (une mission ou un devis lié à une facture ne se supprime pas).
  mission_id uuid not null references public.missions (id),
  quote_id uuid references public.quotes (id),
  -- 100 000 000 centimes = 1 000 000 € : garde-fou de saisie, pas une règle métier.
  amount_ht_cents bigint not null check (amount_ht_cents > 0 and amount_ht_cents <= 100000000),
  tax_cents bigint check (tax_cents >= 0 and tax_cents <= 100000000), -- null = taxe inconnue, jamais 0 par défaut
  due_on date not null,
  issued_on date,
  reference text check (reference is null or char_length(reference) between 1 and 60),
  note text check (note is null or char_length(note) between 1 and 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (issued_on is null or due_on >= issued_on)
);

create index invoices_owner_due_idx on public.invoices (owner_id, due_on);
create index invoices_mission_idx on public.invoices (mission_id);
create index invoices_quote_idx on public.invoices (quote_id) where quote_id is not null;

create trigger invoices_set_updated_at before update on public.invoices
  for each row execute function public.set_updated_at();

alter table public.invoices enable row level security;

-- Les clés étrangères contournent la RLS : la mission et le devis doivent être à moi.
-- (La cohérence client/mission du devis n'est pas imposée : décision 3 de la spec.)
create policy invoices_select on public.invoices for select to authenticated
  using (owner_id = (select auth.uid()));
create policy invoices_insert on public.invoices for insert to authenticated
  with check (
    owner_id = (select auth.uid())
    and exists (select 1 from public.missions m where m.id = mission_id and m.owner_id = (select auth.uid()))
    and (quote_id is null or exists (select 1 from public.quotes q where q.id = quote_id and q.owner_id = (select auth.uid())))
  );
create policy invoices_update on public.invoices for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (
    owner_id = (select auth.uid())
    and exists (select 1 from public.missions m where m.id = mission_id and m.owner_id = (select auth.uid()))
    and (quote_id is null or exists (select 1 from public.quotes q where q.id = quote_id and q.owner_id = (select auth.uid())))
  );
-- Une facture se supprime toujours côté règle ; ce sont les encaissements (story 4.3, clé étrangère) qui l'empêcheront.
-- (Une règle de politique, pas un déclencheur : la suppression d'un compte supprime ses factures en cascade.)
create policy invoices_delete on public.invoices for delete to authenticated
  using (owner_id = (select auth.uid()));

-- Garde : id, propriétaire et date de création figés ; la date d'émission n'est jamais dans le futur (jour de Paris).
-- Un CHECK ne peut pas le faire : now() n'est pas immuable.
create function public.invoices_guard() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and (new.id is distinct from old.id or new.owner_id is distinct from old.owner_id or new.created_at is distinct from old.created_at) then
    raise exception 'invoice identity frozen' using errcode = '23514';
  end if;
  if new.issued_on is not null
     and (tg_op = 'INSERT' or new.issued_on is distinct from old.issued_on)
     and new.issued_on > (now() at time zone 'Europe/Paris')::date then
    raise exception 'issue date in the future' using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger invoices_guard before insert or update on public.invoices
  for each row execute function public.invoices_guard();

-- Une fonction de déclencheur n'a pas à être exécutable par les rôles de l'API.
revoke execute on function public.invoices_guard() from public, anon, authenticated;
