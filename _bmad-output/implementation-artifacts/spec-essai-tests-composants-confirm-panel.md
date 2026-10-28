---
title: 'Essai de tests de composants : ConfirmPanel'
type: 'chore'
created: '2026-10-28'
status: 'in-progress'
baseline_commit: 'b9574e03ead8200040bceb1bdc7ab03feb0da84e'
route: 'dispatch'
review_loop_iteration: 0
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** le contrat de `ConfirmPanel` (focus sur « Annuler », Échap, `stopEscape`, `aria-disabled` pendant l'action, erreur annoncée) est partagé par onze appelants et n'est vérifié qu'à la main dans Chrome ; une régression y touche onze écrans.

**Approach:** essai limité à ce seul composant : `jsdom` et Testing Library en dépendances de développement, un chargeur JSX fondé sur `typescript` (déjà installé : pas d'esbuild), un lot `test:components` branché sur `npm test` donc sur la CI. À la fin, mesurer et rapporter le coût réel (dépendances, taille d'installation, durée) pour que le propriétaire décide d'étendre ou non.

## Boundaries & Constraints

**Always:** `node --test` reste le lanceur (pas de Vitest, pas de Jest) ; le composant et ses appelants ne changent pas ; dépendances de développement seulement (`jsdom`, `@testing-library/react`, `@testing-library/dom`, `@testing-library/user-event`), versions exactes lues au moment de l'installation ; le coût mesuré (paquets ajoutés, `du -sh node_modules` avant et après, durée du lot, durée de `npm ci`) est écrit dans le journal.

**Never:** tester d'autres composants dans cet essai ; ajouter une dépendance hors de la liste ; toucher aux lots `lib`, `actions`, `retrieval` ni à leurs chargeurs ; instantanés (snapshots) ou assertions sur les classes CSS.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Ouverture | panneau rendu | « Annuler » a le focus ; groupe nommé par `label` | N/A |
| Échap | `pending` faux | `onCancel` appelé une fois | N/A |
| Échap pendant l'action | `pending` vrai | `onCancel` non appelé | N/A |
| `stopEscape` | Échap dans un parent qui lit la touche | parent non averti si `stopEscape`, averti sinon | N/A |
| Clic « Annuler » | `pending` faux / vrai | `onCancel` appelé / non appelé ; « Annuler » garde le focus et `aria-disabled="true"` quand `pending` | N/A |
| Confirmer (`onConfirm`) | envoi du formulaire, `pending` faux / vrai | `onConfirm` appelé une fois, sans envoi natif / non appelé ; libellé = `pendingLabel` quand `pending` ; `aria-disabled` | N/A |
| Confirmer (`action`) | `pending` vrai | bouton de confirmation `disabled` | N/A |
| Erreur | `error="Échec"` | message dans un `role="alert"` ; absent sans `error` | N/A |
| Description | avec / sans `children` | `aria-describedby` pointe vers le texte / absent | N/A |

</frozen-after-approval>

## Code Map

- `components/confirm-panel.tsx` -- composant testé (client, `useEffect` pour le focus, `onKeyDown` du formulaire) ; ne pas modifier.
- `components/ui/button.tsx` -- dépendance du composant (cva, Radix Slot) ; chargée telle quelle.
- `tests/helpers/ts-hooks.mjs` -- chargeur existant (alias `@/`, `server-only` vide) : à réutiliser pour `resolve`.
- `tests/helpers/register.mjs`, `register-actions.mjs` -- modèles d'enregistrement d'un chargeur.
- `tsconfig.json` -- `jsx: "react-jsx"` : même transformation pour le chargeur (`ts.transpileModule`).
- `package.json` -- `npm test` enchaîne `lib`, `test:actions`, (`test:retrieval` sur la branche de la PR #65 : ajouter le nouveau lot sans le défaire).
- `.github/workflows/ci.yml` -- lance `npm test` : aucun changement attendu.

## Tasks & Acceptance

**Execution:**
- [ ] `package.json` -- ajouter les 4 dépendances de développement et le script `test:components`, l'enchaîner dans `npm test` -- la CI le lance
- [ ] `tests/helpers/jsx-hooks.mjs`, `tests/helpers/register-components.mjs` -- chargeur : `resolve` de `ts-hooks.mjs`, `load` des `.tsx` par `ts.transpileModule` (JSX automatique, modules ES) -- JSX sans nouvelle dépendance
- [ ] `tests/helpers/dom.ts` -- installe jsdom sur `globalThis` (window, document, navigator, éléments, `IS_REACT_ACT_ENVIRONMENT`) -- à importer en premier par le test
- [ ] `tests/components/confirm-panel.test.tsx` -- une ligne de test par ligne de la matrice, user-event pour clavier et clic -- contrat vérifié
- [ ] `docs/journal.md`, `_bmad-output/implementation-artifacts/deferred-work.md` -- coût mesuré, constat, point « pas de test de composant » mis à jour selon le résultat

**Acceptance Criteria:**
- Given une installation propre (`npm ci`), when `npm test` tourne, then le lot de composants passe sans réseau.
- Given une mutation du composant (retirer `if (stopEscape) e.stopPropagation()`, ou le `!pending` du clic « Annuler », ou le focus initial), when le lot tourne, then au moins un test échoue.
- Given `tsc --noEmit`, `npm run lint` et `npx next build`, then sans erreur (les tests `.tsx` sont compris par le type-check).
- Given les 11 appelants, then aucun fichier d'application modifié.

## Implementation Notes

## Spec Change Log

## Review Triage Log

## Verification

**Commands:**
- `npm test` -- expected: tous les lots passent, dont `tests/components`
- `npx tsc --noEmit && npm run lint && npx next build` -- expected: sans erreur (build dans une copie propre si `next dev` tourne)
- Trois mutations à la main sur `components/confirm-panel.tsx` -- expected: un test échoue à chaque fois, puis `git checkout` du fichier
- Mesure : `du -sh node_modules` avant et après, `npm ls --all` (paquets ajoutés), durée de `npm run test:components` -- expected: chiffres consignés dans le journal
