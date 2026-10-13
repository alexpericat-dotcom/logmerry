---
title: 'Story 8.15 : Test de fuite sur l''assistant et l''historique'
type: 'feature'
created: '2026-10-13'
status: 'in-review'
baseline_commit: '2a160a2e983353fc010bad0e787e29afff1a8266'
route: 'oneshot'
review_loop_iteration: 0
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** la recherche par sens est prouvée étanche (stories 8.5 à 8.7) et l'historique est isolé en base (8.10), mais rien ne prouve de bout en bout, avec le vrai assistant, que B ne reçoit rien de A ni dans ses réponses ni dans l'historique.

**Approach:** un test `tests/leak-assistant.test.ts`, lancé avec `npm run test:leak` (qui exécute désormais aussi celui de la 8.7), avec les deux comptes fictifs (@example.com seulement), de vraies notes fictives aux thèmes proches (clients, tarifs, contrats) mais aux faits distincts, indexées par le vrai chemin (Mistral), et un historique enregistré pour chaque compte avec le vrai assistant (Claude). Vérifié : (1) quand B pose une question dont la réponse n'est que chez A, la réponse est « je ne trouve pas » ou un refus, **sans aucune source de A et sans aucun fait propre à A**, et réciproquement ; (2) l'historique et les citations de A ne sont ni lisibles par B (liste, identifiant, citations, suppression) ni utilisables par lui (une citation forgée vers une source de A est refusée et ne laisse rien) ; l'historique de A reste intact ; (3) un visiteur sans connexion ne lit rien ; (4) un contrôle du détecteur prouve qu'un seul fait étranger le ferait échouer. Résultat noté dans `docs/rag-tests.md` et `docs/journal.md` ; une seule fuite bloque la livraison. Aucune migration, aucun code d'application.

</frozen-after-approval>

## Implementation Notes

Fichiers : `tests/leak-assistant.test.ts`, scripts `test:leak` (les deux fichiers de fuite, séquentiels) et `test:leak:assistant` dans `package.json`, `lib/domain/leak.ts` (détecteur testé sous `npm test`) et `lib/domain/rag-score.ts` (`looksLikeRefusal`), `saveExchange` (`lib/db/history.ts`) rend maintenant les identifiants des messages enregistrés pour que le test ne supprime que les siens, `docs/rag-tests.md` (description, limites, résultat). Pas de migration. Résultat : 17 vérifications sur 17, aucune fuite ; aucun reste en base. Simulation de fuite (accès de A donnés à « B ») : détectée par les faits et par la source.

