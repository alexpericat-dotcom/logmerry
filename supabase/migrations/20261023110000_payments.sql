-- Story 4.3 : encaissements (RLS : owner_id = auth.uid()). Montants en centimes, hors taxe et taxe.
-- Plusieurs encaissements par facture (acomptes) ; le statut de la facture se déduit de leur total (calcul dans le code, pas ici).
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  -- Pas de `on delete cascade` : une facture qui a des encaissements ne se supprime pas (décision 3 de la story 4.2).
  invoice_id uuid not null references public.invoices (id),
  -- 100 000 000 centimes = 1 000 000 € : garde-fou de saisie, pas une règle métier.
  amount_ht_cents bigint not null check (amount_ht_cents > 0 and amount_ht_cents <= 100000000),
  tax_cents bigint check (tax_cents >= 0 and tax_cents <= 100000000), -- null = taxe inconnue, jamais 0 par défaut
  received_on date not null,
  note text check (note is null or char_length(note) between 1 and 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index payments_invoice_idx on public.payments (invoice_id);
create index payments_owner_received_idx on public.payments (owner_id, received_on);

create trigger payments_set_updated_at before update on public.payments
  for each row execute function public.set_updated_at();

alter table public.payments enable row level security;

-- La clé étrangère contourne la RLS : la facture doit être à moi.
create policy payments_select on public.payments for select to authenticated
  using (owner_id = (select auth.uid()));
create policy payments_insert on public.payments for insert to authenticated
  with check (
    owner_id = (select auth.uid())
    and exists (select 1 from public.invoices i where i.id = invoice_id and i.owner_id = (select auth.uid()))
  );
create policy payments_update on public.payments for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (
    owner_id = (select auth.uid())
    and exists (select 1 from public.invoices i where i.id = invoice_id and i.owner_id = (select auth.uid()))
  );
-- Toujours supprimable (décision 3). (Une règle de politique, pas un déclencheur : la suppression d'un compte supprime ses encaissements en cascade.)
create policy payments_delete on public.payments for delete to authenticated
  using (owner_id = (select auth.uid()));

-- Garde : id, propriétaire, facture et date de création figés (un encaissement ne change pas de facture) ;
-- la date d'encaissement n'est jamais dans le futur (jour de Paris). Un CHECK ne peut pas le faire : now() n'est pas immuable.
create function public.payments_guard() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and (
    new.id is distinct from old.id
    or new.owner_id is distinct from old.owner_id
    or new.invoice_id is distinct from old.invoice_id
    or new.created_at is distinct from old.created_at
  ) then
    raise exception 'payment identity frozen' using errcode = '23514';
  end if;
  if (tg_op = 'INSERT' or new.received_on is distinct from old.received_on)
     and new.received_on > (now() at time zone 'Europe/Paris')::date then
    raise exception 'receipt date in the future' using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger payments_guard before insert or update on public.payments
  for each row execute function public.payments_guard();

-- Une fonction de déclencheur n'a pas à être exécutable par les rôles de l'API.
revoke execute on function public.payments_guard() from public, anon, authenticated;
