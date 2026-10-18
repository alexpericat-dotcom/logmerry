-- Story 3.6 : devis (RLS : owner_id = auth.uid()). Montants en centimes, hors taxe et taxe.
create type public.quote_status as enum ('draft', 'sent', 'accepted', 'refused');

create table public.quotes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  -- Pas de `on delete cascade` ni `set null` : l'historique des devis se garde (une fiche ou une mission liée à un devis ne se supprime pas).
  client_id uuid not null references public.clients (id),
  mission_id uuid references public.missions (id),
  amount_ht_cents bigint not null check (amount_ht_cents > 0),
  tax_cents bigint check (tax_cents >= 0), -- null = taxe inconnue, jamais 0 par défaut
  sent_on date,
  status public.quote_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (status = 'draft' or sent_on is not null)
);

create index quotes_owner_status_idx on public.quotes (owner_id, status);
create index quotes_client_idx on public.quotes (client_id);
create index quotes_mission_idx on public.quotes (mission_id) where mission_id is not null;

create trigger quotes_set_updated_at before update on public.quotes
  for each row execute function public.set_updated_at();

alter table public.quotes enable row level security;

-- Les clés étrangères contournent la RLS : le client et la mission doivent être à moi, et la mission à ce client.
create policy quotes_select on public.quotes for select to authenticated
  using (owner_id = (select auth.uid()));
create policy quotes_insert on public.quotes for insert to authenticated
  with check (
    owner_id = (select auth.uid())
    and exists (select 1 from public.clients c where c.id = client_id and c.owner_id = (select auth.uid()))
    and (mission_id is null or exists (select 1 from public.missions m where m.id = mission_id and m.client_id = quotes.client_id and m.owner_id = (select auth.uid())))
  );
create policy quotes_update on public.quotes for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (
    owner_id = (select auth.uid())
    and exists (select 1 from public.clients c where c.id = client_id and c.owner_id = (select auth.uid()))
    and (mission_id is null or exists (select 1 from public.missions m where m.id = mission_id and m.client_id = quotes.client_id and m.owner_id = (select auth.uid())))
  );
-- Seul un brouillon se supprime. (Une règle de politique, pas un déclencheur : la suppression d'un compte supprime ses devis en cascade.)
create policy quotes_delete on public.quotes for delete to authenticated
  using (owner_id = (select auth.uid()) and status = 'draft');

-- Transitions : brouillon -> envoyé -> refusé ; envoyé -> accepté seulement par accept_quote ; refusé et accepté sont figés.
create function public.quotes_guard() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.status in ('accepted', 'refused') then
    raise exception 'quote frozen' using errcode = '23514';
  end if;
  if new.status is distinct from old.status and not (
    (old.status = 'draft' and new.status = 'sent')
    or (old.status = 'sent' and new.status = 'refused')
    or (old.status = 'sent' and new.status = 'accepted' and current_setting('app.accepting_quote', true) = 'on')
  ) then
    raise exception 'quote status transition not allowed' using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger quotes_guard before update on public.quotes
  for each row execute function public.quotes_guard();

-- Acceptation en une action, tout ou rien. SECURITY INVOKER : la RLS et ses contrôles s'appliquent à chaque écriture.
-- Idempotente : un devis déjà accepté renvoie sa mission sans en créer une autre.
create function public.accept_quote(p_quote_id uuid) returns uuid
language plpgsql
set search_path = ''
as $$
declare
  q public.quotes;
  c public.clients;
  m uuid;
begin
  select * into q from public.quotes where id = p_quote_id for update;
  if not found then raise exception 'quote not found' using errcode = 'P0002'; end if;
  if q.status = 'accepted' then return q.mission_id; end if;
  if q.status <> 'sent' then raise exception 'quote not sent' using errcode = '23514'; end if;

  perform set_config('app.accepting_quote', 'on', true);
  m := q.mission_id;
  if m is null then
    select * into c from public.clients where id = q.client_id for update;
    if c.status = 'prospect' then
      update public.clients set status = 'client' where id = c.id;
    end if;
    insert into public.missions (client_id, title, status)
      values (c.id, 'Devis du ' || to_char(q.sent_on, 'DD/MM/YYYY') || ' — ' || left(c.name, 170), 'planned')
      returning id into m;
  end if;
  update public.quotes set status = 'accepted', mission_id = m where id = q.id;
  perform set_config('app.accepting_quote', 'off', true);
  return m;
end;
$$;

revoke execute on function public.accept_quote(uuid) from public, anon;
grant execute on function public.accept_quote(uuid) to authenticated;
