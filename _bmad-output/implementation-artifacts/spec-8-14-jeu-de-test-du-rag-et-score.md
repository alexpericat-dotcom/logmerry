---
title: 'Story 8.14 : Jeu de test du RAG et score'
type: 'feature'
created: '2026-10-13'
status: 'in-review'
baseline_commit: '3f41b221fdfdd041d08fb385770c2a9a33ad767a'
route: 'oneshot'
review_loop_iteration: 0
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** on ne sait pas mesurer si l'assistant s'améliore ; le jeu de questions existe sur le papier (`docs/rag-tests.md`, `tests/rag-cases.json`) mais personne ne le fait passer, et les réglages (seuil, consigne, modèle) se décident au jugé.

**Approach:** un script `npm run test:rag` (`tests/rag-run.ts`, hors de `npm test`) : il crée le corpus de notes fictives pour les comptes fictifs (démo A : le corpus ; démo B : une note que seul B possède, pour le piège inter-comptes), les fait indexer par le vrai chemin (Mistral), pose chacune des questions de `tests/rag-cases.json` au vrai assistant (mêmes fonctions que la route : recherche hybride, Claude, vérification des citations), note chaque question avec deux mesures (**bon extrait retrouvé ?** et **réponse fidèle ?**, règles pures testées dans `lib/domain/rag-score.ts`), affiche le tableau et le score sur 20 par rapport à la cible de 18, supprime tout ce qu'il a créé, et avec `--record "commentaire"` ajoute une ligne datée (score, seuil de similarité, modèle Claude, commentaire) au tableau des résultats de `docs/rag-tests.md`. Code de sortie non nul si le score est sous la cible ou si un extrait d'un autre compte est reçu. Trois exécutions datées sont enregistrées, avec leurs modifications entre elles. Le jugement est automatique et grossier (faits attendus présents dans la réponse, source attendue parmi les sources, refus reconnu), donc un instrument de comparaison d'une exécution à l'autre, pas une vérité : le propriétaire peut corriger une note à la main dans le fichier.

</frozen-after-approval>

## Implementation Notes

Fichiers : `tests/rag-run.ts` (script `npm run test:rag`), `tests/helpers/ts-hooks.mjs` et `register.mjs` (crochets de chargement : `server-only` vide, alias `@/`), `lib/domain/rag-score.ts` (notation pure) et son test (dont deux tests de cohérence entre `tests/rag-cases.json` et `docs/rag-tests.md`), `docs/rag-tests.md` (mode d'emploi, jeu de questions, trois exécutions datées). Une phrase ajoutée à la consigne de l'assistant (`lib/domain/prompt.ts`) : « citations vide si les notes ne répondent pas, même si un extrait parle d'un sujet voisin ». Résultats enregistrés : exécution 1, 19 sur 20 (mesure de départ) ; exécution 2, 19 sur 20 (après la consigne ; trois passages de contrôle avant avaient donné 19 chaque fois, contre 18 puis 19 avant) ; exécution 3, 20 sur 20 (instrument corrigé : préfixe de test retiré des titres, juge élargi aux formules de refus). Le passage à 20 vient donc de la **mesure**, pas d'un meilleur assistant, ce qui est écrit dans le fichier. Une exécution de contrôle avec le script durci (nettoyage par identifiants, chiffres inventés rejetés, détecteur de fuite sur les sources) donne encore 20 sur 20, sans fuite ni erreur. Statut « en revue » : le contenu du jeu de questions attend la relecture du propriétaire.

