---
title: 'Story 3.3 : Lier une note à un client ou un prospect'
type: 'feature'
created: '2026-10-15'
status: 'done'
baseline_commit: 'ca45d24'
route: 'dispatch'
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-3-context.md'
  - '{project-root}/docs/ui-rules.md'
---

## Intent

**Problem:** une note de rendez-vous n'est rattachée à personne ; depuis une fiche, je ne retrouve pas mes notes.

**Approach:** une migration ajoute `notes.client_id` (nullable, une seule fiche par note) ; l'éditeur de note gagne un champ « Lié à » (liste de mes fiches, ou création d'une fiche sur place) ; la fiche affiche une section « Notes » ; la liste des notes montre la fiche en pastille.

## Boundaries & Constraints

**Décisions du propriétaire (2026-10-15) :** suppression d'une fiche = les notes sont conservées, déliées (`on delete set null`) ; une seule fiche par note ; notes visibles sur la fiche, sous les contacts.

**Always:**
- SQL montré puis approuvé avant application ; fichier nommé avec la version enregistrée par Supabase.
- `notes.client_id uuid references clients on delete set null`, index.
- Les clés étrangères contournent la RLS : les policies d'insertion et de mise à jour de `notes` exigent `client_id is null` ou une fiche à moi (même modèle que `contacts`).
- Création sur place : nom (obligatoire) + origine ; avant de créer, afficher les fiches proches (`matchClients`) ; la fiche créée est un prospect (même règle de validation que la story 3.1) ; si l'écriture de la note échoue après la création de la fiche, la fiche reste (non atomique, assumé).
- Le passage prospect → client ne touche pas à `client_id` : la note reste liée (test).
- Message de suppression d'une fiche : « N notes seront conservées, sans lien » (omis si 0).
- Modifier une note ne relance pas l'indexation à cause du seul lien ; le lien n'est pas dans le texte indexé.
- Test d'isolation étendu : lier à la fiche d'un autre compte refusé, fiche supprimée → note conservée avec `client_id` nul.

**Never:** plusieurs fiches par note ; lier une note depuis la fiche (le lien se fait dans l'éditeur) ; filtre des notes par fiche (3.7) ; l'assistant ne change pas ; nouvelle dépendance.

## I/O & Edge-Case Matrix

| Scénario | Entrée / État | Comportement attendu | Erreur |
|----------|--------------|---------------------|--------|
| Lier | choisir une fiche, enregistrer | note visible sur la fiche, pastille dans la liste | N/A |
| Délier | choisir « Aucune fiche » | lien retiré | N/A |
| Créer sur place | « Nouvelle fiche », nom + origine | fiches proches affichées ; fiche prospect créée puis note liée | nom vide : erreur en ligne ; échec : message, rien lié |
| Fiche supprimée | suppression confirmée | notes conservées, déliées | N/A |
| Fiche d'un autre compte | `client_id` forgé | refusé | RLS |
| Fiche disparue entre-temps | enregistrement | « Cette fiche n'existe plus. », saisie conservée | message visible |
| Prospect → client | « Passer en client » | notes toujours liées | N/A |

## Code Map

- `supabase/migrations/20261014230836_contacts.sql` -- modèle de policy avec vérification de la fiche
- `lib/domain/notes.ts` (+ test) -- ajouter `client_id` à la validation (uuid ou vide = null)
- `lib/db/notes.ts` -- colonne + nom de la fiche liée ; `lib/db/clients.ts` -- notes d'une fiche, `matchClients` réutilisé
- `app/(app)/notes/actions.ts` -- `save` : lecture du champ, création de fiche sur place
- `components/note-form.tsx` -- champ « Lié à » ; `app/(app)/notes/[id]`, `nouvelle`, `page.tsx` -- passer les fiches, afficher la pastille
- `app/(app)/clients/[id]/page.tsx` -- section « Notes » ; `components/delete-client.tsx` -- texte
- `tests/isolation.test.ts` ; `docs/journal.md`

## Tasks & Acceptance

- [ ] Migration `notes_client_link` (SQL montré avant application)
- [ ] Règle pure + test (`client_id`)
- [ ] Accès aux données, action (lien + création sur place)
- [ ] Éditeur, liste, section de la fiche, texte de suppression
- [ ] Tests d'isolation, journal

**Acceptance Criteria:**
- Given l'éditeur, when je choisis une fiche et j'enregistre, then la note apparaît sur la fiche et en pastille dans la liste.
- Given aucune fiche adaptée, when je crée « Nom + origine » sur place après avoir vu les fiches proches, then la fiche existe (prospect) et la note y est liée.
- Given un prospect avec des notes, when je clique « Passer en client », then les notes restent liées.
- Given une fiche liée à des notes, when je la supprime, then les notes restent, sans lien.
- Given un identifiant de fiche étranger, when j'enregistre une note, then c'est refusé (`npm run test:isolation`).
- Given la migration appliquée, then `get_advisors` ne signale rien de nouveau.
