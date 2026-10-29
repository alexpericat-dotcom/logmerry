---
title: 'Resserrer les préfixes publics de la garde d''accès'
type: 'bugfix'
created: '2026-10-29'
status: 'in-progress'
baseline_commit: '505cbf6150b97f9da11a2f866b7a98205ba5ae46'
route: 'dispatch'
review_loop_iteration: 0
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** `accessDecision` (`lib/auth.ts`) laisse passer sans session tout chemin qui COMMENCE par `/auth` ou `/login` : `/authors`, `/auth-x`, `/login-x` sont publics par accident (sans effet aujourd'hui : aucune route de ce nom, la RLS protège les données). Décision d'Alex du 29 octobre 2026 : resserrer.

**Approach:** n'est public que le chemin exact `/auth` ou un chemin sous `/auth/`. `/login` n'existe pas (la page est `/auth/login`) : son exemption disparaît ; sans session, `/login` mène à la connexion au lieu d'une page 404 publique. Le test de caractérisation de la dette est remplacé par des tests de la règle resserrée.

## Boundaries & Constraints

**Always:** les cinq pages publiques restent accessibles sans session (`/auth/login`, `/auth/forgot-password`, `/auth/update-password`, `/auth/error`, `/auth/confirm`) ; `/` et les pages privées se comportent comme avant (avec ou sans session) ; le chemin est celui de `nextUrl.pathname` (sans requête, déjà normalisé par l'analyseur d'adresses : `..` résolu) ; la distinction majuscules/minuscules est celle de Next (`/AUTH/login` n'est pas une route).

**Never:** toucher au `matcher` de `proxy.ts` (images, `favicon.ico` déjà exclues) ni à la copie des cookies de `updateSession` ; ajouter une liste de pages publiques à entretenir (le préfixe `/auth/` suffit) ; modifier les pages de connexion.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Pages d'authentification | `/auth/login`, `/auth/forgot-password`, `/auth/update-password`, `/auth/error`, `/auth/confirm`, sans session | passe | N/A |
| Racine d'`/auth` | `/auth`, `/auth/`, sans session | passe | N/A |
| Faux amis de `/auth` | `/authors`, `/auth-x`, `/authx/login`, `/authentification`, sans session | redirection vers `/auth/login` | N/A |
| `/login` supprimé | `/login`, `/login/x`, `/login-x`, sans session | redirection vers `/auth/login` | N/A |
| Casse | `/AUTH/login`, sans session | redirection vers `/auth/login` | N/A |
| Avec session | tous les chemins ci-dessus | passe (sauf `/` : cockpit) | N/A |
| Inchangé | `/`, `/clients`, `/missions/abc`, `/api/chat`, avec ou sans session | comme avant | N/A |

</frozen-after-approval>

## Code Map

- `lib/auth.ts` -- `accessDecision` : ligne 18 (`startsWith("/login") … startsWith("/auth")`) et son commentaire (lignes 12-15) à resserrer.
- `lib/auth.test.ts` -- test « FIGÉ TEL QUEL » (lignes 71-74) à remplacer ; test des pages publiques (ligne 65) : retirer `/login`, ajouter `/auth` et `/auth/`.
- `lib/supabase/proxy.ts` -- commentaire ligne 46 (« Hors `/login` et `/auth` ») à mettre à jour ; aucun changement de code.
- `app/auth/*` -- les cinq routes publiques réelles (`confirm`, `error`, `forgot-password`, `login`, `update-password`) : aucune route `/login`.
- `_bmad-output/implementation-artifacts/deferred-work.md` -- section 4, entrée « Garde d'accès » : retirer la partie préfixes, garder cookies et `matcher`.

## Tasks & Acceptance

**Execution:**
- [ ] `lib/auth.ts` -- public = `pathname === "/auth" || pathname.startsWith("/auth/")` ; commentaire à jour -- plus de faux amis
- [ ] `lib/auth.test.ts` -- remplacer le test de caractérisation et celui des pages publiques selon la matrice -- règle figée telle que décidée
- [ ] `lib/supabase/proxy.ts` -- commentaire seulement
- [ ] `docs/journal.md`, `deferred-work.md` -- journal ; retirer les préfixes de la dette

**Acceptance Criteria:**
- Given `npm test`, then les tests de la matrice passent et aucun autre test ne change.
- Given une mutation (revenir à `startsWith("/auth")`, retirer `/auth/`, retirer l'égalité `/auth`), when les tests tournent, then au moins un échoue.
- Given `tsc --noEmit`, `npm run lint` et `next build` (copie propre), then sans erreur.
- Given un navigateur sans session, then `/auth/login` s'affiche, `/authors` et `/login` mènent à la connexion ; avec session, `/` mène au cockpit (contrôle d'Alex).

## Implementation Notes

## Spec Change Log

## Review Triage Log

## Verification

**Commands:**
- `npm test` -- expected: tous les lots passent
- `npx tsc --noEmit && npm run lint` -- expected: sans erreur
- Mutations à la main sur `lib/auth.ts` -- expected: un test échoue à chaque fois, puis restauration
- `next build` dans une copie propre -- expected: passe

**Manual checks (if no CLI):**
- Navigation privée : `/auth/login` s'affiche ; `/authors` et `/login` redirigent vers la connexion. Le lien de réinitialisation du mot de passe (e-mail réel, déjà noté dans la dette) passe par `/auth/confirm` puis `/auth/update-password` : à reverifier au premier vrai e-mail.
