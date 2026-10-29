---
title: 'Extraction et tests de la garde d''accès (proxy) et de la route /auth/confirm'
type: 'chore'
created: '2026-10-29'
status: 'done'
baseline_commit: 'eba7cfb677c26798f0d5d5a8cb2499892a3dfb28'
route: 'dispatch'
review_loop_iteration: 0
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** deux morceaux décident de l'accès sans aucun test : la garde du proxy (`/` → cockpit ou connexion ; hors `/auth` et sans session → connexion), noyée dans `updateSession` avec le client Supabase et les cookies, et la route `/auth/confirm` (échange du code contre une session, puis redirection).

**Approach:** extraire la décision du proxy en fonction pure `accessDecision(pathname, signedIn)` dans `lib/auth.ts` (à côté de `safeNext`, déjà testé), appelée par `updateSession` ; tester la route `/auth/confirm` telle quelle avec le harnais d'actions (doublures de Supabase et de `redirect`), sans extraction. Aucun changement de comportement, aucune dépendance.

## Boundaries & Constraints

**Always:** `updateSession` garde le client Supabase, `getClaims()` juste après sa création, la copie des cookies sur la redirection de `/` et le renvoi de `supabaseResponse` tel quel ; la décision rend les mêmes chemins qu'aujourd'hui pour toute entrée ; la route redirige toujours hors du `try` ; un échec d'échange, une exception ou un code absent mènent à `/auth/error`.

