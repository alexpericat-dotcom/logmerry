---
title: 'Dette, lot C : migrations (done_at des tâches, index, suppression de compte)'
type: 'bugfix'
created: '2026-10-29'
status: 'in-review'
baseline_commit: '0bd47df7dadc4c3db831e4ae8ad560666e670c3b'
route: 'dispatch'
review_loop_iteration: 0
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** trois points de `deferred-work.md`, vérifiés sur le schéma réel (lecture seule du catalogue) : (1) « faite aujourd'hui » se lit dans `tasks.updated_at` : renommer une vieille tâche cochée la fait réapparaître au cockpit ; (2) `message_citations.note_id` et `chunk_id` (clés étrangères `on delete set null`) n'ont pas d'index ; (3) supprimer un **compte** qui a une fiche client avec une mission peut échouer : `missions.client_id` est en `RESTRICT`, vérifié immédiatement, et la cascade depuis `auth.users` supprime les fiches avant les missions (toutes les autres clés `owner_id` sont déjà en cascade, `professional_profile` et `regulatory_rules` comprises : la ligne de dette sur elles est périmée).

**Approach:** trois migrations, **appliquées par Alex** (éditeur SQL), types régénérés ensuite : (1) colonne `done_at` posée par la base (déclencheur : inforgeable), lue par le cockpit à la place de `updated_at` ; (2) deux index partiels ; (3) `missions.client_id` passe de `RESTRICT` à `NO ACTION` : même protection (supprimer une fiche qui a des missions reste refusé, code `23503`), vérifiée en fin d'instruction, donc la suppression d'un compte réussit. Les positions uniques restent en dette (raison plus bas).

## Boundaries & Constraints

**Always:** je n'applique AUCUN SQL moi-même : je le donne à Alex et j'attends sa confirmation ; RLS inchangée (`owner_id = auth.uid()`), aucune colonne de rôle ni de politique nouvelle ; types régénérés par `generate_typescript_types` après chaque migration ; l'action `setTaskDone` ne change pas (la base pose `done_at`) ; comportement de l'application inchangé hors le cockpit (1) ; données fictives seulement ; le script d'essai de suppression de compte s'annule lui-même (aucune ligne ne reste).

**Never:** unicité de `(mission_id, position)` ou `(story_id, position)` : `renumber` écrit ligne par ligne, chaque écriture est sa propre transaction, une contrainte même `DEFERRABLE` casserait un échange de positions : il faut des fonctions SQL transactionnelles (dette, section 4) ; toucher à `owner_id` ou aux politiques RLS ; modifier les messages de refus de suppression d'une fiche ou d'une mission (`23503` conservé) ; supprimer des données.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Cocher une tâche | `done` passe à vrai | `done_at` = heure de la base | N/A |
| Décocher | `done` passe à faux | `done_at` = nul | N/A |
| Renommer une tâche faite | `title` change, `done` reste vrai | `done_at` **inchangé** | N/A |
| Forger `done_at` | mise à jour avec un `done_at` choisi | ignoré : la base recalcule | N/A |
| Données existantes | tâches faites avant la migration | `done_at` = leur `updated_at` | N/A |
| Cockpit | tâche faite hier, renommée aujourd'hui | n'apparaît **pas** dans « faites aujourd'hui » | N/A |
| Cockpit | tâche cochée aujourd'hui | apparaît dans « faites aujourd'hui » (jour de Paris de `done_at`) | N/A |
| Suppression d'une fiche avec missions | `delete from clients` | refusée, `23503` (inchangé) | message de l'application inchangé |
| Suppression d'un compte avec fiche et mission | `delete from auth.users` | réussit, tout part en cascade | N/A |
| Index | recherche par `note_id` ou `chunk_id` | plan d'exécution par index (tables de test petites : existence des index vérifiée au catalogue) | N/A |

## SQL des migrations (à montrer à Alex ; aucun n'est appliqué sans son accord)

`supabase/migrations/20261029100000_tasks_done_at.sql`
```sql
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
```

`supabase/migrations/20261029100100_message_citations_indexes.sql`
```sql
-- Dette lot C (2) : index des clés étrangères `on delete set null` (suppression d'une note ou d'un extrait).
create index message_citations_note_idx on public.message_citations (note_id) where note_id is not null;
create index message_citations_chunk_idx on public.message_citations (chunk_id) where chunk_id is not null;
```

`supabase/migrations/20261029100200_missions_client_no_action.sql`
```sql
-- Dette lot C (3) : RESTRICT est vérifié tout de suite ; la cascade d'un compte supprime les fiches avant les missions et échouait.
-- NO ACTION refuse de la même façon (23503) mais en fin d'instruction : supprimer une fiche qui a des missions reste refusé, supprimer un compte réussit.
alter table public.missions drop constraint missions_client_id_fkey;
alter table public.missions add constraint missions_client_id_fkey
  foreign key (client_id) references public.clients (id) on delete no action;
```

**Avant la 3e migration, vérifier le nom de la contrainte** (lecture) : `select conname from pg_constraint where conrelid = 'public.missions'::regclass and confrelid = 'public.clients'::regclass;` → `missions_client_id_fkey`.

