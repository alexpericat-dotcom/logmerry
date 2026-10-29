---
title: 'Dette, lot D2 : formulaires (helpers partagés, récapitulatif d''erreurs, « Plus de champs »)'
type: 'refactor'
created: '2026-10-29'
status: 'in-progress'
baseline_commit: '766fa1da26a903606a21215791747a13c9f79af0'
route: 'dispatch'
review_loop_iteration: 0
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** (1) `field`, `errorLine` et `selectClass` sont recopiés dans onze fichiers (client, contact, échéance, facture, mission, note, encaissement, devis, story, sprint, règle) ; (2) l'`aria-describedby` du champ taxe (encaissement, facture) remplace l'aide par l'erreur au lieu de garder les deux ; (3) EXPERIENCE.md demande, pour un formulaire en erreur, un **récapitulatif d'erreurs en tête, avec liens vers les champs et le focus dessus** (revue d'accessibilité F-17 : focus sur le récapitulatif, pas aussi `role="alert"`) : il n'existe pas ; (4) « Plus de champs » (facture, échéance) ne peut plus se replier tant qu'une erreur est affichée.

**Approach:** un module partagé (`lib/form.ts` pur et `components/form-helpers.tsx`) avec `fieldProps`, `ErrorLine`, `selectClass`, `ErrorSummary` et le repli de « Plus de champs » ; migration de tous les formulaires par petits commits, **mêmes ids, mêmes classes, mêmes attributs** ; récapitulatif en tête pour les formulaires à plusieurs champs (focus au titre du récapitulatif après un envoi refusé, un lien par erreur qui met le focus sur le champ) ; taxe : aide **et** erreur dans `aria-describedby` ; repli : une erreur qui arrive ouvre « Plus de champs », l'utilisateur peut ensuite le replier.

## Boundaries & Constraints

**Always:** aucun changement visible hors le récapitulatif et le focus ; mêmes `id` de champs (`${idPrefix}-${clé}` et `-error`), mêmes `name`, mêmes classes, mêmes `aria-invalid` ; `selectClass` : deux variantes seulement, avec et sans `truncate`, les mêmes utilitaires qu'aujourd'hui ; le récapitulatif n'apparaît que s'il y a au moins une erreur de champ, porte un titre (« N erreur(s) à corriger ») et une liste de liens (texte = le message d'erreur), reçoit le focus après chaque envoi refusé ; les erreurs en ligne des formulaires qui ont le récapitulatif perdent leur `role="alert"` (le focus annonce déjà : pas de double annonce) ; le focus donné à un champ évite l'en-tête fixe du téléphone (`focus({ preventScroll: true })` puis `scrollIntoView({ block: "center" })`, comme dans les encaissements) ; aucune dépendance, aucune migration.

**Never:** changer les champs date (`type="date"`, écart accepté), l'option « Devis déjà lié », les actions serveur ou leurs validations ; ajouter un récapitulatif à `profile-field` (un champ à la fois, message de sauvegarde) ni au formulaire de connexion ; retirer `role="alert"` des messages d'échec généraux (`state.message`) ; modifier le contenu des messages d'erreur.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Attributs d'un champ | clé `title`, préfixe `new`, erreur ou non | `id` `new-title`, `name` `title`, valeur par défaut si donnée ; erreur : `aria-invalid` vrai et `aria-describedby` `new-title-error` | N/A |
| Ligne d'erreur | message présent / absent | `<p id="new-title-error" class="text-sm text-destructive">` / rien | sans `role="alert"` dans les formulaires à récapitulatif |
| Sans erreur | envoi réussi ou formulaire neuf | aucun récapitulatif | N/A |
| Envoi refusé, 2 erreurs | titre et date en erreur | récapitulatif « 2 erreurs à corriger » avec 2 liens, focus sur son titre | N/A |
| Une erreur | 1 champ | « 1 erreur à corriger » | N/A |
| Lien du récapitulatif | clic ou Entrée sur un lien | focus sur le champ visé (sans défilement sous l'en-tête fixe) ; champ caché dans « Plus de champs » : le repli s'ouvre d'abord | champ introuvable : rien |
| Deuxième envoi refusé | mêmes erreurs | le focus revient au récapitulatif | N/A |
| Erreur corrigée | envoi réussi | pas de récapitulatif, formulaire fermé comme avant | N/A |
| Taxe | aide seule / erreur seule / les deux | `aria-describedby` = aide / erreur / `erreur aide` | N/A |
| « Plus de champs » | une erreur arrive dans un champ replié | s'ouvre (`aria-expanded` vrai) ; replier ensuite est possible, l'erreur reste dans le récapitulatif | N/A |
| Message général | `state.message` (échec du serveur) | reste `role="alert"`, pas dans le récapitulatif | N/A |

</frozen-after-approval>

## Code Map

- `components/{client,contact,deadline,invoice,mission,note,payment,story,sprint,rule}-form.tsx`, `components/quotes-section.tsx` -- `field`/`errorLine` recopiés (deux variantes : avec `defaultValue` : contact, story, sprint ; sans : les autres) ; `selectClass` recopié aussi dans `profile-field.tsx` et exporté par `story-form.tsx` (utilisé par `story-list.tsx`, `sprint-block.tsx`, `mission-prompt.tsx`) ; variante `truncate` : facture, échéance.
- `components/invoice-form.tsx` (l. 52-53, 114) et `deadline-form.tsx` (l. 43-44) -- `showMore = more || erreurs` : le bouton ne peut plus replier ; `invoice-form.tsx` l. 114 et `payment-form.tsx` l. 79 : `aria-describedby` de la taxe.
- `components/invoice-payments.tsx` (l. 100-107) -- motif de focus sous l'en-tête fixe (`focus({ preventScroll: true })` + `scrollIntoView({ block: "center" })`) à reprendre.
- `lib/form.ts` + `lib/form.test.ts` -- nouveau, pur : `fieldProps(idPrefix, key, error, defaultValue?)`, `describedBy(...ids)`, `errorSummaryItems(errors, order, idPrefix)`, `summaryTitle(n)`.
- `components/form-helpers.tsx` -- nouveau : `ErrorLine`, `ErrorSummary` (focus après envoi refusé, liens), `useMoreFields`, `focusField`, `selectClass`, `selectClassTruncate` ; `tests/components/form-helpers.test.tsx`.
- `tests/helpers/jsx-hooks.mjs` -- doublures `next/navigation` et `next/link` existantes ; en ajouter si un formulaire migré en demande une autre.
- `_bmad-output/planning-artifacts/ux-designs/.../EXPERIENCE.md` (l. 109, 155, 158) et `review-accessibility.md` (F-17) -- source du récapitulatif.
- `_bmad-output/implementation-artifacts/deferred-work.md` (section 5, « Formulaires ») -- retirer les points résolus ; ajouter ce qui reste (focus perdu après suppression d'un encaissement quand le formulaire d'ajout est ouvert, `addRef` vide).

## Tasks & Acceptance

**Execution:**
- [ ] `lib/form.ts`, `lib/form.test.ts` -- fonctions pures et tests (matrice : attributs, ligne, récapitulatif, taxe) -- une seule source
- [ ] `components/form-helpers.tsx`, `tests/components/form-helpers.test.tsx` -- `ErrorLine`, `ErrorSummary`, `useMoreFields`, `focusField`, `selectClass` -- composants partagés testés
- [ ] migration, un ou deux formulaires par commit (client, mission ; contact, story, sprint ; échéance, facture ; encaissement, devis ; note, règle ; `selectClass` de `profile-field`, `story-list`, `sprint-block`, `mission-prompt`) -- mêmes attributs, récapitulatif en tête, repli de « Plus de champs », taxe
- [ ] `docs/journal.md`, `deferred-work.md` -- journal ; retirer les points résolus

**Acceptance Criteria:**
- Given `npm test`, then les nouveaux tests passent et les anciens sont inchangés.
- Given chaque formulaire migré, then ses `id`, `name`, classes et attributs `aria-*` sont identiques à ceux d'avant hors le récapitulatif et `role="alert"` des erreurs en ligne (comparaison par test de composant pour au moins client, échéance, encaissement et le module partagé).
- Given une mutation (récapitulatif sans focus, lien sans focus du champ, `aria-describedby` de la taxe sans l'aide, repli qui reste forcé, erreur en ligne sans `aria-invalid`), when les tests tournent, then au moins un échoue.
- Given `tsc --noEmit`, `npm run lint` et `next build` (copie propre), then sans erreur.
- Given l'application, then chaque formulaire s'affiche comme avant ; un envoi invalide montre le récapitulatif avec le focus dessus, ses liens mènent aux champs (contrôle d'Alex).

## Implementation Notes

## Spec Change Log

## Review Triage Log

## Verification

**Commands:**
- `npm test` -- expected: tous les lots passent
- `npx tsc --noEmit && npm run lint` -- expected: sans erreur
- Mutations à la main sur `lib/form.ts` et `form-helpers.tsx` -- expected: un test échoue à chaque fois, puis restauration
- `next build` dans une copie propre -- expected: passe

**Manual checks (if no CLI):**
- Nouveau client sans nom, nouvelle échéance sans date, nouvel encaissement sans montant, facture sans mission : le récapitulatif s'affiche en tête avec le focus ; cliquer un lien met le focus sur le champ ; corriger et enregistrer ferme le formulaire.
- Facture ou échéance : une erreur dans un champ de « Plus de champs » ouvre le bloc ; le bouton le referme.
- Au clavier : Tab depuis le récapitulatif atteint les liens, Entrée sur un lien atteint le champ ; lecteur d'écran : le récapitulatif est annoncé une fois (pas aussi chaque erreur en ligne).

## Review Triage Log (29 octobre 2026, 3 relecteurs)

Corrigés : id du titre du récapitulatif en double entre formulaires sans préfixe (`useId`) ; commentaire d'ordre des erreurs (ordre du serveur) ; piège de `useMoreFields` documenté (passer `state.errors`, jamais `state.errors ?? {}`) ; test du message général (`role="alert"`, hors récapitulatif).
Reportés (dette) : lien du récapitulatif mort quand le champ n'existe pas (mission avec client fixé, paramètre de règle masqué, panneau « nouveau client » de la note refermé : le message reste lisible dans le récapitulatif) ; ordre des liens = ordre du serveur ; pas de test du récapitulatif pour mission, contact, story, sprint, devis, facture, règle (`idOf` des règles), ni du repli et de la taxe de la facture.
Rejetés : retrait de `role="alert"` des lignes en ligne (décision de la spec, revue F-17 : le focus annonce) ; `rAF` non annulé (`?.` suffit) ; `aria-describedby` vers une ligne absente (identique à avant) ; `FormData` de jsdom ; ouverture de « Plus de champs » au clic d'une erreur visible (inoffensif).
