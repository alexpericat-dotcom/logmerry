---
title: 'Story 8.3 : Indexer une note à l''enregistrement'
type: 'feature'
created: '2026-10-13'
status: 'done'
baseline_commit: 'ed42ea4104ba3cfd0e774a2a73c314894d214b62'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-8-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** les notes ne sont ni découpées ni vectorisées ; l'assistant ne peut donc rien retrouver, et rien n'indique si une note est prête pour lui.

**Approach:** à chaque enregistrement (création ou modification), la note est d'abord sauvegardée, puis découpée (`chunkNote`), vectorisée par `mistral-embed` et ses extraits sont remplacés ; un état « indexée / en attente / échec » est stocké sur la note, affiché dans la liste et sur la page de la note, avec un bouton « Réessayer » en cas d'échec.

## Boundaries & Constraints

**Always:** SQL de la migration montré puis approuvé avant application ; la note est enregistrée même si l'IA échoue (jamais d'erreur de sauvegarde due à l'indexation) ; appels à Mistral côté serveur seulement, avec `fetch` (aucune dépendance ajoutée), délai maximal par appel, lots de 16 textes au plus ; texte envoyé pour chaque extrait = titre + extrait, `content` stocké = extrait seul ; `embedding_model` = `mistral-embed` ; échec ou texte vide : les anciens extraits sont supprimés (jamais de passage périmé) ; note sans texte (vide ou espaces) : aucun appel IA, état « indexée » ; aucun contenu de note ni clé dans les journaux ; messages en français, tutoiement ; test d'isolation étendu à l'état d'indexation.

**Never:** indexer les notes existantes en bloc (story 8.4) ; recherche vectorielle (8.5) ; changer la dimension (1024) ; Edge Function ou n8n ; écriture directe depuis un composant client ; stocker le détail d'une erreur du fournisseur dans la base.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Création avec texte | note de quelques paragraphes | note enregistrée, extraits créés avec vecteurs, état « indexée » | N/A |
| Modification | texte changé | anciens extraits remplacés par les nouveaux, état « indexée » | N/A |
| Note sans texte | corps vide ou espaces | aucun extrait, aucun appel IA, état « indexée » | N/A |
| IA en panne | Mistral refuse, délai dépassé ou clé absente | note enregistrée, anciens extraits supprimés, état « échec » | message neutre sans clé ni contenu |
| Réponse invalide | nombre de vecteurs ou dimension inattendus | traité comme un échec | idem |
| Réessayer | note en échec, IA revenue | extraits recréés, état « indexée » | si échec encore : reste « échec » |
| Réessayer sans session | action appelée sans connexion | redirection vers `/auth/login` | N/A |
| Réessayer une note d'un autre compte | identifiant d'une note de B | « Cette note n'existe plus. » | RLS : aucune ligne |
| Modification du seul type | type changé, texte inchangé | réindexation comme toute sauvegarde | N/A |
| Autre compte | A indexe ; B regarde | B ne voit ni extraits ni état de A | RLS |

</frozen-after-approval>

## Code Map

- `supabase/migrations/` -- une migration `<version>_notes_index_status.sql` : enum `index_status` (`pending`, `indexed`, `failed`) et colonne `notes.index_status not null default 'pending'` (les notes existantes passent en « en attente »)
- `lib/domain/embeddings.ts` + test -- pur : `toBatches(texts, 16)` et `parseEmbeddings(json, count)` (vérifie nombre, ordre par `index`, 1024 valeurs numériques)
- `lib/ai/embeddings.ts` -- `server-only` : `embedTexts(texts)` ; `POST https://api.mistral.ai/v1/embeddings`, corps `{ model: "mistral-embed", input: [...] }`, en-tête `Authorization: Bearer`, `AbortSignal.timeout` ; clé via `getAiConfig()` (`lib/ai/config.ts`)
- `app/(app)/notes/indexing.ts` -- `indexNote(supabase, id, {title, body})` : `chunkNote` (`lib/domain/chunking.ts`) → `embedTexts` → suppression puis insertion des extraits → mise à jour de `index_status` ; ne lève jamais
- `app/(app)/notes/actions.ts` -- `save()` appelle `indexNote` après une écriture réussie, dans la même session (la création doit renvoyer l'`id` : `.insert(...).select("id").single()`) ; `updateNote` remet l'état à `pending` avant l'indexation ; nouvelle action `retryIndexing(id)` (session, `isUuid`, lecture de la note sous RLS)
- `lib/db/notes.ts` -- ajouter `index_status` à `COLUMNS` et au type `Note`
- `components/index-status.tsx` -- pastille d'état (« Indexée », « En attente », « Échec d'indexation ») ; `components/retry-indexing.tsx` -- bouton « Réessayer » (`useActionState`, motif de `components/delete-note.tsx`)
- `app/(app)/notes/page.tsx` et `app/(app)/notes/[id]/page.tsx` -- afficher l'état ; bouton seulement si « échec »
- `tests/isolation.test.ts` -- état par défaut `pending`, valeur inconnue refusée, B ne lit pas l'état de A
- `docs/journal.md` -- entrée de la story

## Tasks & Acceptance

**Execution:**
- [ ] `supabase/migrations/<version>_notes_index_status.sql` -- enum et colonne -- migration
- [ ] `lib/domain/embeddings.ts` + test -- lots et validation de la réponse -- règles pures testées
- [ ] `lib/ai/embeddings.ts` -- appel à Mistral -- accès serveur
- [ ] `app/(app)/notes/indexing.ts` + `actions.ts` -- orchestration, `retryIndexing` -- sauvegarde puis indexation
- [ ] `lib/db/notes.ts`, `components/index-status.tsx`, `components/retry-indexing.tsx`, pages -- état visible et nouvel essai -- interface
- [ ] `tests/isolation.test.ts` -- état d'indexation -- isolation
- [ ] `docs/journal.md` -- entrée de la story