**Never:** durcir la règle des préfixes (`startsWith("/login")`, `startsWith("/auth")` sans barre finale : décision d'Alex, notée dans la dette) ; toucher au `matcher` de `proxy.ts` ; déplacer la logique de la route ; modifier une action existante ou ses tests.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Racine connecté | `/`, session | redirection vers `/aujourd-hui` | N/A |
| Racine déconnecté | `/`, sans session | redirection vers `/auth/login` | N/A |
| Page privée déconnecté | `/clients`, `/missions/abc`, sans session | redirection vers `/auth/login` | N/A |
| Page privée connecté | `/clients`, session | passe (`next`) | N/A |
| Pages publiques | `/auth/login`, `/auth/confirm`, `/auth/error`, `/login`, sans session | passe | N/A |
| Confirmation réussie | `?code=abc&next=/auth/update-password` | `exchangeCodeForSession("abc")` ; redirection vers `/auth/update-password` | N/A |
| Sans `next` | `?code=abc` | redirection vers `/` | N/A |
| `next` dangereux | `?code=abc&next=//evil.com` ou `https://evil.com` ou `/a\b` | redirection vers `/` | jamais l'adresse reçue |
| Code absent | pas de `code` | `/auth/error`, aucun échange | N/A |
| Échange refusé | `exchangeCodeForSession` renvoie `error` | `/auth/error`, même avec un `next` valide | N/A |
| Échange qui lève | exception (réseau) | `/auth/error` | pas de plantage |
| Client impossible | `createClient()` lève | `/auth/error` | pas de plantage |

</frozen-after-approval>

## Code Map

- `lib/supabase/proxy.ts` -- `updateSession` : lignes de décision (`/` puis garde) à remplacer par un appel ; le reste (client, `getClaims`, cookies, redirections) ne change pas.
- `lib/auth.ts` + `lib/auth.test.ts` -- accueille `accessDecision` ; modèle des tests (relatifs, `node --test`).
- `app/auth/confirm/route.ts` -- `GET` testé tel quel ; utilise `createClient`, `safeNext`, `redirect`.
- `tests/helpers/harness.ts` -- client factice : `auth` n'a pas `exchangeCodeForSession` (ajouter une entrée `fake.exchange` : appels notés, réponse ou exception posée, remise à zéro dans `reset()`).
- `tests/helpers/stubs/next-navigation.ts`, `supabase-server.ts` -- `redirect` lève `Redirect(url)` ; `createClient` peut échouer (`fake.failCreate`) : à réutiliser.
- `tests/actions/*.test.ts` -- modèle (`withHarness`, `fake`) ; `npm run test:actions` lance `tests/actions/*.test.ts`.

## Tasks & Acceptance

**Execution:**
- [x] `lib/auth.ts` -- ajouter `accessDecision(pathname, signedIn)` (`{ action: "next" }` ou `{ action: "redirect", to }`), code déplacé tel quel -- décision testable
- [x] `lib/auth.test.ts` -- cas de la matrice du proxy -- comportement figé
- [x] `lib/supabase/proxy.ts` -- appeler `accessDecision` ; cookies copiés sur la redirection de `/` comme avant -- même comportement
- [x] `tests/helpers/harness.ts` -- `fake.exchange` et `auth.exchangeCodeForSession` -- la route devient testable
- [x] `tests/actions/auth-confirm.test.ts` -- cas de la matrice de la route -- contrat figé
- [x] `docs/journal.md`, `_bmad-output/implementation-artifacts/deferred-work.md` -- retirer « la route `/auth/confirm` et le garde du proxy » des fonctions à tester ; noter la règle des préfixes (`/authors`, `/login-x` passent sans session, sans effet aujourd'hui : aucune route de ce nom, la RLS protège les données)

**Acceptance Criteria:**
- Given `npm test`, then les nouveaux tests passent et les anciens sont inchangés.
- Given une mutation (retirer `!user`, inverser la cible de `/`, ne pas rediriger quand `ok` est faux, ignorer `safeNext`, retirer le `try`), when les tests tournent, then au moins un échoue.
- Given `tsc --noEmit`, `npm run lint` et `next build` (copie propre), then sans erreur.
- Given le proxy, then un parcours dans le navigateur reste identique : `/` connecté → cockpit, déconnecté → connexion, page privée déconnecté → connexion (contrôle d'Alex).

## Implementation Notes

- `accessDecision` dans `lib/auth.ts` ; `updateSession` l'appelle, la copie des cookies reste réservée à la redirection de `/` (comportement d'origine). Harnais : `fake.exchange` et `auth.exchangeCodeForSession`, plus `next/server` en module vide (la route l'importe pour un type effacé, que Node ne résout pas sans extension). Cas ajoutés après relecture : caractères de contrôle dans `next`, `error: undefined`, `next` vide, caractérisation des préfixes. 4 + 8 tests nouveaux.
- Écarts avec la spec : la doublure `next/server` (non prévue) ; le cas `evil.com` sans schéma ajouté à la matrice ; la caractérisation des préfixes figés (la spec disait seulement de ne pas les durcir).
- Vérifié : `npm test`, `tsc`, lint, `next build` (copie propre) ; six mutations détectées ; la copie des cookies et le câblage de `updateSession` (inversion de `!!user`) ne sont couverts par aucun test.

## Spec Change Log

## Review Triage Log

Trois relecteurs (Blind Hunter, Edge Case Hunter, Verification Gap).

| # | Constat | Verdict | Preuve / route |
|---|---------|---------|----------------|
| 1 | Caractères de contrôle dans `next` non testés côté route | medium | patch : `\r\n` et `\u0000` ajoutés |
| 2 | Échange réussi avec `error: undefined` non testé (`!error` → `=== null` passerait) | medium | patch : test ajouté |
| 3 | Test « lève ou client impossible » mêlait deux cas, sans vérifier l'échange tenté | medium | patch : deux tests, `codes` vérifié dans chacun |
| 4 | Préfixes `/authors`, `/login-x` : aucun test ne les fige | medium | patch : test de caractérisation signalé « à resserrer » ; un futur durcissement devient une décision visible |
| 5 | Câblage de `updateSession` (`!!user`, branche de redirection) sans test : une inversion passerait `npm test` | medium | defer : déjà dans la dette (exclu par la spec) ; remède : doublures de `@supabase/ssr` et `next/server` + `tests/actions/proxy.test.ts` ; filet actuel : RLS et contrôle d'Alex |
| 6 | Copie des cookies liée à `pathname === "/"` hors de la décision | low | defer (dette) : comportement d'origine, commentaire ajouté |
| 7 | Doublure `next/server` vide pourrait masquer un usage futur | low | rejeté : un import nommé d'un module sans export échoue bruyamment au chargement (pas `undefined`) |
| 8 | `import type` dans la route éviterait la doublure | low | rejeté : modifier la route est hors du périmètre ; la doublure est documentée |
| 9 | Faux `exchangeCodeForSession` plus pauvre que le vrai (`data`) | low | rejeté : la route ne lit que `error` |
| 10 | Format du bloc de dette, ligne vide du journal | low | rejeté : même format que les autres entrées différées, les entrées du journal sont déjà séparées ainsi |
| 11 | Spec périmée, écarts non consignés | low | patch (cette mise à jour) |
| 12 | `matcher`, requête dans l'adresse, `code` très long non testés | low | rejeté : `matcher` et chemin sans requête déjà dans la dette ; code long sans effet |

## Verification

**Commands:**
- `npm test` -- expected: tous les lots passent
- `npx tsc --noEmit && npm run lint` -- expected: sans erreur
- Mutations à la main (`lib/auth.ts`, `app/auth/confirm/route.ts`) -- expected: un test échoue à chaque fois, puis restauration
- `next build` dans une copie propre -- expected: passe

**Manual checks (if no CLI):**
- Déconnecté, ouvrir `/clients` puis `/` : connexion dans les deux cas ; connecté, `/` : cockpit.
