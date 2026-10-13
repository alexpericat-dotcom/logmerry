# Epic 8 Context: Assistant IA et RAG

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

L'assistant répond à partir des notes du propriétaire en citant des sources vérifiées, et refuse proprement quand il ne sait pas. Livré en premier après les fondations (jalon du 30 octobre 2026), en quatre temps : préparation des données (sprint 3), recherche par sens (sprint 4), réponse avec sources et historique (sprint 5), qualité et jeu de test (sprint 6). Les stories 8.12 (estimations) et 8.13 (résumé) viennent plus tard.

## Stories

- Story 8.1: Préparer le serveur pour l'IA
- Story 8.2: Découper une note en extraits
- Story 8.3: Indexer une note à l'enregistrement
- Story 8.4: Indexer mes notes existantes
- Stories 8.5 à 8.15: recherche par sens, assistant, citations, historique, refus « je ne trouve pas », jeu de test, test de fuite

## Requirements & Constraints

- Aucune clé d'API côté navigateur ni dans un commit ; appels IA côté serveur uniquement.
- Les extraits de notes partent chez deux fournisseurs (Anthropic, Mistral) : données fictives seulement jusqu'à la mention RGPD.
- Isolation entre comptes : la recherche vectorielle filtre par `owner_id` et est prouvée par le script à deux comptes.
- Aucun conseil fiscal ou juridique généré ; l'IA ne calcule aucun chiffre.
- Une note enregistrée n'est jamais perdue si l'IA est en panne (état d'indexation « échec », nouvel essai possible).

## Technical Decisions

- Claude (Anthropic) pour les réponses, identifiant dans `AI_CHAT_MODEL` (suggestion `claude-sonnet-5-5`, à valider sur `docs/rag-tests.md`). `mistral-embed` (Mistral AI) pour les embeddings, `vector(1024)`, index HNSW cosinus ; chaque extrait stocke `embedding_model` ; changer de modèle impose une migration et une réindexation complète.
- Code d'appel dans `lib/ai/`, qui commence par `import 'server-only'` ; clés `ANTHROPIC_API_KEY`, `MISTRAL_API_KEY`, `AI_CHAT_MODEL` sans préfixe `NEXT_PUBLIC_`, dans Vercel et `.env.local`.
- Découpage et vérification des citations : fonctions pures dans `lib/domain/`, testées.
- Indexation dans la Server Action de sauvegarde (note enregistrée d'abord, puis découpée, vectorisée, extraits remplacés) ; chat dans `app/api/chat/route.ts` ; ni Edge Function Supabase ni n8n.
- Fonctions SQL `security invoker`, `search_path` vide, filtre explicite sur `owner_id`.
- Suppression d'une note : ses extraits partent en cascade.

## Cross-Story Dependencies

- 8.1 crée `note_chunks` ; 8.2 à 8.4 la remplissent ; 8.5 à 8.7 l'interrogent ; 8.8 à 8.10 s'appuient sur la recherche.
- 8.3 ajoute l'état d'indexation sur les notes (table créée en 2.1).
- L'isolation (script à deux comptes de la story 2.3) est à étendre à `note_chunks` dès sa création.