**Essai de suppression d'un compte jetable** (à lancer AVANT puis APRÈS la 3e migration ; s'annule seul, le résultat est le message d'erreur final) :
```sql
do $$
declare uid uuid := gen_random_uuid(); cid uuid := gen_random_uuid(); result text;
begin
  insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token, email_change, email_change_token_new)
    values (uid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'jetable-' || uid || '@example.com', 'x', now(), '{}', '{}', now(), now(), '', '', '', '');
  insert into public.clients (id, owner_id, name, origin) values (cid, uid, 'Fiche jetable (essai)', 'demo');
  insert into public.missions (owner_id, client_id, title) values (uid, cid, 'Mission jetable (essai)');
  begin
    delete from auth.users where id = uid;
    result := 'suppression du compte : OK';
  exception when others then
    result := 'suppression du compte : ECHEC (' || sqlstate || ' ' || sqlerrm || ')';
  end;
  raise exception 'RESULTAT (tout est annulé) : %', result;
end $$;
```

## Code Map

- `supabase/migrations/` -- trois fichiers ci-dessus (derniers : `20261028120000_task_checks_sprint_end.sql`).
- `lib/supabase/database.types.ts` -- à régénérer (MCP `generate_typescript_types`, lecture seule) : `tasks.done_at`.
- `lib/db/sprint-work.ts` (l. 3, 7) -- lit `updated_at` des tâches : lire `done_at`.
- `lib/domain/cockpit/assembly.ts` (`sprintsWithParisDay`, `SprintTaskRow`) et `assembly.test.ts` -- `done_on` calculé depuis `updated_at` : le calculer depuis `done_at` (`""` si non faite).
- `lib/domain/cockpit/today.ts` -- `SprintWork.tasks[].done_on` : type inchangé.
- `app/(app)/missions/task-actions.ts` -- `setTaskDone` : inchangé.
- `tests/isolation.test.ts` -- tests réels de la base : cocher, décocher, renommer (`done_at` stable), forger `done_at` ignoré, `delete` d'une fiche avec mission refusé (`23503`, déjà testé l. 812), les index existent (catalogue).
- `_bmad-output/implementation-artifacts/deferred-work.md` -- retirer : « faite aujourd'hui » (`done_at`), index `message_citations`, « Tester la suppression d'un compte jetable… » (résolu par l'essai), la mention de `professional_profile` et `regulatory_rules` (en cascade) ; garder les positions uniques avec leur raison.

## Tasks & Acceptance

**Execution:**
- [ ] `supabase/migrations/*` -- créer les trois fichiers -- schéma versionné
- [ ] (Alex) appliquer la migration 1, confirmer ; puis la 2 ; puis lancer l'essai de suppression (attendu : ECHEC), appliquer la 3, relancer l'essai (attendu : OK) -- jamais appliqué par moi
- [ ] `lib/supabase/database.types.ts` -- régénérer après chaque migration, `tsc` -- types fidèles
- [ ] `lib/db/sprint-work.ts`, `assembly.ts`, `assembly.test.ts` -- cockpit sur `done_at` -- fin des réapparitions
- [ ] `tests/isolation.test.ts` -- cas de la matrice côté base -- comportement prouvé en réel
- [ ] `docs/journal.md`, `deferred-work.md` -- journal ; retirer les points résolus

**Acceptance Criteria:**
- Given les migrations appliquées, when `npm run test:isolation` tourne, then tous les tests passent (127 + les nouveaux).
- Given `npm test`, `tsc --noEmit`, `npm run lint` et `next build` (copie propre), then sans erreur.
- Given l'essai de suppression de compte, then ECHEC avant la migration 3 et OK après.
- Given le cockpit, then une tâche de sprint faite avant aujourd'hui et renommée aujourd'hui n'est plus listée « faite aujourd'hui » (contrôle d'Alex).

## Implementation Notes

- Migrations 1 (`tasks_done_at`, avec le déclencheur d'`updated_at` suspendu pendant la reprise) et 2 (`message_citations_indexes`) appliquées par Alex le 29 octobre et vérifiées au catalogue (lecture seule) ; types : trois lignes `done_at` dans `tasks` (même format que le fichier). **La migration 3 (`missions.client_id` en `NO ACTION`) n'est PAS appliquée et son fichier est retiré** : voir le Spec Change Log.
- Code : `lib/db/sprint-work.ts` lit `done_at` ; `sprintsWithParisDay` calcule `done_on` depuis `done_at` (vide si non faite) ; l'action `setTaskDone` est inchangée.
- Vérifié : `npm test`, `tsc`, lint, `test:isolation` 128/128 (dont le nouveau test réel de `done_at`), `next build` en copie propre ; mutation de `done_on` détectée.

## Spec Change Log

- 29 octobre 2026, essai de suppression de compte (script annulé par lui-même, lancé par Alex) : « OK » AVANT la migration 3, sur le jeu minimal (fiche et mission) puis sur le jeu complet (profil, fiche, mission, devis, facture, encaissement, sprint, story, tâche, note, message, citation). L'hypothèse de la spec (la cascade échoue à cause de `RESTRICT`) n'est pas démontrée : la migration 3 est abandonnée, la contrainte reste en `RESTRICT`. Évité : appliquer un changement de schéma pour un défaut jamais observé. À garder : le script d'essai (dans la spec) pour revérifier avant la purge de la base, au passage à l'outil pro.

## Review Triage Log

## Verification

**Commands:**
- `npm test` -- expected: tous les lots passent
- `npx tsc --noEmit && npm run lint` -- expected: sans erreur
- `npm run test:isolation` -- expected: tous les tests passent, nouveaux compris (comptes de test réels)
- Catalogue (lecture) -- expected: `tasks_done_at_matches_done`, trigger `tasks_done_at`, deux index `message_citations_*_idx`, `missions_client_id_fkey` en `no action`
- `next build` dans une copie propre -- expected: passe

**Manual checks (if no CLI):**
- Cockpit, compte de démo : cocher une tâche de sprint d'aujourd'hui (elle apparaît « faite »), la renommer (elle reste), décocher (elle disparaît de « faites »).
