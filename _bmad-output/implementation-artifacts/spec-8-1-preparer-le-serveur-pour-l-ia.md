---
title: 'Story 8.1 : Préparer le serveur pour l''IA'
type: 'feature'
created: '2026-10-13'
status: 'done'
baseline_commit: 'f1ac58ad6d83adcfceed0542e9dbc29aede28568'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-8-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** l'application n'a ni configuration d'accès aux modèles d'IA ni table pour stocker des extraits vectorisés ; sans cela, aucune des stories d'indexation et de chat ne peut démarrer.

**Approach:** un module `lib/ai/` réservé au serveur lit les trois variables d'environnement (sans aucun appel réseau) ; une migration active `pgvector` et crée `note_chunks` sous RLS ; le script d'isolation couvre la nouvelle table.

## Boundaries & Constraints

**Always:** SQL montré puis approuvé avant application ; fichier de migration nommé avec la version enregistrée par Supabase ; extension installée dans le schéma `extensions` ; `note_chunks` : `owner_id` par défaut `auth.uid()`, RLS avec 4 policies sur `owner_id`, `note_id` en cascade, `embedding vector(1024)`, `embedding_model` obligatoire, index HNSW cosinus ; `lib/ai/` commence par `import "server-only"` ; le build réussit sans clés (elles ne sont lues qu'à l'appel) ; variables sans préfixe `NEXT_PUBLIC_` ; noms de variables ajoutés à `.env.example` sans valeur ; test d'isolation étendu à `note_chunks` ; textes en français.

**Never:** appel à Anthropic ou Mistral (arrive en 8.3) ; colonne d'état d'indexation sur `notes` (8.3) ; fonction SQL de recherche (8.5) ; dépendance npm nouvelle ; clé dans le code, un fichier suivi ou un commit ; clé `service_role`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Lecture de la configuration | les 3 variables présentes | `getAiConfig()` renvoie les 3 valeurs | N/A |
| Variable absente ou vide | une des 3 manque | erreur qui nomme la variable manquante | message sans valeur de clé |
| Build sans clés | aucune variable | le build réussit | N/A |
| Import côté client | un composant `"use client"` importe `lib/ai/` | le build échoue | vérifié à la main (voir Verification) |
| Extrait d'un autre compte | B lit, modifie, supprime ou crée un extrait de A | refusé ou aucune ligne touchée | RLS |
| Sans connexion | `anon` lit ou écrit `note_chunks` | rien lu, écriture refusée (42501) | RLS |
| Suppression d'une note | A supprime une note qui a un extrait | l'extrait disparaît | cascade |
| Mauvaise dimension | embedding de 3 valeurs | refusé | la base |

</frozen-after-approval>

## Code Map

- `supabase/migrations/` -- nouvelle migration `<version>_note_chunks.sql` ; modèle de style : `20261013131016_create_notes.sql` (enable RLS, 4 policies `owner_id = (select auth.uid())`)
- `lib/ai/config.ts` -- nouveau : `import "server-only"`, `getAiConfig()` lit `ANTHROPIC_API_KEY`, `MISTRAL_API_KEY`, `AI_CHAT_MODEL` à l'appel
- `lib/domain/ai-config.ts` + `ai-config.test.ts` -- nouveau : `readAiConfig(env)` pure (validation des 3 variables) ; testée ici car `server-only` ne s'importe pas dans un test Node
- `lib/db/notes.ts` -- exemple de `import "server-only"` déjà en place (Next fournit le paquet)
- `.env.example` -- ajouter les 3 noms sans valeur
- `tests/isolation.test.ts` -- ajouter les cas `note_chunks` (A crée un extrait, B ne le voit pas, etc.)
- `docs/journal.md` -- entrée de la story

## Tasks & Acceptance

**Execution:**
- [x] `supabase/migrations/<version>_note_chunks.sql` -- `create extension vector with schema extensions` ; table `note_chunks` (id, owner_id, note_id, chunk_index, content, embedding, embedding_model, created_at) ; index HNSW cosinus ; index sur `note_id` ; RLS et 4 policies -- migration
- [x] `lib/domain/ai-config.ts` + test -- validation pure des 3 variables -- règle testée
- [x] `lib/ai/config.ts` -- `server-only` et `getAiConfig()` -- point d'entrée serveur de l'IA
- [x] `.env.example` -- noms des 3 variables -- documentation
- [x] `tests/isolation.test.ts` -- cas `note_chunks` à deux comptes, anonyme, cascade, dimension -- isolation
- [x] `docs/journal.md` -- entrée de la story

