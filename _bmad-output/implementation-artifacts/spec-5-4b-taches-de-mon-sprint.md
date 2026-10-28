---
title: 'Story 5.4b : Tâches de mon sprint'
type: 'feature'
created: '2026-10-28'
status: 'done'
baseline_commit: '636c44ed63b7d9469a99ca2582dc44288aa1a4ee'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-5-context.md'
  - '{project-root}/docs/ui-rules.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** le travail de mission (sprint en cours) n'apparaît pas sur le cockpit : je dois ouvrir chaque mission pour savoir quoi faire, et rien ne prévient qu'un sprint se termine avec des stories ouvertes.

**Approach:** deux ajouts à `todayTasks`, fonctions pures : règle 7 (une tâche par sprint « en cours » qui se termine dans 0 à 2 jours avec des stories non terminées) puis, après toutes les règles, les tâches du sprint (au plus trois, suivies d'une ligne « N autres tâches »). Cocher une tâche du sprint coche la tâche de la story (`setTaskDone`), seule source de « fait ».

## Boundaries & Constraints

**Always:**
- Sprint pris en compte : statut « active » ; stories « en cours » seulement, tâches non faites. Contexte affiché « Client / Mission / Sprint X ». Motif « dans ton sprint, qui se termine dans N jours » ; fin dépassée : « dans ton sprint, dont la fin est dépassée de N jours ».
- Ordre des tâches du sprint : fin de sprint la plus proche, puis ordre des stories, puis ordre des tâches. Trois au plus ; au-delà, une ligne (pas une tâche) « N autres tâches dans ton sprint » avec lien vers la mission (la première de l'ordre).
- Règle 7 : sprint « active » dont la fin tombe dans 0 à 2 jours (jour de Paris), avec M ≥ 1 stories non terminées (à faire ou en cours, rattachées au sprint) : motif « ton sprint se termine dans N jours, M stories non terminées » ; classée avant les tâches du sprint. Coche = la journée, clé : règle 7 et sprint.
- Une tâche de sprint cochée aujourd'hui (jour de Paris de `updated_at`) reste affichée, cochée, en bas : décocher reste possible ; elle ne compte ni dans les trois ni dans « N autres ». Cocher ou décocher n'écrit que `tasks.done`, jamais le statut de la story (comme `setTaskDone`).
- Migration `task_checks` : la contrainte de forme gagne la règle 7 (`source_id` seul) ; SQL montré avant application. Test d'isolation étendu.
- Fonctions pures qui reçoivent `asOf` ; aucune IA ; seuils nommés (3 tâches, 2 jours) ; tutoiement, thèmes clair et sombre, 44 px sur téléphone.

**Never:** décider à la place du propriétaire (aucune IA) ; changer le statut d'une story ou d'un sprint ; toucher aux règles 1 à 6 ; afficher des tâches d'un sprint planifié ou clos.

## I/O & Edge-Case Matrix

| Scénario | Entrée / État | Comportement attendu | Erreur |
|----------|--------------|---------------------|--------|
| Sprint en cours | 2 stories en cours, 5 tâches non faites | 3 tâches (ordre du sprint) + « 2 autres tâches dans ton sprint » | N/A |
| Aucune story en cours | sprint actif, stories à faire | aucune tâche de sprint | N/A |
| Sprint non actif | planifié ou clos | rien | N/A |
| Fin proche | actif, fin à J+2, 2 stories non terminées | tâche règle 7, avant les tâches du sprint | N/A |
| Fin lointaine | actif, fin à J+3 | pas de règle 7 | N/A |
| Aucune story ouverte | actif, fin à J+1, toutes terminées | pas de règle 7 | N/A |
| Fin dépassée | actif, fin hier | tâches du sprint avec « fin dépassée » ; pas de règle 7 | N/A |
| Coche | tâche cochée depuis le cockpit | `tasks.done` écrit ; reste affichée, cochée, en bas ; décochable | échec : message, rien changé |
| Plusieurs sprints | deux missions avec un sprint actif | tâches ordonnées par fin de sprint | N/A |

</frozen-after-approval>

## Code Map

- `lib/domain/cockpit/today.ts` (+ test) -- `todayTasks` : règle 7 et tâches du sprint ; `TodayTask` gagne `kind` « sprint-end » et « sprint-task », `context` ; `targetOf` ; tri inchangé (les tâches du sprint prennent le rang 8, jamais affiché).
- `lib/db/sprints.ts` -- ajouter un lecteur des sprints « active » (mission, client) ; `lib/db/user-stories.ts`, `lib/db/tasks.ts` -- stories et tâches de ces sprints ; `lib/domain/sprints.ts`, `lib/domain/user-stories.ts` -- statuts.
- `app/(app)/missions/task-actions.ts` -- `setTaskDone` : à réutiliser tel quel pour cocher.
- `lib/db/task-checks.ts`, `app/(app)/aujourd-hui/actions.ts` -- coche de la règle 7.
- `app/(app)/aujourd-hui/page.tsx`, `components/today-tasks.tsx` -- lecture, contexte, ligne « N autres tâches ».
- `supabase/migrations/20261028110000_task_checks_quotes_pipeline.sql` -- à ne pas modifier ; nouvelle migration à côté ; `tests/isolation.test.ts` (bloc `task_checks`).

## Tasks & Acceptance

**Execution:**
- [x] `supabase/migrations/<horodatage>_task_checks_sprint_end.sql` -- règle 7 dans la contrainte de forme ; SQL montré avant application -- socle
- [x] `lib/domain/cockpit/today.ts` + test -- règle 7, tâches du sprint, plafond de trois, une ligne par ligne de la matrice -- logique pure testée
- [x] `lib/db/sprints.ts`, `lib/db/task-checks.ts`, `app/(app)/aujourd-hui/actions.ts` -- lecteur de sprints actifs, coche de la règle 7 -- lecture et écritures
- [x] `app/(app)/aujourd-hui/page.tsx`, `components/today-tasks.tsx` -- tâches, contexte, coche via `setTaskDone`, ligne « autres tâches » -- interface
- [x] `tests/isolation.test.ts` -- coche de la règle 7, cohérence de forme -- preuve

**Acceptance Criteria:**
- Given un sprint actif avec des stories en cours, when j'ouvre le cockpit, then au plus trois tâches s'affichent avec leur contexte, puis « N autres tâches dans ton sprint ».
- Given une tâche du sprint cochée depuis le cockpit, then la tâche de la story est cochée, et la décocher la rouvre.
- Given sans sprint actif ou sans story en cours, then rien n'apparaît.

## Implementation Notes

Implémentée directement, sans sous-agent ni relecteurs (non demandés). `setTaskDone` réutilisé tel quel ; il revalide aussi `/aujourd-hui`. Vérifié : 427 tests unitaires, 126 d'isolation, `tsc`, lint ; dans Chrome avec un sprint temporaire (supprimé) : règle 7 en tête, trois tâches avec contexte, « 2 autres tâches », cocher puis décocher persistent.

## Spec Change Log

## Review Triage Log

Relecture 5.4b (3 relecteurs, 28 octobre). patch : « Bravo » affiché alors que « N autres tâches » restent (medium, 2 relecteurs) ; lien « N autres tâches » vers la mission de la première tâche, pas de la première cachée (medium, 3 relecteurs) ; `revalidatePath('/aujourd-hui')` placé avant la lecture qui peut échouer (low, correction directe) ; lecture des sprints sans test d'isolation (medium : extraite dans `lib/db/sprint-work.ts`, testée avec deux comptes). false : mission nulle ou statut de mission non filtré (la spec ne retient que le statut du sprint ; la RLS pose le propriétaire), statuts de stories (énumération fermée), `Invalid Date` (horodatage de la base), journal absent (écrit avant la relecture). defer : `updated_at` comme date de « fait » (toute modification d'une tâche faite la rend « faite aujourd'hui » ; une colonne `done_at` demanderait une migration), autres actions de missions qui ne revalident pas le cockpit (la page est dynamique, pas de cache client), `router.refresh()` après « tâche introuvable », garde de `valid()` non testée.

## Design Notes

« Septième règle » : l'alerte de fin de sprint porte le numéro 7 ; les tâches du sprint viennent après (rang 8 en interne, non affiché), conformément à l'épopée (« après les règles 1 à 7 »). Les tâches faites aujourd'hui restent visibles pour que « décocher est possible » ait un sens : sans cela, une tâche cochée disparaîtrait au rechargement.

## Verification

**Commands:**
- `npm test` -- expected: tous verts
- `npx tsc --noEmit && npm run lint` -- expected: aucune erreur
- `npm run test:isolation` -- expected: vert, coche de la règle 7 incluse

**Manual checks (if no CLI):**
- Chrome : un sprint actif avec 5 tâches (3 affichées + « 2 autres ») ; cocher puis décocher ; sprint finissant dans 2 jours : tâche règle 7 en premier ; thèmes clair et sombre, téléphone.
