---
title: 'Dette, lot B : sécurité de l''accès (proxy, matcher, 401 de l''API)'
type: 'bugfix'
created: '2026-10-29'
status: 'in-progress'
baseline_commit: '5f75fa2a21d21942f2050539b007838cc9541c48'
route: 'dispatch'
review_loop_iteration: 0
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** (1) le câblage de `updateSession` (décision, redirection, cookies) n'est couvert par aucun test : une inversion de `!!user` passerait `npm test` ; le `matcher` de `proxy.ts` non plus ; (2) sans session, `/api/chat` reçoit une redirection 307 vers la page de connexion (le proxy redirige tout chemin non public) : le client ne reçoit pas de JSON et affiche « L'assistant n'a pas pu répondre » au lieu de dire que la session a expiré.

**Approach:** (1) un lot de tests `test:proxy` (doublures de `@supabase/ssr` et `next/server`) qui prouve le câblage, plus un test du `matcher` lu dans `proxy.ts` ; (2) `accessDecision` rend une nouvelle action `unauthorized` pour `/api/…` sans session ; le proxy y répond 401 JSON ; le client du chat affiche « Ta session a expiré. Recharge la page pour te reconnecter. » sur un 401 (logique pure, testée). Pages et `/` : inchangés.

## Boundaries & Constraints

**Always:** les redirections des pages et de `/` restent identiques (dont la copie des cookies **seulement** sur la redirection de `/`) ; `getClaims()` reste appelé juste après la création du client, avant toute décision ; `/api/…` avec session passe ; le 401 du proxy ne contient ni détail interne ni cookie ; la route `/api/chat` garde sa propre vérification de session ; messages en français.

**Never:** changer le `matcher` lui-même ni sa forme (Next exige un littéral analysable : on le LIT dans le fichier, on ne l'importe pas d'ailleurs) ; ajouter une dépendance ; toucher à la logique de réponse du chat ; rendre public un chemin `/api/…`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| API sans session | `/api/chat`, déconnecté | action `unauthorized` ; le proxy répond 401 `{ error: "…session…" }` en JSON, sans redirection | N/A |
| API avec session | `/api/chat`, connecté | passe | N/A |
| Faux ami d'`/api` | `/apiary`, déconnecté | redirection vers `/auth/login` (pas une API) | N/A |
| Racine déconnecté / connecté | `/` | redirection `/auth/login` / `/aujourd-hui`, cookies du client copiés sur la redirection | N/A |
| Page privée déconnecté | `/clients` | redirection `/auth/login`, cookies **non** copiés (comportement d'origine) | N/A |
| Page publique | `/auth/login`, déconnecté | passe : le proxy rend la réponse `next` telle quelle | N/A |
| Ordre | n'importe quel chemin | `getClaims` appelé avant toute décision, une seule fois | N/A |
| Cookies rafraîchis | le client pose un cookie via `setAll` | présent sur la réponse rendue (cas « passe ») | N/A |
| `matcher` : exclus | `/icon.svg`, `/a.png`, `/favicon.ico`, `/_next/static/x.js`, `/_next/image` | non traités | N/A |
| `matcher` : traités | `/`, `/clients`, `/auth/login`, `/api/chat` | traités | N/A |
| Client du chat | réponse 401 / autre erreur avec `error` / sans JSON | message de session expirée / le message du serveur / message générique | N/A |

</frozen-after-approval>

## Code Map

- `lib/auth.ts` -- `accessDecision` : ajouter `{ action: "unauthorized" }` pour `/api` et `/api/…` sans session ; type `AccessDecision` ; `lib/auth.test.ts` : cas de la matrice (remplace le test `/api/chat` redirigé).
- `lib/supabase/proxy.ts` -- `updateSession` : ajouter la branche `unauthorized` (`NextResponse.json({ error }, { status: 401 })`) ; le reste inchangé ; `proxy.ts` -- `config.matcher` (littéral) à lire dans le test.
- `app/api/chat/route.ts` -- 401 propre déjà prévu (« Connecte-toi pour utiliser l'assistant. ») : inchangé.
- `components/assistant-provider.tsx` (l. 87-92) -- `if (!res.ok || !json?.answer) throw new Error(json?.error ?? GENERIC_ERROR)` : le message vient d'une fonction pure `chatErrorMessage(status, json)` à extraire dans `lib/domain/chat-flow.ts` (ou module voisin) et tester.
- `tests/helpers/` -- chargeur existant `ts-hooks.mjs` (alias `@/`) ; nouveau `register-proxy.mjs` / `proxy-hooks.mjs` avec doublures de `@supabase/ssr` et `next/server` ; `tests/proxy/*.test.ts` ; script `test:proxy` enchaîné dans `npm test`.
- `_bmad-output/implementation-artifacts/deferred-work.md` -- section 1 : retirer « À faire par Alex avant de relancer les tests réels… » (comptes créés, `test:isolation` 127/127) ; section 4 « Garde d'accès » : retirer ce qui est résolu (câblage, cookies, `matcher`, 401).

## Tasks & Acceptance

**Execution:**
- [ ] `lib/auth.ts`, `lib/auth.test.ts` -- action `unauthorized` pour `/api` sans session ; cas de la matrice -- décision pure testée
- [ ] `tests/helpers/proxy-hooks.mjs`, `register-proxy.mjs`, `tests/proxy/proxy.test.ts`, `package.json` -- doublures et `test:proxy` : décision câblée, cibles, cookies uniquement sur `/`, ordre, 401 JSON, cookies rafraîchis -- câblage prouvé
- [ ] `tests/proxy/matcher.test.ts` -- lire le littéral dans `proxy.ts` et le tester (modèle `^…$` ; approximation du convertisseur de Next, notée) -- exclusions et inclusions
- [ ] `lib/supabase/proxy.ts` -- branche `unauthorized` -- 401 JSON
- [ ] `lib/domain/chat-flow.ts` (+ test), `components/assistant-provider.tsx` -- `chatErrorMessage` -- message de session expirée
- [ ] `docs/journal.md`, `deferred-work.md` -- journal ; retirer les points résolus

**Acceptance Criteria:**
- Given `npm test`, then les nouveaux tests passent, les anciens sont inchangés.
- Given une mutation (`!!user` inversé, branche de redirection retirée, cookies copiés sur toutes les redirections, `getClaims` après la décision, `unauthorized` retiré, `/api` préfixe sans barre, `matcher` sans `favicon.ico`, 401 ignoré par le client), when les tests tournent, then au moins un échoue.
- Given `tsc --noEmit`, `npm run lint` et `next build` (copie propre), then sans erreur.
- Given un navigateur (fenêtre privée), then `/auth/login` et les pages se comportent comme avant ; une session expirée dans le chat affiche « Ta session a expiré… » (contrôle d'Alex).

## Implementation Notes

## Spec Change Log

## Review Triage Log

## Verification

**Commands:**
- `npm test` -- expected: tous les lots passent, dont `test:proxy`
- `npx tsc --noEmit && npm run lint` -- expected: sans erreur
- Mutations à la main -- expected: un test échoue à chaque fois, puis restauration
- `next build` dans une copie propre -- expected: passe (le `matcher` reste analysable)

**Manual checks (if no CLI):**
- Fenêtre privée : `/clients` et `/` → connexion. Connecté dans l'application, ouvrir l'assistant, se déconnecter dans un autre onglet, poser une question : « Ta session a expiré. Recharge la page pour te reconnecter. »
