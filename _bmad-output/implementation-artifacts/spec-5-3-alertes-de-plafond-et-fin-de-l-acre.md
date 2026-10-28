---
title: 'Story 5.3 : Alertes de plafond et fin de l''ACRE'
type: 'feature'
created: '2026-10-28'
status: 'done'
baseline_commit: 'ba53db920ca2d29ba9d0e9082c0e9f6871c242a5'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-5-context.md'
  - '{project-root}/docs/ui-rules.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** le cockpit ne prévient ni quand un plafond approche, ni quand l'ACRE se termine ; les jauges de la page Plafonds existent mais n'émettent aucune tâche.

**Approach:** deux règles pures s'ajoutent à `todayTasks` : règle 3 (une tâche par plafond dont un seuil actif du profil est atteint, seuil le plus haut seul) et règle 4 (fin d'ACRE dans 31 jours au plus) ; ce qui manque pour les calculer s'affiche en lignes « paramètre manquant » sous les tâches. `task_checks` gagne de quoi coder plafond et seuil.

## Boundaries & Constraints

**Always:**
- Règle 3 : réutilise `computeCeilings` (4.4) et son `alertThreshold` (seuil actif le plus haut atteint) ; à 100 %, seule la tâche à 100 % reste ; un seuil non actif au profil n'émet rien ; un plafond et un seuil = une tâche. Motif : « plafond [nom] à 90 % (estimation) », « … dépassé » au-delà du plafond. Un plafond « paramètre manquant » (catégorie, règle absente, non vérifiée, périmée, période libre) donne une ligne « paramètre manquant » avec sa raison et son lien, jamais une tâche.
- Règle 4 : profil ACRE « Éligible », date de début d'activité connue, règle `acre_duration` utilisable (`usableRule`, catégorie du profil) : fin estimée = début + durée en mois (`addMonths`, formule en code, durée lue dans la règle) ; tâche si `0 ≤ jours ≤ 31`, motif « fin d'ACRE estimée dans N jours (estimation) » ; fin passée ou lointaine : rien. ACRE « Non éligible » : rien, pas de ligne. ACRE vide ou « Je ne sais pas », date « À confirmer », catégorie absente ou règle inutilisable : ligne « paramètre manquant » nommant ce qui manque (jamais ignorée, jamais classée comme tâche).
- Bandeau « calcul basé sur une donnée déclarée, non confirmée » quand une donnée utilisée est Déclarée sans confirmation (catégorie d'activité pour la règle 3 ; date de début pour la règle 4) ; étiquette « DEMO, non officielle » quand la règle utilisée est « Essai ».
- Coche = la journée (jour de Paris), pour les règles 3 et 4, comme les factures ; clé de coche : règle, plafond, seuil (règle 3) ; règle seule (règle 4). Cocher 90 % ne masque pas 100 %. Tri unique : règle, date (aujourd'hui pour la règle 3, fin d'ACRE pour la règle 4), identifiant ; cochées en bas.
- Migration `task_checks` : colonnes `ceiling_key`, `threshold` (50, 75, 90, 100), `source_id` devient facultatif, unicité `nulls not distinct` sur (propriétaire, règle, source, plafond, seuil, jour), contrainte de cohérence par règle ; SQL montré avant application, types régénérés. Test d'isolation étendu.
- Fonctions pures qui reçoivent `asOf` ; aucune valeur réglementaire en dur ; aucune IA. Tutoiement, thèmes clair et sombre, 44 px sur téléphone.

**Never:** règles 5 à 7 (5.4, 5.4b) ; calcul officiel de la fin d'ACRE (estimation étiquetée) ; modifier profil, règles ou encaissements en cochant ; mélanger la jauge des plafonds avec le cockpit (la page Plafonds ne change pas).

## I/O & Edge-Case Matrix

| Scénario | Entrée / État | Comportement attendu | Erreur |
|----------|--------------|---------------------|--------|
| Plafond à 90 % | seuil 90 actif, 90 % consommé | tâche « plafond … à 90 % » | N/A |
| Plafond à 100 % | seuils 90 et 100 actifs, 100 % | seule la tâche à 100 % | N/A |
| Seuil inactif | 90 % consommé, seul 100 actif | aucune tâche | N/A |
| Coche 90 % | tâche 90 % cochée, puis 100 % atteint | la tâche 100 % apparaît décochée | N/A |
| Règle de plafond absente | catégorie ou règle manquante | ligne « paramètre manquant » + lien | N/A |
| Fin d'ACRE proche | éligible, début + durée à J+31 | tâche règle 4 ; J+32 ou passée : rien | N/A |
| ACRE non éligible | profil « Non éligible » | rien (ni tâche ni ligne) | N/A |
| ACRE inconnue | vide ou « Je ne sais pas » | ligne « paramètre manquant » | N/A |
| Donnée déclarée | catégorie Déclarée non confirmée | tâche avec bandeau | N/A |
| Règle d'essai | règle « Essai » | étiquette « DEMO, non officielle » | N/A |

</frozen-after-approval>

## Code Map

- `lib/domain/cockpit/today.ts` (+ test) -- `todayTasks` (règles 1, 2) : étendre à `rule: 1 | 2 | 3 | 4`, tri et cochées en bas déjà là.
- `lib/domain/finance/ceilings.ts` -- `computeCeilings`, `alertThreshold`, `declaredNotConfirmed`, `demo`, `MISSING_TEXT` (réutilisés tels quels) ; `rules.ts` -- `usableRule` ; `rule-keys.ts` -- `acre_duration` (`months`).
- `lib/domain/profile.ts` -- `fieldState`, `PROFILE_FIELDS` (`acre`, `activity_start_date`) ; `lib/domain/deadlines.ts` -- `addMonths`, `daysUntil`.
- `lib/db/task-checks.ts` -- `setInvoiceTaskChecked`, `listInvoiceTaskChecks` : généraliser aux clés de coche (règle, source, plafond, seuil).
- `app/(app)/aujourd-hui/{page,actions}.tsx|ts`, `components/today-tasks.tsx` -- lecture (règles, profil, encaissements), coche, bandeaux, lignes « paramètre manquant ».
- `app/(app)/plafonds/page.tsx` -- modèle de lecture (`listRules`, `getProfile`, `listPaymentsForCeilings`) ; ne change pas.
- `supabase/migrations/20261023150000_task_checks.sql` -- à ne pas modifier ; nouvelle migration à côté ; `tests/isolation.test.ts` (bloc `task_checks`, le test « autre règle » insère `rule_no: 3` et devra fournir plafond et seuil).

## Tasks & Acceptance

**Execution:**
- [x] `supabase/migrations/<horodatage>_task_checks_ceilings.sql` -- colonnes, unicité, cohérence ; SQL montré avant application -- socle
- [x] `lib/supabase/database.types.ts` -- reporté -- clients typés
- [x] `lib/domain/cockpit/today.ts` + test -- règles 3 et 4, lignes « paramètre manquant », bandeaux -- logique pure testée
- [x] `lib/db/task-checks.ts`, `app/(app)/aujourd-hui/actions.ts` -- coche à clés généralisées -- écritures
- [x] `app/(app)/aujourd-hui/page.tsx`, `components/today-tasks.tsx` -- lecture, tâches, bandeaux, lignes manquantes -- interface
- [x] `tests/isolation.test.ts` -- coches de plafond et d'ACRE, cohérence par règle -- preuve

**Acceptance Criteria:**
- Given un plafond à 90 % avec le seuil 90 actif, when j'ouvre le cockpit, then une tâche règle 3 s'affiche avec son motif ; à 100 %, seule celle à 100 %.
- Given la tâche à 90 % cochée, when le plafond atteint 100 %, then la tâche à 100 % apparaît.
- Given une règle ou une donnée de profil manquante, then une ligne « paramètre manquant » nomme ce qui manque, sans tâche.

## Implementation Notes

## Spec Change Log

## Review Triage Log

## Design Notes

« Fin d'ACRE estimée = début + durée en mois » est une convention de code (formule), pas une valeur réglementaire : la durée vient de la règle `acre_duration`. Toute autre convention de l'auteur (fin de mois, jour exclu) se règle dans cette seule fonction.

## Verification

**Commands:**
- `npm test` -- expected: tous verts
- `npx tsc --noEmit && npm run lint` -- expected: aucune erreur
- `npm run test:isolation` -- expected: vert, coches de plafond et d'ACRE incluses

**Manual checks (if no CLI):**
- Chrome : sans règle, trois lignes « paramètre manquant » ; avec règles d'essai et un gros encaissement, tâche à 90 % puis 100 % ; thèmes clair et sombre, téléphone.
