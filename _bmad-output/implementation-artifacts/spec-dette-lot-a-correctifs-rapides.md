---
title: 'Dette, lot A : correctifs rapides'
type: 'bugfix'
created: '2026-10-29'
status: 'done'
baseline_commit: 'cbf7427b1efac3e7e2a3445c662a541688b557f0'
route: 'dispatch'
review_loop_iteration: 0
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** cinq petits points de `deferred-work.md`, tous vérifiés dans le code : (1) `isPaletteShortcut` lève sur un `keydown` sans `key` (autoremplissage) ; (2) `updateStory` réécrit toujours le statut du formulaire d'édition resté ouvert, ce qui annule un changement fait entre-temps par le menu de statut ; (3) `tax_cents` indéfini (au lieu de `null`) n'est pas compté comme « taxe manquante » (plafonds, solde d'une facture) ; (4) le test d'isolation « historique » date la question à `Date.now() - 1000` : il échoue quand l'horloge locale avance de plus d'une seconde sur celle de la base ; (5) la connexion aux comptes de test est recopiée dans six fichiers.

**Approach:** un petit commit par point. (1) `e.key?.toLowerCase()`. (2) le formulaire d'édition envoie aussi le statut qu'il a reçu (`initial_status`, champ caché) ; `updateStory` n'écrit le statut que s'il a été changé dans le formulaire (différent de `initial_status`), sinon le statut du menu reste. (3) `== null`. (4) la question est datée une seconde avant la réponse **lue dans la base** (`created_at` de la réponse), sans l'horloge locale. (5) un `signInTestAccount(who)` dans `tests/helpers/accounts.ts`, utilisé par les six fichiers.

## Boundaries & Constraints

**Always:** aucun changement visible, sauf la correction (2) : le formulaire d'édition garde son champ « Statut », et un statut choisi dans le formulaire l'emporte toujours ; sans `initial_status` (ancien formulaire), `updateStory` écrit le statut comme avant ; messages d'erreur de connexion (« TEST NON CONCLUANT… ») et garde des comptes (`@example.com`, TEST ≠ DEMO, A ≠ B) conservés ; aucune dépendance, aucune migration.

**Never:** toucher aux deux scripts de démonstration (`scripts/seed-demo*.ts` : ils visent le compte de démo, pas les comptes de test) ; lancer `test:rag` ou `test:proposals` (appels d'IA payants : type-check seulement, sauf accord d'Alex) ; corriger les deux autres points de la ligne « Règles et profil » (`usableRule` et `parseParams`, `missingFields` et statut ou catégorie préremplis : pas de correctif trivial, ils restent en dette) ; lire `.env.test.local`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Raccourci sans `key` | `keydown` sans `key` | faux, pas d'exception | N/A |
| Édition, statut intact | formulaire `status` = `initial_status` ; le menu a changé le statut entre-temps | titre, rôle… enregistrés, statut de la base **inchangé** (aucun `status` dans la mise à jour) | N/A |
| Édition, statut changé | formulaire `status` ≠ `initial_status` | statut du formulaire écrit | statut invalide : erreur de validation comme avant |
| Ancien formulaire | pas d'`initial_status` | statut écrit comme avant | N/A |
| Taxe indéfinie | encaissement `tax_cents` `undefined`, base TTC | compté « taxe manquante » (`paymentsMissingTax` +1, `minimum` vrai) et pour le solde d'une facture ; `null` inchangé | N/A |
| Historique | réponse insérée ; question datée 1 s avant le `created_at` lu de la réponse | ordre question puis réponse, quelle que soit l'horloge locale | N/A |
| Connexion de test | compte A ou B valide / mot de passe faux / compte de démo | session ouverte / « TEST NON CONCLUANT : connexion X impossible » / refus de `testAccount` | N/A |

</frozen-after-approval>

## Code Map

- `lib/domain/palette.ts` -- `isPaletteShortcut` (`e.key.toLowerCase()`) ; `palette.test.ts` : cas `key` absent.
- `app/(app)/missions/story-actions.ts` -- `updateStory` (l. 149-156) écrit `value` (statut compris) ; `setStoryStatus` (menu) écrit seul le statut ; `readValues`, `save`.
- `components/story-form.tsx` -- champ `status` (l. 105-113), `initial` ; `components/story-list.tsx` (l. 94-105) : formulaire d'édition ; l'ajout manuel et la proposition ne passent pas `initial`.
- `tests/actions/stories.test.ts` -- bloc « updateStory / setStoryStatus » (l. 112) : cas à ajouter.
- `lib/domain/finance/ceilings.ts` (l. 112) et `lib/domain/payments.ts` (l. 89) -- `p.tax_cents === null` ; tests `ceilings.test.ts`, `payments.test.ts`.
- `tests/isolation.test.ts` -- l. 413-429 : `Date.now() - 1000` ; la réponse `mA` est insérée plus haut avec `.select("id")`.
- `tests/helpers/accounts.ts` -- `testAccount` (garde) ; `tests/{purge,leak-assistant,leak-search,isolation}.test.ts`, `tests/{rag-run,proposals-run}.ts` -- six copies de `signIn`.

## Tasks & Acceptance

**Execution:**
- [x] `lib/domain/palette.ts`, `palette.test.ts` -- `?.` + test -- (1)
- [x] `story-form.tsx`, `story-actions.ts`, `stories.test.ts` -- champ caché `initial_status` quand `initial` existe ; `updateStory` n'écrit le statut que s'il a changé ; trois cas (intact, changé, sans `initial_status`) -- (2)
- [x] `ceilings.ts`, `payments.ts` et leurs tests -- `== null` ; cas `undefined` -- (3)
- [x] `tests/isolation.test.ts` -- lire le `created_at` de la réponse, dater la question une seconde avant -- (4)
- [x] `tests/helpers/accounts.ts` et les six fichiers -- `signInTestAccount(who)` (client Supabase connecté, identifiant de l'utilisateur) -- (5)
- [x] `docs/journal.md`, `deferred-work.md` -- journal ; retirer les points résolus (garder `usableRule` et `missingFields`)

**Acceptance Criteria:**
- Given `npm test`, then les nouveaux tests passent et les anciens sont inchangés.
- Given une mutation (retirer `?.` ; écrire toujours le statut ; revenir à `=== null` ; ignorer `initial_status`), when les tests tournent, then au moins un échoue.
- Given `npm run test:isolation` (comptes de test réels) et `npm run test:leak`, then tous passent ; `test:rag` et `test:proposals` : `tsc` seulement.
- Given `tsc --noEmit`, `npm run lint` et `next build` (copie propre), then sans erreur.
- Given l'application, then le formulaire d'édition d'une story s'affiche comme avant ; ouvrir l'édition, changer le statut par le menu, enregistrer le formulaire : le statut du menu est conservé (contrôle d'Alex).

## Implementation Notes

- (1) `palette.ts` : `e.key?.toLowerCase()`, type `key: string | undefined`. (2) `story-form.tsx` : champ caché `initial_status` figé à l'ouverture (`useState`) ; `story-actions.ts` : le statut n'est écrit que s'il diffère. (3) `== null` à quatre endroits (`ceilings.ts`, `payments.ts` deux fois, `quotes.ts` : la spec n'en citait que deux, même défaut). (4) `isolation.test.ts` : question datée depuis le `created_at` de la réponse. (5) `signInTestAccount` (`accounts.ts`), six fichiers.
- Écarts : message de connexion unifié (« …connexion impossible pour compte de test X : … », préfixe de chaque fichier conservé, y compris pour une variable manquante) ; `tests/components/story-form.test.tsx` ajouté après relecture (le champ caché n'était vérifié par aucun test), avec une doublure de `useRouter` dans le chargeur des composants.
- Vérifié : `npm test`, `tsc`, lint, `next build` (copie propre) ; en réel `test:isolation` 127/127 et `test:leak` 18/18 (dont `purge`) ; `test:rag` et `test:proposals` : type-check seulement. Mutations : (1) 1, (2) 3 + 2 sur le formulaire, (3) 4.

## Spec Change Log

## Review Triage Log

Trois relecteurs (Blind Hunter, Edge Case Hunter, Verification Gap).

| # | Constat | Verdict | Preuve / route |
|---|---------|---------|----------------|
| 1 | Champ caché `initial_status` et son figement sans test (le retirer ou le rendre « vivant » passait) | medium | patch : `story-form.test.tsx` ; deux mutations détectées |
| 2 | Variable manquante : le préfixe « TEST NON CONCLUANT » était perdu | medium | patch : `needEnv` reçoit le préfixe |
| 3 | Re-choisir exprès la valeur d'ouverture n'est pas écrit (comparaison de valeurs) | low | defer : limite inhérente, ajoutée à la dette (avec la note sur `initial_status` venu du client) |
| 4 | Assertion en double dans `quotes.test.ts` | low | patch : retirée |
| 5 | Le formulaire resterait monté après une sauvegarde réussie, `initialStatus` figé | false | `state.ok` appelle `onDone` : le formulaire se ferme (et après une erreur, rien n'a été écrit : figé à raison) |
| 6 | `signInTestAccount` non exercé hors des scripts réels | false | `purge.test.ts` est dans `test:leak` (18/18) ; seuls `rag-run` et `proposals-run` sont type-checkés |
| 7 | Autres `tax_cents === null` (affichages) | low | rejeté : lignes lues en base, `null` garanti ; hors du contrat des fonctions du domaine corrigées |
| 8 | `mA.data!` sans assertion, wrappers `signIn` d'une ligne, doubles lignes vides, journal | low | rejeté (cosmétique) ; doubles lignes vides corrigées |
| 9 | Spec périmée, Code Map sans `quotes.ts` | low | patch (cette mise à jour) |

## Verification

**Commands:**
- `npm test` -- expected: tous les lots passent
- `npx tsc --noEmit && npm run lint` -- expected: sans erreur
- `npm run test:isolation` puis `npm run test:leak` -- expected: tous les tests passent (127 pour l'isolation)
- Mutations à la main sur (1), (2), (3) -- expected: un test échoue à chaque fois, puis restauration
- `next build` dans une copie propre -- expected: passe

**Manual checks (if no CLI):**
- Backlog d'une mission : « Modifier » une story, changer son statut par le menu de la ligne, enregistrer le formulaire : le statut ne revient pas en arrière ; changer le statut dans le formulaire lui-même : il est bien appliqué.