**Acceptance Criteria:**
- Given une note avec du texte, when je l'enregistre, then ses extraits existent avec un vecteur de 1 024 valeurs et `embedding_model = 'mistral-embed'`, et l'état affiché est « Indexée ».
- Given la clé Mistral invalide ou absente, when j'enregistre une note, then la note est bien enregistrée, l'état est « Échec d'indexation » et un bouton « Réessayer » apparaît.
- Given une note en échec et la clé rétablie, when je clique sur « Réessayer », then l'état passe à « Indexée ».
- Given deux enregistrements successifs, then la note n'a que les extraits de sa dernière version.
- Given deux comptes fictifs, then B ne voit jamais les extraits ni l'état de A (`npm run test:isolation`).
- Given une recherche dans le dépôt, then aucune clé dans le code ni les journaux.

## Implementation Notes

Orchestration pure dans `lib/domain/index-note.ts` (`indexNoteWith`, dépendances injectées) ; `app/(app)/notes/indexing.ts` la branche sur Mistral et la base. Appel réel vérifié avec un script jetable (hors dépôt) : indexation de 4 extraits, remplacement, texte vide, isolation, clé invalide → « échec » et extraits supprimés. Écart assumé : le bouton existe aussi pour « en attente » (retour de revue). Non couvert par un test automatique : les branches session et note introuvable de `retryIndexing` (essai manuel et RLS).

## Spec Change Log

## Review Triage Log

| Constat | Verdict | Route | Preuve / décision |
|---|---|---|---|
| Orchestration de l'indexation sans aucun test (garantie « jamais de passage périmé ») | high | patch | logique déplacée dans `lib/domain/index-note.ts` (dépendances injectées) ; 7 tests : succès, titre joint, texte vide, IA en panne, insertion qui échoue, remise en ordre qui échoue, journal sans contenu |
| Note restée « en attente » (coupure, notes existantes) sans moyen de relancer | medium | patch | bouton affiché aussi pour « en attente » (libellé « Indexer maintenant ») |
| Échecs d'écriture de l'état ou de la suppression avalés sans journal | medium | patch | chaque échec de remise en ordre est journalisé (sans contenu) |
| Erreur de lecture de `retryIndexing` affichée comme « note supprimée » | medium | patch | erreur de lecture : message d'échec, pas « n'existe plus » |
| Suppression puis insertion non atomiques | low | rejeté | si l'insertion échoue, la remise en ordre supprime les extraits et marque « échec » ; test ajouté |
| Deux sauvegardes simultanées | low | rejeté | limite acceptée dans les notes de conception ; « Réessayer » répare |
| Indexation dans la requête de sauvegarde, délais | low | rejeté | 60 extraits au plus, 4 lots de 16, 20 s par lot au pire, limite de 300 s |
| Pas de nouvel essai sur 429 ou 5xx | low | rejeté | nouvel essai manuel disponible ; un seul propriétaire |
| Réindexation même si le texte n'a pas changé | low | rejeté | décidé dans la spec (un seul appel, pas de comparaison) |
| Titre trop long dépasserait la limite de Mistral | false | rejeté | titre limité à 200 caractères par la base, extrait à 1 000 |
| `createNote` : insertion puis lecture bloquée par la RLS | false | rejeté | policies d'insertion et de lecture sur le même `owner_id` ; les tests d'isolation font la même requête |
| Journaux pourraient contenir la clé | low | rejeté | les erreurs ne contiennent que nos messages ; test vérifie que titre et corps n'y sont pas |
| `embedTexts` sans test avec `fetch` simulé | low | defer | boucle mince ; vérifiée par l'appel réel ; l'ordre des lots est couvert par `parseEmbeddings` |
| Étiquette d'état sans `aria-live`, type écrit à la main, nom d'enum | low | rejeté | cosmétique |
| Mention RGPD absente | low | rejeté | point ouvert du CLAUDE.md, hors de cette story |

## Design Notes

Choix sans enjeu visible, tranchés : une sauvegarde déclenche toujours une réindexation (un seul appel, pas de comparaison avec l'ancien texte) ; en cas d'échec, les anciens extraits sont supprimés plutôt que gardés (un passage périmé ferait citer un texte qui n'est plus dans la note) ; l'indexation se fait avant la redirection, l'attente est celle d'un appel (environ une seconde) ; le détail de l'erreur du fournisseur n'est pas stocké.

Limite connue : deux sauvegardes quasi simultanées de la même note peuvent entrelacer suppression et insertion des extraits ; un seul propriétaire, accepté (« réessayer » répare).

Prérequis propriétaire : clés dans `.env.local` (faites) ; pour la preview, les trois variables dans Vercel (Production et Preview) puis redéploiement.

## Verification

**Commands:**
- `npm run lint && npx tsc --noEmit && npm run build && npm test && npm run test:isolation` -- expected: succès

**Manual checks (if no CLI):**
- Appel réel à Mistral avec un texte fictif (script local, sans afficher la clé) : réponse de 1 024 valeurs.
- En local ou sur la preview : créer une note, voir « Indexée » ; modifier, vérifier le remplacement des extraits (`execute_sql` en lecture seule) ; casser la clé, enregistrer, voir « Échec » puis « Réessayer ».
- `get_advisors` (sécurité) sans nouvel avertissement.
