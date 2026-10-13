---
title: 'Story 8.5 : Retrouver les passages pertinents (fonction de recherche)'
type: 'feature'
created: '2026-10-14'
status: 'done'
baseline_commit: '1fd967644cd823eac8f47773ee4073302403d4f5'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-8-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** les extraits sont indexés mais rien ne permet d'y retrouver ceux qui ressemblent à une question ; l'assistant et la recherche « par sens » n'ont donc aucune source.

**Approach:** une migration ajoute la fonction SQL `match_chunks(query_embedding, match_threshold, match_count)` : elle renvoie, parmi mes extraits seulement, les plus proches (distance cosinus) dont la similarité atteint le seuil, du plus proche au moins proche ; liste vide si aucun n'atteint le seuil. Le test d'isolation la couvre. Le seuil réel est choisi par l'appelant (story 8.6) ; la mesure faite pour cette story sert de point de départ.

## Boundaries & Constraints

**Always:** SQL montré puis approuvé avant application ; fichier de migration nommé avec la version enregistrée par Supabase ; `security invoker` (jamais `security definer`), `search_path` vide, noms et opérateurs qualifiés (`extensions.vector`, `operator(extensions.<=>)`) ; filtre explicite `owner_id = (select auth.uid())` en plus de la RLS ; extraits sans vecteur ignorés ; résultat borné à 20 lignes quel que soit `match_count` ; droits : refusée à `anon` et à `public`, accordée à `authenticated` ; balayage itératif de l'index HNSW activé pour la fonction (pgvector 0.8) afin que le filtre par propriétaire ne fasse pas perdre de résultats ; résultat reclassé par similarité décroissante ; test d'isolation étendu : A retrouve ses extraits, B n'en reçoit aucun de A, anonyme refusé.

**Never:** valeur de seuil écrite en dur dans la fonction (elle est un paramètre) ; appel à Mistral depuis la base ; interface de recherche (story 8.6) ; appel à Claude ; changement de la table `note_chunks` ; nouvelle dépendance.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Extrait proche | vecteur identique à celui d'un de mes extraits, seuil 0,5 | l'extrait, similarité proche de 1 | N/A |
| Classement | deux extraits plus ou moins proches | le plus proche d'abord | N/A |
| Sous le seuil | question sans rapport (similarité 0) | liste vide, pas d'erreur | N/A |
| Limite | plus d'extraits que `match_count` | `match_count` lignes au plus (20 maximum) | N/A |
| Extrait sans vecteur | `embedding` nul | ignoré | N/A |
| Autre compte | B cherche ce que seul A a indexé | aucun extrait de A, ni de similarité | RLS |
| Sans connexion | `anon` appelle la fonction | refus (42501) | droits |
| Mauvaise dimension | question vectorisée en 3 valeurs | refus | typage de la base |

</frozen-after-approval>

## Code Map

- `supabase/migrations/` -- une migration `<version>_match_chunks.sql` ; style : `20261013135640_notes_search.sql` (`security invoker`, `search_path` vide, `revoke ... from public, anon`, `grant ... to authenticated`)
- `tests/isolation.test.ts` -- ajouter les cas de la matrice ; les vecteurs de test sont des vecteurs de base (une seule valeur à 1) donc la similarité est exacte ; les extraits partent en cascade avec les notes préfixées
- `docs/journal.md` -- entrée de la story, avec la mesure des scores

## Tasks & Acceptance

**Execution:**
- [x] `supabase/migrations/<version>_match_chunks.sql` -- fonction `match_chunks` et droits -- migration
- [x] `tests/isolation.test.ts` -- cas de la matrice à deux comptes -- isolation
- [x] `docs/journal.md` -- entrée de la story -- traçabilité

**Acceptance Criteria:**
- Given des extraits indexés, when j'appelle `match_chunks` avec un vecteur et un seuil, then je reçois les plus proches au-dessus du seuil, du plus proche au moins proche.
- Given aucun extrait au-dessus du seuil, then la liste est vide.
- Given la migration appliquée, then la fonction est `security invoker`, n'est exécutable que par les comptes connectés et le conseiller de sécurité ne signale rien de nouveau.
- Given deux comptes fictifs, then B ne reçoit jamais d'extrait de A (`npm run test:isolation`).

## Implementation Notes

