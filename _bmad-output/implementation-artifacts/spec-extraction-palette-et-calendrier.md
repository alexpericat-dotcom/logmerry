---
title: 'Extraction de la logique de la palette ⌘K et du panneau du calendrier'
type: 'refactor'
created: '2026-10-29'
status: 'done'
baseline_commit: 'a60d3dc2dba2815f8ee4b338e31b5651eb98bd12'
route: 'dispatch'
review_loop_iteration: 0
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** deux composants gardent en ligne de la logique sans test : la palette ⌘K (`components/search-palette.tsx` : lignes de résultats, navigation au clavier, texte d'état, raccourci) et le panneau du calendrier (`components/deadlines-panel.tsx` et `app/(app)/calendrier/page.tsx` : filtrage par vue, sections affichées, compteur « en retard », mappage facture → ligne). Dernier point de la revue de dette (« fonctions à extraire et tester »).

**Approach:** déplacer cette logique, telle quelle, dans deux modules purs, `lib/domain/palette.ts` et `lib/domain/calendar-panel.ts`, testés par `node --test` ; les composants et la page les appellent. Aucun changement de comportement ni d'affichage, aucune dépendance, aucune migration.

## Boundaries & Constraints

**Always:** résultat identique à l'existant pour toute entrée ; imports relatifs avec extension `.ts` dans `lib/domain` ; types génériques plutôt qu'imports depuis `app/` (la palette reçoit des « résultats » de formes quelconques) ; `inView`, `groupDeadlines`, `invoiceLines`, `toConfirmLines` et `invoiceBalance` restent la source de leurs règles (réutilisés, non copiés) ; solde de chaque facture calculé une fois.

**Never:** modifier le rendu, les `aria-*`, les classes, les actions serveur, `inView` ou le gantt ; changer le délai de 200 ms, la requête normalisée ou l'appel de recherche ; corriger au passage un autre point de la dette (régions vocales, focus, etc.).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Lignes de la palette | réponse reçue pour la saisie courante (`done`) | notes, puis fiches, puis missions, chacune `{ kind, id, … }` ; sinon liste vide | N/A |
| Raccourci | ⌘K, Ctrl+K, majuscule K | vrai | N/A |
| Pas un raccourci | `k` seul, ⌘J, saisie en composition | faux | N/A |
| Navigation | requête saisie | entrée « assistant » en tête (`search-assistant`), puis les lignes (`search-note-<id>`…) ; `total` = lignes + 1 | N/A |
| Sans requête | pas de requête, pas de ligne | `total` 0, aucun élément actif | N/A |
| Index périmé | `active` 9 pour 3 éléments | ramené au dernier (`current` 2) | N/A |
| Flèches | ↓ au dernier / ↑ au premier ; autre touche ; `total` 0 | retour au premier / au dernier ; aucun déplacement | N/A |
| Entrée | assistant actif / ligne active / rien | « assistant » / la ligne / rien | N/A |
| Texte d'état | réponse reçue avec message / sans résultat / avec résultats / pas encore reçue | le message / « Aucun résultat » / vide / vide | N/A |
| Adresse d'une ligne | note, fiche, mission | `/notes/<id>`, `/clients/<id>`, `/missions/<id>` ; titre de groupe seulement à la première ligne d'un type | N/A |
| Vue « Toutes » | échéances, lignes datées et sans date | toutes ; lignes « À confirmer » (sans date) présentes | N/A |
| Autre vue | Semaine, Mois, Retard, Aujourd'hui | filtrées par `inView` (faites exclues) ; aucune ligne « À confirmer » | N/A |
| Sections | vue Toutes / Retard / autres | En retard + À venir + Faites / En retard seule / À venir seule | N/A |
| Compteur | échéances non faites avant aujourd'hui + lignes datées avant aujourd'hui, **toutes** (pas seulement la vue) | 0 : « Rien en retard. » ; 1 : « 1 élément en retard (échéances et factures). » ; 2 : « 2 éléments… » | N/A |
| Lignes datées | échéance avant / le jour même ou après | En retard / À venir | N/A |
| Texte « À venir » vide | aucune échéance ni ligne du tout / sinon | « Aucune échéance pour l'instant. » / « Rien à venir. » | N/A |
| Factures de la page | facture avec encaissements | `{ id, reference, issued_on, due_on, status, mission }`, statut par `invoiceBalance` | N/A |

</frozen-after-approval>

## Code Map

- `components/search-palette.tsx` -- à alléger : `shown` (l. 96-118), `hasAssistant`, `total`, `current`, `activeResult`, `activeId` (l. 120-131), flèches et Entrée (l. 148-157), `status` (l. 159-161), raccourci (l. 52-60), `ROUTES`, `GROUPS`, `optionId`, `firstOfGroup` (l. 229-232). L'état React, l'effet de 200 ms, `dialog` et le rendu restent.
- `lib/domain/palette.ts` + `palette.test.ts` -- nouveaux ; `lib/domain/search.ts` (`normalizeQuery`, déjà testée) : à réutiliser, pas à toucher.
- `components/deadlines-panel.tsx` -- `visible`, `datedLines`, `undatedLines`, `overdueCount`, sections affichées et texte vide (l. 46-52 et rendu) ; `groupDeadlines`, `inView` viennent de `lib/domain/deadlines.ts` ; état, focus et annonces ne bougent pas.
- `app/(app)/calendrier/page.tsx` -- mappage `invoices.map(...)` vers `invoiceLines` (statut par `invoiceBalance`).
- `lib/domain/calendar-panel.ts` + `calendar-panel.test.ts` -- nouveaux.
- `lib/domain/cockpit/assembly.ts` -- `invoiceViews` ne convient pas (pas de `issued_on`) : ne pas le modifier.
- `_bmad-output/implementation-artifacts/deferred-work.md` -- section 2, « Fonctions à extraire et tester » : retirer la palette et le panneau du calendrier.

## Tasks & Acceptance

**Execution:**
- [x] `lib/domain/palette.ts` -- `isPaletteShortcut`, `paletteItems`, `paletteOptionId`, `paletteNav`, `nextActive`, `enterAction`, `statusText`, `itemHref`, `firstOfGroup`, `GROUP_LABELS` -- code déplacé tel quel
- [x] `lib/domain/palette.test.ts` -- une ligne de test par ligne de la matrice -- comportement figé
- [x] `components/search-palette.tsx` -- appeler ces fonctions -- même rendu
- [x] `lib/domain/calendar-panel.ts` -- `calendarSections`, `overdueText`, `upcomingEmptyText`, `calendarInvoiceInputs` -- code déplacé tel quel
- [x] `lib/domain/calendar-panel.test.ts` -- une ligne de test par ligne de la matrice
- [x] `components/deadlines-panel.tsx`, `app/(app)/calendrier/page.tsx` -- appeler ces fonctions -- même rendu
- [x] `docs/journal.md`, `deferred-work.md` -- journal ; retirer les deux éléments

**Acceptance Criteria:**
- Given `npm test`, then les nouveaux tests passent et les anciens sont inchangés.
- Given une mutation (bouclage des flèches, `+ 1` de l'assistant, « Rien à venir » inversé, `inView` oublié, compteur limité à la vue, groupe d'un type), when les tests tournent, then au moins un échoue.
- Given `tsc --noEmit`, `npm run lint` et `next build` (copie propre), then sans erreur.
- Given `git diff`, then aucun texte affiché ni attribut `aria-*` modifié ; contrôle d'Alex de la palette (⌘K, flèches, Entrée, assistant, « Aucun résultat ») et de `/calendrier` (vues, compteur, sections).

## Implementation Notes

- `lib/domain/palette.ts` (génériques `PaletteItem<N, C, M>`, `paletteNav`, `nextActive`, `enterAction`, `statusText`, `itemHref`, `startsGroup`, `isPaletteShortcut`) et `lib/domain/calendar-panel.ts` (`calendarSections`, `overdueText`, `upcomingEmptyText`, `calendarInvoiceInputs`) ; `search-palette.tsx`, `deadlines-panel.tsx` et `calendrier/page.tsx` les appellent. Écart : `firstOfGroup` renommée `startsGroup` (pas d'alias dans le composant). Après relecture : 18 tests.
- Vérifié : `npm test`, `tsc`, lint, `next build` (copie propre) ; 16 mutations détectées (liste dans le journal). Non couvert : le câblage des composants (quel résultat va dans quelle section), contrôle d'Alex.

## Spec Change Log

## Review Triage Log

Trois relecteurs (Blind Hunter, Edge Case Hunter, Verification Gap).

| # | Constat | Verdict | Preuve / route |
|---|---------|---------|----------------|
| 1 | Bornes des périodes (dimanche, lundi suivant, dernier jour du mois, « Retard » le jour même, faite aujourd'hui) non testées | medium | patch : test ajouté |
| 2 | Alias `firstOfGroup as isFirstOfGroup` puis variable locale du même nom | low | patch : export renommé `startsGroup` |
| 3 | `e.key` indéfini fait lever `isPaletteShortcut` (autoremplissage) | low | defer : comportement d'avant, la spec interdit d'y toucher ; noté dans la dette |
| 4 | Spec périmée, relecture non consignée, espace parasite dans un test | low | patch |
| 5 | Câblage des composants non testé (sections et lignes permutables) | low | defer : déjà couvert par la dette « pas de test de composant » ; contrôle d'Alex |
| 6 | Ligne de dette retirée en entier (parenthèses historiques) | low | rejeté : tout y était résolu, l'historique est dans le journal |
| 7 | Mutations non rejouables | low | rejeté : listées au journal |
| 8 | Ligne payée dans le compteur « en retard » | false | `invoiceLines` ignore les factures payées (`status === "paid"`) |
| 9 | Gardes pour `firstOfGroup` hors liste, `active` négatif, vue inconnue | low | rejeté : inatteignables (appel dans la boucle, index borné par les flèches, vue analysée par `parseDeadlineView`) |
| 10 | `datedLines` filtrées trois fois, casts, onze champs retournés, type d'entrée lâche | low | rejeté : cosmétique ; code déplacé tel quel |

## Verification

**Commands:**
- `npm test` -- expected: tous les lots passent
- `npx tsc --noEmit && npm run lint` -- expected: sans erreur
- Mutations à la main sur les deux modules -- expected: un test échoue à chaque fois, puis restauration
- `next build` dans une copie propre -- expected: passe

**Manual checks (if no CLI):**
- Palette : ⌘K ouvre ; la saisie montre « Demander à l'assistant : … » en tête ; ↓ ↑ bouclent ; Entrée sur l'assistant et sur un résultat ; requête sans résultat : « Aucun résultat ».
- `/calendrier` : vues Toutes, Semaine, Mois, Retard, Aujourd'hui ; compteur « en retard » identique d'une vue à l'autre ; « À confirmer » seulement en Toutes.
