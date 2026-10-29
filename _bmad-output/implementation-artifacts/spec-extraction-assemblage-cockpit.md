---
title: 'Extraction de l''assemblage de la page cockpit'
type: 'refactor'
created: '2026-10-29'
status: 'done'
baseline_commit: 'b9574e03ead8200040bceb1bdc7ab03feb0da84e'
route: 'dispatch'
review_loop_iteration: 0
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** `app/(app)/aujourd-hui/page.tsx` garde en ligne cinq morceaux de logique sans test : le mappage des factures (statut par `invoiceBalance`, puis « échue » pour la tuile Factures : calculé deux fois par facture), le jour de Paris des tâches de sprint (`done_on`) et des devis (`updated_on`), la progression des tâches et le texte du bandeau (pluriels), et le choix du plafond le plus avancé.

**Approach:** déplacer ces cinq morceaux, tels quels, dans des fonctions pures de `lib/domain/cockpit/assembly.ts`, testées par `node --test` ; la page les appelle. Aucun changement de comportement ni d'affichage, aucune dépendance, aucune migration.

## Boundaries & Constraints

**Always:** résultat identique à la page actuelle pour toute entrée (y compris « 0 tâche à faire », « 1 déjà faite », « 2 déjà faites ») ; `invoiceBalance` appelé une fois par facture ; imports relatifs avec extension `.ts` dans `lib/domain` (le lanceur des tests de domaine n'a pas l'alias `@/`) ; jour de Paris par `todayParis` de `lib/format.ts`, jamais l'horloge lue dans la fonction (la date de référence est un argument).

**Never:** modifier `todayTasks`, `cockpitKpis`, `todayMissing`, `sprintOverflow` ni leurs tests ; changer un texte affiché ; toucher à `components/` ; corriger au passage un autre point de la section « Cockpit » de `deferred-work.md` (source en échec, `done_at`, Suspense…).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Factures | impayée, partielle, payée ; échéance passée ou non | `forTasks` : `{ id, reference, due_on, status, mission }` ; `rows` : `{ status, overdue }` ; `overdue` vrai seulement si non payée et échéance passée (règle de `isOverdue`) | N/A |
| Aucune facture | `[]` | deux listes vides | N/A |
| Jour de Paris | `2026-10-23T22:30:00Z` (00 h 30 le 24 à Paris) | tâche `done_on` = `2026-10-24` ; devis `updated_on` = `2026-10-24` ; autres champs conservés | N/A |
| Progression | 0 tâche ; 1 sur 3 ; 2 sur 3 ; 3 sur 3 | `{ done: 0, percent: 0 }` ; 33 ; 67 ; 100 | pas de division par zéro |
| Texte du bandeau | 0 tâche ; 1 à faire / 0 faite ; 2 à faire / 1 faite ; 0 à faire / 3 faites | « Rien à faire pour aujourd'hui. » ; « 1 tâche à faire aujourd'hui, 0 déjà faite. » ; « 2 tâches à faire aujourd'hui, 1 déjà faite. » ; « 0 tâche à faire aujourd'hui, 3 déjà faites. » | N/A |
| Plafond le plus avancé | plusieurs `ok` ; aucun `ok` ; égalité | celui au pourcentage le plus haut, seulement parmi les `ok` ; `undefined` ; le premier de la liste | N/A |

</frozen-after-approval>

## Code Map

- `app/(app)/aujourd-hui/page.tsx` -- lignes 41-70 : les cinq morceaux à remplacer par des appels ; `Tasks()` garde les lectures et le rendu.
- `lib/domain/cockpit/today.ts` -- `todayTasks` (entrée des factures `forTasks`), `SprintWork`, `QuoteInput` : types à réutiliser, ne pas modifier.
- `lib/domain/cockpit/overview.ts` -- `cockpitKpis` (entrée `rows`), modèle de style et de tests.
- `lib/domain/payments.ts` -- `invoiceBalance` ; `lib/domain/invoices.ts` -- `isOverdue(due_on, today, status)`.
- `lib/format.ts` -- `todayParis(now)` (pur, `Intl`).
- `lib/domain/cockpit/*.test.ts` -- modèle de tests ; `npm test` lance `lib/**/*.test.ts`.

## Tasks & Acceptance

