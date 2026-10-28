-- Story 5.2 : coches des tâches du cockpit qui ne sont ni une échéance (deadlines.done_at) ni une tâche de story (tasks.done).
-- Pour l'instant : la règle 2 (facture échue), cochée « pour la journée » : period_start = le jour de Paris. Les règles 3 à 7 ajouteront leurs colonnes.
-- source_id n'a pas de clé étrangère (la table servira à plusieurs sortes de sources) : supprimer la source laisse une coche orpheline, sans effet.
create table public.task_checks (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  rule_no smallint not null check (rule_no between 1 and 7),
  source_id uuid not null,
  period_start date not null,
  checked_at timestamptz not null default now(),
  -- Une seule coche par tâche et par période : deux clics simultanés ne créent pas deux lignes.
  unique (owner_id, rule_no, source_id, period_start)
);

alter table public.task_checks enable row level security;

create policy task_checks_select on public.task_checks for select to authenticated
  using (owner_id = (select auth.uid()));
create policy task_checks_insert on public.task_checks for insert to authenticated
  with check (owner_id = (select auth.uid()));
-- Décocher = supprimer la coche. Pas de mise à jour : une coche ne change jamais.
create policy task_checks_delete on public.task_checks for delete to authenticated
  using (owner_id = (select auth.uid()));
