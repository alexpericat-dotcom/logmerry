-- Audit de sécurité du 30 octobre 2026, lot B : plafond d'appels à l'IA par compte (20 par minute, 300 par jour).
-- Un appel = une ligne de `ai_calls` ; `consume_ai_quota()` compte, refuse ou enregistre. Exécutée avec les droits de l'appelant (RLS).
create table public.ai_calls (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  at timestamptz not null default now()
);

create index ai_calls_owner_at_idx on public.ai_calls (owner_id, at desc);

alter table public.ai_calls enable row level security;

create policy ai_calls_select on public.ai_calls for select to authenticated
  using (owner_id = (select auth.uid()));
create policy ai_calls_insert on public.ai_calls for insert to authenticated
  with check (owner_id = (select auth.uid()));
-- Le ménage des vieilles lignes se fait dans la fonction (suppression de ses propres lignes seulement).
create policy ai_calls_delete on public.ai_calls for delete to authenticated
  using (owner_id = (select auth.uid()));

revoke all on public.ai_calls from anon;

-- Renvoie 'ok' (appel enregistré), 'minute' ou 'day' (plafond atteint, rien enregistré), 'error' (pas de session).
create function public.consume_ai_quota() returns text
language plpgsql
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  per_minute integer;
  per_day integer;
begin
  if uid is null then return 'error'; end if;
  -- Deux appels simultanés du même compte se suivent : le second voit l'enregistrement du premier.
  perform pg_advisory_xact_lock(hashtext(uid::text));
  delete from public.ai_calls where owner_id = uid and at < now() - interval '2 days';
  select count(*) filter (where at > now() - interval '1 minute'),
         count(*) filter (where at > now() - interval '1 day')
    into per_minute, per_day
    from public.ai_calls where owner_id = uid;
  if per_minute >= 20 then return 'minute'; end if;
  if per_day >= 300 then return 'day'; end if;
  insert into public.ai_calls (owner_id) values (uid);
  return 'ok';
end;
$$;

revoke all on function public.consume_ai_quota() from public, anon;
grant execute on function public.consume_ai_quota() to authenticated;
