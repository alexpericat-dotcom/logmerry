---
title: 'Story 5.5 : CA encaissé et jauges sur le cockpit'
type: 'feature'
created: '2026-10-28'
status: 'done'
baseline_commit: 'ae152b0a955c824182bad8d721352c0047c4f8cb'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-5-context.md'
  - '{project-root}/docs/ui-rules.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** le cockpit dit quoi faire, mais pas où j'en suis : pour connaître mon CA encaissé et mes plafonds, je dois ouvrir la page Plafonds.

**Approach:** une section « Plafonds et CA » sous les tâches du cockpit : un repère « CA encaissé (hors taxe, année en cours) » et les jauges des plafonds suivis, rendues par le même composant et calculées par la même fonction (`computeCeilings`) que la page Plafonds. Ce ne sont pas des tâches.

## Boundaries & Constraints

**Always:**
- Jauges : `computeCeilings` et `CeilingGaugeCard` / `MissingCeiling` tels quels (étiquette « Estimation », « paramètre manquant » avec lien, bandeau « donnée déclarée, non confirmée », « DEMO, non officielle », base propre à chaque jauge). Aucun second calcul : la note de la franchise de TVA est partagée (constante exportée du composant, lue aussi par la page Plafonds).
- CA encaissé : somme des encaissements saisis, montant hors taxe, du 1er janvier de l'année de `asOf` à `asOf` (jour de Paris) ; fonction pure `collectedRevenue(payments, asOf)`, en centimes entiers ; un encaissement postérieur à `asOf` n'est pas compté. Libellé « d'après tes encaissements saisis », pas « estimation » (c'est un total, pas un calcul réglementaire) ; sans encaissement : « 0,00 € ».
- À jour au retour sans bouton d'actualisation : enregistrer, modifier ou supprimer un encaissement ou une facture revalide aussi `/aujourd-hui`.
- La section s'affiche même sans tâche ; les jauges n'entrent ni dans l'ordre des tâches, ni dans la liste du jour, ni dans `todayTasks`.
- Tutoiement, thèmes clair et sombre, 44 px sur téléphone ; aucune IA ; aucune valeur réglementaire en dur.

**Never:** modifier la page Plafonds (son rendu reste identique) ; recalculer un plafond côté cockpit ; une tâche issue d'une jauge (relève de la règle 3, déjà livrée) ; migration.

## I/O & Edge-Case Matrix

| Scénario | Entrée / État | Comportement attendu | Erreur |
|----------|--------------|---------------------|--------|
| CA de l'année | encaissements en janvier et en octobre, un de l'an dernier | somme des deux premiers, hors taxe | N/A |
| Sans encaissement | aucun | « 0,00 € » | N/A |
| Encaissement futur | postérieur à `asOf` | non compté | N/A |
| Mêmes chiffres | encaissements et règles d'essai | chaque jauge = celle de la page Plafonds | N/A |
| Plafond sans règle | règle absente ou non vérifiée | « paramètre manquant » + lien, pas de chiffre | N/A |
| Donnée déclarée | catégorie non confirmée | bandeau « donnée déclarée, non confirmée » | N/A |
| Après un encaissement | enregistré sur `/factures`, retour au cockpit | CA et jauges à jour | N/A |

</frozen-after-approval>

## Code Map

- `lib/domain/finance/ceilings.ts` -- `computeCeilings`, `ceilingPeriod` (réutilisés tels quels) ; nouveau `lib/domain/finance/revenue.ts` (+ test) : `collectedRevenue`.
- `components/ceiling-gauge.tsx` -- `CeilingGaugeCard`, `MissingCeiling` ; y exporter la note de la franchise de TVA (aujourd'hui `NOTES` dans `app/(app)/plafonds/page.tsx`, qui la lira de là).
- `app/(app)/aujourd-hui/page.tsx` -- lit déjà règles, profil, encaissements, plafonds calculés : ajouter la section sous les tâches.
- `app/(app)/factures/payment-actions.ts`, `app/(app)/factures/actions.ts` -- `revalidatePath` : ajouter `/aujourd-hui`.
- `lib/db/payments.ts` -- `listPaymentsForCeilings` (montants et date) : suffit au CA.

## Tasks & Acceptance

**Execution:**
- [x] `lib/domain/finance/revenue.ts` + test -- `collectedRevenue`, une ligne de test par ligne de la matrice -- logique pure testée
- [x] `components/ceiling-gauge.tsx`, `app/(app)/plafonds/page.tsx` -- note partagée -- une seule source
- [x] `app/(app)/aujourd-hui/page.tsx` -- section CA et jauges -- interface
- [x] `app/(app)/factures/payment-actions.ts`, `app/(app)/factures/actions.ts` -- revalidation du cockpit -- à jour au retour

**Acceptance Criteria:**
- Given des encaissements et des plafonds suivis, when j'ouvre le cockpit, then je vois le CA encaissé et chaque jauge avec les mêmes chiffres que la page Plafonds.
- Given un encaissement enregistré, when je reviens au cockpit, then il est à jour sans action de ma part.
- Given les jauges, then elles n'apparaissent pas dans la liste des tâches ni dans leur ordre.

## Implementation Notes

Implémentée directement. Vérifié : 432 tests unitaires, `tsc`, lint ; dans Chrome : CA 83 600 € et jauges identiques à la page Plafonds (note de la franchise de TVA partagée), titres h3 sous la section. Écart avec le texte figé : un plafond « paramètre manquant » apparaît par sa ligne sous les tâches (5.3), pas par une carte de la section (voir Design Notes). Revalidation du cockpit non observée en navigateur (appels `revalidatePath` seulement).

## Spec Change Log

## Review Triage Log

Relecture 5.5 (3 relecteurs, 28 octobre). patch : CA et jauge jamais comparés (medium : test croisé `collectedRevenue` / `computeCeilings`) ; message « paramètre manquant » affiché deux fois, ligne et carte (medium : pas de carte pour un plafond manquant). false : `alert_thresholds` nul (colonne non nulle), liste vide (trois clés fixes), montants négatifs (contrainte de la base), étiquette DEMO ou « Estimation » sur le CA (c'est un total saisi, pas une règle), revalidation des autres écrivains (aucun autre ne change encaissements ou factures). defer : structure `<p>` de la carte du CA (cosmétique).

## Design Notes

Un plafond « paramètre manquant » n'a pas de carte dans la section : sa ligne (raison, lien) existe déjà sous les tâches (story 5.3) ; la doubler aurait répété le même message deux fois sur la page.

Les jauges du cockpit sont les cartes complètes de la page Plafonds, pas une version réduite : c'est la façon la plus sûre de garder « les mêmes chiffres » (une seule fonction, un seul composant). La story 5.6 (écran « À faire » et ligne de synthèse) redistribuera la place ; une carte compacte pourra alors remplacer celle-ci sans toucher au calcul.

## Verification

**Commands:**
- `npm test` -- expected: tous verts
- `npx tsc --noEmit && npm run lint` -- expected: aucune erreur

**Manual checks (if no CLI):**
- Chrome : cockpit et page Plafonds côte à côte, mêmes chiffres ; enregistrer un encaissement sur `/factures` puis revenir au cockpit : CA et jauges changés ; thèmes clair et sombre, téléphone.
