---
title: 'Tests de l''orchestration RAG (embedTexts, retrieveChunks)'
type: 'chore'
created: '2026-10-28'
status: 'in-progress'
baseline_commit: 'b9574e03ead8200040bceb1bdc7ab03feb0da84e'
route: 'dispatch'
review_loop_iteration: 0
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** `embedTexts` (lots de 16 dans l'ordre, statut non OK, délai) et `retrieveChunks` (voie par mots-clés ignorée si elle échoue, voie par sens fatale) sont le cœur du RAG, mais seuls les scripts réels (clés et base réelles) les exercent : `npm test` et la CI ne les voient pas.

**Approach:** aucune extraction : les parties pures (`toBatches`, `parseEmbeddings`, `extractKeywords`, `mergeRetrieved`, `chunksMatchingKeywords`) sont déjà dans `lib/domain/` et testées. On teste l'orchestration telle quelle, avec un `fetch` factice et un client Supabase factice, dans un lot de tests branché sur `npm test`. Aucune dépendance ajoutée, aucun changement du code de l'application.

## Boundaries & Constraints

**Always:** aucun appel réseau ni clé réelle (`MISTRAL_API_KEY` factice posée par le test, restaurée ensuite) ; les erreurs ne contiennent ni la clé ni le texte envoyé ; tests en français comme les autres, lanceur `node --test`.

**Never:** modifier `lib/ai/embeddings.ts` ou `lib/db/retrieval.ts` ; ajouter jsdom, Vitest ou une autre dépendance ; réécrire le harnais d'actions (ses doublures remplacent `lib/ai/embeddings`, d'où un lot séparé avec le chargeur `register.mjs`).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Liste vide | `embedTexts([])` | `[]`, aucun `fetch` | N/A |
| Lots | 35 textes | 3 appels (16, 16, 3), vecteurs rendus dans l'ordre des textes | N/A |
| Statut non OK | Mistral répond 429 | erreur « Mistral a répondu 429. » | ni clé ni texte dans le message |
| Délai | `fetch` rejette (TimeoutError) | l'erreur remonte ; le signal d'annulation est passé à `fetch` | N/A |
| Clé absente | `MISTRAL_API_KEY` vide | erreur nommant la variable, aucun `fetch` | jamais la valeur |
| Deux voies réussies | sens + mots-clés | fusion, `score` nul pour les extraits trouvés par mots-clés seuls | N/A |
| Voie mots-clés en échec | `search_notes` en erreur | résultat de la voie par sens, erreur journalisée sans contenu | N/A |
| Voie par sens en échec | `fetch` 500 ou `match_chunks` en erreur | `retrieveChunks` lève l'erreur | pas de repli silencieux |
| Question sans mot-clé | « est-ce que » | voie par mots-clés vide, aucune requête `search_notes` | N/A |

</frozen-after-approval>

## Code Map

- `lib/ai/embeddings.ts` -- `embedTexts` : lots, `fetch`, statut, délai (20 s) ; `server-only` vidé par `tests/helpers/ts-hooks.mjs`.
- `lib/db/retrieval.ts` -- `retrieveChunks` : `Promise.all` des deux voies, `.catch` journalisé sur les mots-clés ; appelle `rpc("match_chunks")`, `rpc("search_notes")`, `from("notes"|"note_chunks").select().in().limit()`.
- `lib/domain/{embeddings,keywords,matching}.ts` -- parties pures déjà testées : à réutiliser, pas à toucher.
- `tests/helpers/register.mjs` -- chargeur (`@/`, `server-only`) déjà utilisé par `test:leak`.
- `package.json` -- `npm test` enchaîne `lib/**` et `test:actions` ; la CI lance `npm test`.

## Tasks & Acceptance

**Execution:**
- [ ] `tests/retrieval/embeddings.test.ts` -- cas `embedTexts` de la matrice, `fetch` simulé par `t.mock.method(globalThis, "fetch")` -- aucun réseau
- [ ] `tests/retrieval/retrieval.test.ts` -- cas `retrieveChunks` de la matrice, client factice de ~20 lignes (`rpc`, `from().select().in().limit()`), `fetch` simulé pour la voie par sens -- les deux voies sont le vrai code
- [ ] `package.json` -- script `test:retrieval` (avec `--import ./tests/helpers/register.mjs`), ajouté à `npm test` -- la CI le lance
- [ ] `docs/journal.md`, `_bmad-output/implementation-artifacts/deferred-work.md` -- noter le résultat ; retirer le point « `retrieveChunks` et `embedTexts` » de la section 2

**Acceptance Criteria:**
- Given aucune variable d'environnement réelle, when `npm test` tourne, then les nouveaux tests passent sans réseau.
- Given une mutation de `retrieval.ts` (retirer le `.catch` ou le rendre fatal pour le sens), when les tests tournent, then au moins un échoue.
- Given `tsc --noEmit` et `npm run lint`, then sans erreur.

## Implementation Notes

## Spec Change Log

## Review Triage Log

## Verification

**Commands:**
- `npm test` -- expected: tous les tests passent, dont les nouveaux
- `npx tsc --noEmit && npm run lint` -- expected: sans erreur
- Mutations à la main (retirer le `.catch` ; passer le lot à 17) -- expected: un test échoue, puis `git checkout` du fichier