Migration `20261013160748_match_chunks.sql` appliquée par l'outil MCP. Premier essai refusé par la base (« permission denied to set parameter hnsw.iterative_scan ») : pgvector n'était pas chargé dans la session de migration, le réglage de la fonction était traité comme un paramètre inconnu. Correctif : un `select '[1]'::extensions.vector;` en tête de migration ; le reste du SQL est celui qui avait été approuvé. Contrôles : `security_definer = false`, `search_path` vide, `hnsw.iterative_scan = relaxed_order`, `anon` sans droit d'exécution, conseiller de sécurité sans nouvel avertissement.

## Spec Change Log

## Review Triage Log

| Constat | Verdict | Route | Preuve / décision |
|---|---|---|---|
| Plafond de 20 résultats et `match_count` à 0 ou négatif non testés | medium | patch | test ajouté : 22 extraits, `match_count` 100 → 20 lignes ; 0 et -5 → liste vide sans erreur |
| Test du vecteur de 3 valeurs passerait sur n'importe quelle erreur | low | patch | l'erreur doit parler de « dimension » |
| Assertion « B ne reçoit que son extrait » fragile | low | patch | B retrouve le sien et ne reçoit aucun extrait de A (trois contenus et le lot) |
| Journal de la story manquant | low | patch | entrée ajoutée |
| `relaxed_order` peut couper un extrait un peu plus proche dans la limite interne | low | defer | n'a d'effet qu'avec un balayage d'index sur des milliers d'extraits ; `strict_order` à reconsidérer quand le volume grandit |
| Vecteur nul : similarité NaN passe le seuil | low | rejeté | ni Mistral ni le code ne produisent un vecteur nul |
| `match_count` ou seuil nul renvoie une liste vide | low | rejeté | appelant en erreur ; la liste vide est le comportement documenté |
| Extraits de modèles différents mélangés | low | rejeté | changer de modèle impose une réindexation complète (règle du projet) |
| Test de reprise : doublons de clés, nettoyage absent | false | rejeté | le nettoyage supprime les notes préfixées, les extraits partent en cascade ; déjà vérifié |
| Pas d'index HNSW dans la migration | false | rejeté | `note_chunks_embedding_idx` existe depuis la story 8.1 |
| Régression `security definer` non détectée par le test | low | rejeté | non testable par l'API ; contrôle manuel `pg_proc` dans la spec |
| Types générés non régénérés | false | rejeté | aucun type généré n'est suivi dans le dépôt |

## Design Notes

Mesure faite pour cette story (textes fictifs, `mistral-embed`) : les scores sont resserrés. Questions pertinentes : meilleur passage entre 0,79 et 0,82 ; questions sans rapport : meilleur passage 0,72 à 0,73, et même une recette de gâteau atteint 0,66 à 0,72. Une coupure autour de 0,75 à 0,76 sépare l'échantillon avec une marge mince ; valeur de départ proposée pour la story 8.6 : 0,76, **provisoire**, à régler sur `docs/rag-tests.md` (story 8.14). Le seuil reste un paramètre de l'appelant pour pouvoir le changer sans migration.

SQL proposé (montré avant application) :

```sql
create function public.match_chunks(
  query_embedding extensions.vector(1024),
  match_threshold double precision,
  match_count integer
)
returns table (id uuid, note_id uuid, chunk_index integer, content text, similarity double precision)
language sql stable security invoker
set search_path = ''
set hnsw.iterative_scan = 'relaxed_order'
as $$
  select m.id, m.note_id, m.chunk_index, m.content, m.similarity
  from (
    select c.id, c.note_id, c.chunk_index, c.content,
           1 - (c.embedding operator(extensions.<=>) query_embedding) as similarity
    from public.note_chunks c
    where c.owner_id = (select auth.uid()) and c.embedding is not null
    order by c.embedding operator(extensions.<=>) query_embedding
    limit least(greatest(match_count, 0), 20)
  ) m
  where m.similarity >= match_threshold
  order by m.similarity desc;
$$;

revoke execute on function public.match_chunks(extensions.vector, double precision, integer) from public, anon;
grant execute on function public.match_chunks(extensions.vector, double precision, integer) to authenticated;
```

Le seuil s'applique après avoir pris les `match_count` plus proches : on ne renvoie jamais plus que demandé. `relaxed_order` peut ranger légèrement hors ordre les résultats de l'index ; l'étape finale les reclasse par similarité.

## Verification

**Commands:**
- `npm run lint && npx tsc --noEmit && npm run build && npm test && npm run test:isolation` -- expected: succès

**Manual checks (if no CLI):**
- Après la migration : `get_advisors` (sécurité) sans nouvel avertissement ; `execute_sql` en lecture seule sur `pg_proc` : `prosecdef = false` pour `match_chunks`.