**Acceptance Criteria:**
- Given les trois variables dans Vercel et `.env.local`, when je construis l'application, then le build réussit et un composant client qui importe `lib/ai/` le fait échouer.
- Given la migration appliquée, then `list_extensions` montre `vector` dans `extensions`, `note_chunks` a la RLS active avec 4 policies, et le conseiller de sécurité ne signale rien de nouveau.
- Given deux comptes fictifs, when B interroge `note_chunks`, then aucun extrait de A n'apparaît (prouvé par `npm run test:isolation`).
- Given une recherche dans le dépôt, then aucune clé n'apparaît dans le code ni dans un commit.

## Implementation Notes

## Spec Change Log

## Review Triage Log

| Constat | Verdict | Route | Preuve / décision |
|---|---|---|---|
| Un compte peut rattacher un extrait à la note d'un autre (`note_id` non lié à `owner_id`, la clé étrangère ignore la RLS) ; idem pour déplacer un extrait | high | patch | prouvé : l'insertion de A sur la note de B réussit (test rouge) ; nouvelle migration qui vérifie la propriété de la note dans les policies insert et update |
| Test de dimension passait sur n'importe quelle erreur | low | patch | le test exige maintenant « dimension » dans le message |
| `.env.example` donne une valeur à `AI_CHAT_MODEL` (spec : sans valeur ; modèle à valider) | low | patch | variable laissée vide, suggestion en commentaire |
| Recherche HNSW filtrée par `owner_id` peut renvoyer moins de résultats | medium | defer | concerne la fonction de recherche (8.5) ; à traiter là (sur-lecture ou balayage itératif) |
| Contenu et vecteur peuvent diverger après une modification d'extrait | low | rejeté | 8.3 remplace les extraits au lieu de les modifier |
| `embedding_model` renseigné avec `embedding` nul | low | rejeté | état « en attente » voulu (8.3) |
| Pas de `finally` dans le test, extraits laissés | false | rejeté | le nettoyage supprime les notes préfixées, les extraits partent en cascade ; vérifié (base propre) |
| `getAiConfig` exige les trois variables à chaque appel | low | rejeté | RAG a besoin des deux fournisseurs ; spec : une seule fonction |
| `AI_CHAT_MODEL` non validé contre une liste | low | rejeté | erreur à l'appel en 8.3 |
| Pas de `revoke` explicite pour `anon` | false | rejeté | l'isolation prouve : lecture vide, écriture refusée (42501) |
| Pas d'index séparé sur `note_id` | false | rejeté | la contrainte unique `(note_id, chunk_index)` le couvre |
| Pas de `updated_at`, de note de retour arrière, paramètres HNSW | low | rejeté | sans conséquence à ce stade |
| Mention RGPD absente | low | rejeté | point ouvert du CLAUDE.md, hors de cette story |

## Design Notes

Colonnes proposées, pour que 8.2 à 8.5 n'aient pas à migrer : `chunk_index int not null`, `content text not null`, `embedding extensions.vector(1024)` (nullable : 8.3 pourra enregistrer l'extrait puis le vecteur), `embedding_model text not null`, `unique (note_id, chunk_index)`. Le type est qualifié `extensions.vector` car les fonctions à `search_path` vide (8.5) ne verront pas le schéma `extensions`. La table est vide : changer de modèle plus tard coûte une migration, sans perte.

Prérequis côté propriétaire, non réalisable par moi : créer les clés Anthropic et Mistral, les mettre dans Vercel (Preview et Production) et `.env.local`, fixer `AI_CHAT_MODEL` (suggestion `claude-sonnet-5-5`). Le code et la migration n'en ont pas besoin ; elles servent dès la story 8.3.

## Verification

**Commands:**
- `npm run lint && npx tsc --noEmit && npm run build && npm test && npm run test:isolation` -- expected: succès

**Manual checks (if no CLI):**
- Après la migration : `list_extensions` (`vector` installée), `list_tables` (`note_chunks`, RLS active), `get_advisors` (sécurité) sans nouvel avertissement.
- Import client : ajouter temporairement `import "@/lib/ai/config"` dans un composant `"use client"`, lancer `npm run build`, constater l'échec, retirer l'import.
- `git grep -n -i "sk-\|api_key"` ne montre aucune valeur de clé.
