---
title: 'Story 5.4 : Tâches « devis sans réponse » et « pipeline vide »'
type: 'feature'
created: '2026-10-28'
status: 'done'
baseline_commit: '9669068ac4c03d49771cb843a956d94425dce5c0'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-5-context.md'
  - '{project-root}/docs/ui-rules.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** le cockpit ne signale ni un devis envoyé resté sans réponse, ni un pipeline qui se vide ; je dois y penser moi-même pour relancer.

**Approach:** deux règles pures s'ajoutent à `todayTasks` : règle 5 (une tâche par devis « envoyé » inactif depuis plus de 7 jours) et règle 6 (une tâche si le pipeline compte moins de deux éléments). `task_checks` accepte ces deux coches. Aucune IA, aucun e-mail.

## Boundaries & Constraints

**Always:**
- Règle 5 : devis `sent` dont le jour de Paris de `updated_at` est à plus de 7 jours de `asOf` (N ≥ 8) ; motif « devis sans réponse depuis N jours » ; `accepted`, `refused`, `draft` et prospect sans devis : rien. Toute modification du devis met `updated_at` à jour (déjà fait par la base) et remet le compteur à zéro.
- Règle 6 : éléments du pipeline = missions `planned` ou `in_progress` + devis `sent` non liés à une telle mission (ce qui est lié compte une fois ; un devis lié à une mission terminée ou annulée compte comme devis) ; tâche si moins de 2, motif « ton pipeline se vide ».
- Coche = la journée (jour de Paris), comme les règles 2 à 4 ; clé : règle et devis (règle 5), règle seule (règle 6). Tri unique inchangé : règle, date (jour de dernière modification pour la règle 5, `asOf` pour la règle 6), identifiant ; cochées en bas.
- Migration `task_checks` : la contrainte de cohérence par règle gagne la règle 5 (`source_id` seul) et la règle 6 (rien d'autre que la règle) ; SQL montré avant application ; types régénérés. Test d'isolation étendu.
- Fonctions pures qui reçoivent `asOf`, aucune valeur codée en dur hors les deux seuils nommés (7 jours, 2 éléments) ; tutoiement, thèmes clair et sombre, 44 px sur téléphone.

**Never:** règles 7 et sprint (5.4b) ; envoi d'e-mail ; brouillon de relance par l'IA (reporté, `deferred-work.md`) ; modifier devis, missions ou fiches en cochant.

## I/O & Edge-Case Matrix

| Scénario | Entrée / État | Comportement attendu | Erreur |
|----------|--------------|---------------------|--------|
| Devis dormant | `sent`, modifié il y a 8 jours | tâche règle 5 « sans réponse depuis 8 jours » | N/A |
| Devis récent | `sent`, modifié il y a 7 jours | rien | N/A |
| Devis clos | `accepted` ou `refused` dormant | rien | N/A |
| Remise à zéro | devis modifié aujourd'hui | rien | N/A |
| Pipeline vide | 1 mission en cours, aucun devis envoyé | tâche règle 6 | N/A |
| Pipeline suffisant | 2 éléments | rien | N/A |
| Devis lié | devis `sent` lié à une mission en cours, seul élément | compte une fois : 1 élément, tâche règle 6 | N/A |
| Mission close | seul devis `sent` lié à une mission terminée | compte comme devis | N/A |
| Coche | tâche règle 5 ou 6 cochée | barrée en bas ; revient le lendemain | N/A |

</frozen-after-approval>

## Code Map

- `lib/domain/cockpit/today.ts` (+ test) -- `todayTasks` (règles 1 à 4) : étendre à `rule: 1..6`, `kind` « quote » et « pipeline », `checkKey`, `targetOf` ; tri inchangé.
- `lib/db/task-checks.ts` -- `CheckTarget`, `setTaskChecked`, `targetOf` : ajouter les règles 5 et 6 ; `app/(app)/aujourd-hui/actions.ts` (`valid`) idem.
- `lib/db/quotes.ts` -- ajouter un lecteur des devis `sent` (id, client, mission, `updated_at`) avec le nom du client ; `lib/db/missions.ts` -- `listAllMissions` (statut) déjà là.
- `lib/domain/quotes.ts`, `lib/domain/missions.ts` -- statuts ; `lib/format.ts` -- `todayParis(new Date(updated_at))` donne le jour de Paris d'un horodatage.
- `app/(app)/aujourd-hui/page.tsx`, `components/today-tasks.tsx` -- lecture, liens (`LINKS`) vers la fiche du client et vers les missions.
- `supabase/migrations/20261028100000_task_checks_ceilings.sql` -- à ne pas modifier ; nouvelle migration à côté ; `tests/isolation.test.ts` (bloc `task_checks`, coches de plafond et d'ACRE).

## Tasks & Acceptance

**Execution:**
- [x] `supabase/migrations/<horodatage>_task_checks_quotes_pipeline.sql` -- contrainte de cohérence étendue ; SQL montré avant application -- socle
- [x] `lib/supabase/database.types.ts` -- régénéré -- clients typés
- [x] `lib/domain/cockpit/today.ts` + test -- règles 5 et 6, une ligne de test par ligne de la matrice -- logique pure testée
- [x] `lib/db/quotes.ts`, `lib/db/task-checks.ts`, `app/(app)/aujourd-hui/actions.ts` -- lecteur de devis envoyés, coches des règles 5 et 6 -- lecture et écritures
- [x] `app/(app)/aujourd-hui/page.tsx`, `components/today-tasks.tsx` -- tâches et liens -- interface
- [x] `tests/isolation.test.ts` -- coches de devis et de pipeline, cohérence par règle -- preuve

**Acceptance Criteria:**
- Given un devis `sent` modifié il y a plus de 7 jours, when j'ouvre le cockpit, then une tâche règle 5 s'affiche avec « devis sans réponse depuis N jours ».
- Given moins de deux éléments dans le pipeline, then une tâche règle 6 « ton pipeline se vide » s'affiche, et un devis lié à une mission en cours ne compte pas deux fois.
- Given les règles 1 à 6 actives, then l'ordre suit la règle, puis la date, puis l'identifiant.

## Implementation Notes

Implémentée directement, sans sous-agent ni relecteurs. La migration ne change aucune colonne : `database.types.ts` n'a pas bougé. Vérifié : 420 tests unitaires, 125 d'isolation, `tsc`, lint ; page cockpit chargée dans Chrome (règles 5 et 6 non observées avec des données : couvertes par les tests).

## Spec Change Log

## Review Triage Log

Relecture 5.3 + 5.4 (3 relecteurs, 28 octobre). patch : constante `ACRE_WARN_DAYS` (medium-low) ; `targetOf` dans le domaine, importé par le composant client (medium) ; test d'aller-retour coche → clé (medium). false : migration sur lignes existantes (déjà appliquée), `Invalid Date` (horodatage de la base), minuit à Paris (testé dans `lib/format.test.ts`), horloge `updated_at` (voulue par l'épopée). defer : source en échec, coches orphelines, champs en trop, lignes non masquables, listes dupliquées SQL/code, texte « Rien à faire » (`deferred-work.md`).

## Design Notes

« Pipeline » = missions à planifier ou en cours + devis envoyés, comptés une fois quand ils sont liés. Un compte tout neuf déclenche donc la règle 6 tant qu'il n'a pas deux éléments : c'est le comportement demandé. Le brouillon de relance (« peut être proposé » dans l'épopée) est une fonction d'IA distincte, notée dans `deferred-work.md`.

## Verification

**Commands:**
- `npm test` -- expected: tous verts
- `npx tsc --noEmit && npm run lint` -- expected: aucune erreur
- `npm run test:isolation` -- expected: vert, coches de devis et de pipeline incluses

**Manual checks (if no CLI):**
- Chrome : un devis envoyé modifié il y a plus de 7 jours (via la base de démo) donne la tâche ; modifier le devis la fait disparaître ; compte vide : tâche « pipeline » ; thèmes clair et sombre, téléphone.
