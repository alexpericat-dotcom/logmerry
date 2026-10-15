-- Story 3.2 : contacts d'une fiche client ou prospect (RLS : owner_id = auth.uid()).
create table public.contacts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  client_id uuid not null references public.clients (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 200),
  job_title text check (job_title is null or char_length(btrim(job_title)) between 1 and 200),
  email text check (email is null or (char_length(email) <= 254 and email ~ '^[^[:space:]@]+@[^[:space:]@]+$')),
  phone text check (phone is null or char_length(btrim(phone)) between 1 and 30),
  address text check (address is null or char_length(btrim(address)) between 1 and 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index contacts_client_idx on public.contacts (client_id);
create index contacts_owner_idx on public.contacts (owner_id);

-- set_updated_at() existe déjà (migration des notes).
create trigger contacts_set_updated_at before update on public.contacts
  for each row execute function public.set_updated_at();

alter table public.contacts enable row level security;

-- Les clés étrangères contournent la RLS : sans la vérification de la fiche, un compte pourrait
-- rattacher un contact à la fiche d'un autre. Insertion et mise à jour exigent donc une fiche à moi.
create policy contacts_select on public.contacts for select to authenticated
  using (owner_id = (select auth.uid()));
create policy contacts_insert on public.contacts for insert to authenticated
  with check (
    owner_id = (select auth.uid())
    and exists (select 1 from public.clients c where c.id = client_id and c.owner_id = (select auth.uid()))
  );
create policy contacts_update on public.contacts for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (
    owner_id = (select auth.uid())
    and exists (select 1 from public.clients c where c.id = client_id and c.owner_id = (select auth.uid()))
  );
create policy contacts_delete on public.contacts for delete to authenticated
  using (owner_id = (select auth.uid()));