**Execution:**
- [x] `lib/domain/cockpit/assembly.ts` -- `invoiceViews`, `sprintsWithParisDay`, `quotesWithParisDay`, `taskProgress`, `bannerDescription`, `topCeiling` -- code déplacé tel quel
- [x] `lib/domain/cockpit/assembly.test.ts` -- une ligne de test par ligne de la matrice -- comportement figé avant que la page l'appelle
- [x] `app/(app)/aujourd-hui/page.tsx` -- remplacer le code en ligne par les appels -- même rendu
- [x] `docs/journal.md`, `_bmad-output/implementation-artifacts/deferred-work.md` -- retirer « l'assemblage de la page cockpit… » de la liste des fonctions à extraire et `invoiceBalance` « calculé deux fois » côté cockpit ; noter le reste

**Acceptance Criteria:**
- Given les matrices ci-dessus, when `npm test` tourne, then les nouveaux tests passent et les anciens sont inchangés.
- Given une mutation (retirer `percent` arrondi, inverser le pluriel, ne pas filtrer `status === "ok"`, décaler le jour de Paris), when les tests tournent, then au moins un échoue.
- Given `tsc --noEmit`, `npm run lint` et `next build` (copie propre), then sans erreur.
- Given la page, then `git diff` ne change aucun texte affiché ; contrôle visuel de `/aujourd-hui` par Alex (aucun test de page n'existe).

## Implementation Notes

- `assembly.ts` : six fonctions, code déplacé tel quel ; `bannerDescription` et `topCeiling` reprennent le texte et le tri de la page. La page n'importe plus `isOverdue`, `invoiceBalance` ni `SprintWork`. Après relecture : 8 tests.
- Vérifié : `npm test` (anciens tests inchangés), `tsc`, lint, `next build` en copie propre ; six mutations (arrondi, pluriel, filtre « ok », jour de Paris, « échue », ordre du plafond) détectées.
- Non fait : contrôle visuel de `/aujourd-hui` (à faire par Alex).

## Spec Change Log

## Review Triage Log

Trois relecteurs (Blind Hunter, Edge Case Hunter, Verification Gap).

| # | Constat | Verdict | Preuve / route |
|---|---------|---------|----------------|
| 1 | `invoiceViews` : fixtures sans taxe connue, sans trop-perçu, sans référence nulle | medium | patch : test ajouté (taxe connue, trop-perçu, référence nulle) |
| 2 | Jour de Paris : changement d'heure du 25 octobre 2026 non testé | medium | patch : test ajouté (3 instants) |
| 3 | Dette : « coches du jour » effacées sans trace | low | patch : précision ajoutée (aucune logique en ligne, `listTaskChecks` passé tel quel) |
| 4 | Spec périmée (statut, tâches, journaux vides) | low | patch (cette mise à jour) |
| 5 | Date invalide (`updated_at`) fait lever `RangeError` | low | rejeté : la base type la colonne `timestamptz` non nulle ; l'ancien code en ligne se comportait pareil, refactor sans changement de comportement |
| 6 | `bannerDescription` avec `done > total` donne un nombre négatif | low | rejeté : `done` est un sous-ensemble de `total` (calculé par `taskProgress` sur les mêmes tâches) |
| 7 | `percent` `NaN` fausse le tri de `topCeiling` | low | rejeté : `percent` est calculé par `computeCeilings` (entier), pas atteignable |
| 8 | `payments` nul fait lever `TypeError` | low | rejeté : `listInvoices` renvoie toujours un tableau ; même comportement qu'avant |
| 9 | Aucun test ne compte les appels de `invoiceBalance` | low | rejeté : propriété d'efficacité sans effet sur le résultat |
| 10 | Typage lâche des tests de `topCeiling`, paramètres `(total, done)` interchangeables, import sur une longue ligne | low | rejeté (cosmétique ; les imports de la page sont déjà longs) |

## Verification

**Commands:**
- `npm test` -- expected: tous les lots passent
- `npx tsc --noEmit && npm run lint` -- expected: sans erreur
- Mutations à la main sur `assembly.ts` -- expected: un test échoue à chaque fois, puis restauration
- `next build` dans une copie propre (git worktree) -- expected: passe

**Manual checks (if no CLI):**
- Ouvrir `/aujourd-hui` : bandeau (texte et tuiles), anneau « Tâches du jour », anneau du plafond le plus avancé identiques à avant.
