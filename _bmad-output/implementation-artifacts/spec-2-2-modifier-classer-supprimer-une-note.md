---
title: 'Story 2.2 : Modifier, classer et supprimer une note'
type: 'feature'
created: '2026-10-13'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
baseline_commit: '66d4311cb213cdc6f1544b44833ceb6993004e96'
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-2-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** une note créée ne peut plus être ni corrigée, ni classée, ni supprimée, et la liste ne peut pas être filtrée.

**Approach:** une seconde migration ajoute le type de note (note, procédure, modèle, FAQ), `updated_at` et une limite de longueur du texte ; la liste devient cliquable vers `/notes/[id]` (modification et suppression) et se filtre par type avec des liens de filtre ; le type se choisit aussi à la création.

## Boundaries & Constraints

**Always:** SQL montré puis approuvé avant application ; fichier de migration nommé avec la version enregistrée par Supabase ; session vérifiée avant toute écriture ; identifiant inconnu, mal formé ou appartenant à un autre compte = page « introuvable » (404) ; après enregistrement ou suppression, retour sur `/notes` ; filtre actif marqué par `aria-current` + gras ; erreurs en ligne qui nomment le champ ; textes en français, tutoiement ; un seul `h1` par page ; `<title>` « {Page} · LogMerry ».

**Décision du propriétaire :** la suppression se confirme en ligne sur la page (« Supprimer cette note ? » avec « Oui, supprimer » et « Annuler »), sans fenêtre modale ni boîte du navigateur, et sans nouvelle dépendance.

**Never:** modification du statut brouillon/actif ; recherche ; éditeur riche ; suppression multiple ou annulation après suppression ; corbeille ; nouvelle dépendance.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Modification | titre ou texte changé, « Enregistrer » | retour sur `/notes`, changement visible, `updated_at` à jour | N/A |
| Titre vide à la modification | titre vidé | rien n'est enregistré, message sous le champ, saisie conservée | message en ligne |
| Classement | type « Procédure » choisi | la note porte ce type ; il s'affiche dans la liste | N/A |
| Filtre | lien « Procédures » | seules les procédures s'affichent ; « Toutes » rétablit | type inconnu dans l'adresse : traité comme « Toutes » |
| Filtre sans résultat | aucun note de ce type | phrase « Aucune note de ce type. » | N/A |
| Suppression | confirmation acceptée | la note disparaît, retour sur `/notes` | échec : message, note conservée |
| Suppression annulée | « Annuler » | la note reste, rien n'est supprimé | N/A |
| Note d'un autre compte ou inconnue | `/notes/<id>` | page introuvable (404) | N/A |
| Sans session | action appelée sans connexion | redirection vers `/auth/login`, aucune écriture | N/A |

</frozen-after-approval>

## Code Map

- `supabase/migrations/` -- une migration `20261013132630_notes_type_updated_at.sql` (voir Design Notes)
- `lib/domain/notes.ts`, `lib/domain/notes.test.ts` -- ajouter `NOTE_TYPES`, libellés, validation du type, `parseTypeFilter`
- `lib/db/notes.ts` -- `listNotes(type?)`, nouveau `getNote(id)` ; `Note` reçoit `type` et `updated_at`
- `app/(app)/notes/actions.ts` -- `createNote` reçoit le type ; ajouter `updateNote`, `deleteNote` (même schéma session → validation → écriture, `redirect` hors du `try`)
- `components/note-form.tsx` -- champ « Type » ; réutilisé en mode modification (valeurs initiales, action liée à l'identifiant)
- `app/(app)/notes/page.tsx` -- filtres par `searchParams` lus sous `Suspense`, titres cliquables, type affiché
- `app/(app)/notes/[id]/page.tsx` -- nouvelle page de modification + suppression ; `notFound()` si absente
- `components/ui/` -- `button`, `input`, `label`, `textarea`, `badge` ; pas de `select` (utiliser un `<select>` natif stylé)
- `lib/nav.ts`, `app/(app)/layout.tsx` -- sans changement

## Tasks & Acceptance

**Execution:**
- [x] `supabase/migrations/<version>_notes_type_updated_at.sql` -- enum `note_type`, colonnes `type` et `updated_at`, contrainte de longueur, déclencheur `updated_at` -- migration
- [x] `lib/domain/notes.ts` + test -- type, filtre, validation -- règles pures
- [x] `lib/db/notes.ts` -- `listNotes(type?)`, `getNote(id)` -- lecture
- [x] `app/(app)/notes/actions.ts` -- `updateNote`, `deleteNote`, type à la création -- écriture
- [x] `components/note-form.tsx`, `components/delete-note.tsx` -- formulaire partagé et suppression avec confirmation -- interface
- [x] `app/(app)/notes/page.tsx`, `app/(app)/notes/[id]/page.tsx` -- filtres, lien vers la note, page de modification -- pages
- [x] `docs/journal.md` -- entrée de la story

**Acceptance Criteria:**
- Given une note existante, when je la modifie et j'enregistre, then le changement est visible après rechargement.
- Given plusieurs types, when je clique sur « Procédures », then seules les procédures s'affichent ; « Toutes » les rétablit.
- Given une note, when je demande la suppression et je confirme, then elle disparaît de la liste ; si j'annule, elle reste.
- Given l'adresse d'une note d'un autre compte ou inconnue, when je l'ouvre, then je vois une page introuvable.
- Given la migration appliquée, when j'inspecte la base, then `type`, `updated_at` et la contrainte existent et le conseiller de sécurité ne signale rien de nouveau sur `notes`.

## Implementation Notes

- Implémenté directement (pas de sous-agent : non demandé). Nouveaux fichiers : `lib/format.ts`, `components/delete-note.tsx`, `app/(app)/notes/[id]/page.tsx`. `actions.ts` factorise session et écriture (`withSession`, `save`) pour création et modification ; `deleteNote(id)` est appelée par `useActionState` sans paramètre d'état.
- Migration appliquée avec `apply_migration` après approbation du SQL ; Supabase l'a enregistrée sous la version `20261013132630` et le fichier porte cette version. Après application : type, `updated_at`, contrainte, déclencheur et 4 policies présents ; les 2 notes existantes ont le type `note` ; conseiller de sécurité sans nouvel avertissement.
- Vérifié en local : lint, `tsc`, build, `npm test` 20/20 (après revue : message d'échec visible pendant la confirmation, note disparue distinguée d'une erreur).
- Non vérifié (demande une session) : modification, filtre, suppression avec confirmation et annulation, 404 sur une note inconnue (le statut HTTP exact sous `Suspense` est à contrôler sur la preview).

## Spec Change Log

## Review Triage Log

| Finding | Verdict | Route | Evidence |
|---|---|---|---|
| Message d'échec de suppression affiché seulement hors confirmation | high | patch | Après un échec, la confirmation restait ouverte sans message ; le message s'affiche maintenant dans le groupe de confirmation. |
| Modification ou suppression d'une note disparue ou d'un autre compte : message « Réessaie » trompeur | medium | patch | Zéro ligne affectée distinguée d'une erreur : « Cette note n'existe plus. » |
| Identifiant mal formé traité avant la vérification de session | low | patch | Contrôle d'identifiant déplacé dans l'écriture ; sans session, redirection vers la connexion. |
| « Annuler » et Échap actifs pendant une suppression en cours | medium | patch | Bouton désactivé et Échap ignoré tant que l'envoi est en cours. |
| `aria-current="true"` sur les filtres | low | patch | Remplacé par `"page"`. |
| `listNotes` exige un argument alors que la spec le dit facultatif | low | patch | Valeur par défaut `null`. |
| Test des actions (session, zéro ligne, erreur) et du déclencheur `updated_at` / contrainte de longueur | medium | defer | Aucun client simulé ni banc de test base ; à regrouper avec le script de la story 2.3. |
| Le filtre actif est perdu après modification ou suppression | low | defer | Retour sur `/notes` nu ; à conserver `?type=` si l'usage le demande. |
| Édition concurrente dans deux onglets (dernier enregistrement gagne) | low | false | Un seul propriétaire ; limite connue, sans effet en usage normal. |
| `notFound()` sous `Suspense` peut répondre 200 | low | false | La page « introuvable » s'affiche (critère rempli) ; le statut ne compte que pour des robots, derrière une connexion. |
| `revoke execute` sur `set_updated_at`, `not valid` sur la contrainte, contrainte sur le titre | low | false | Le conseiller de sécurité ne signale rien ; données de démonstration seulement ; le titre est borné par l'application. |
| `aria-required` sur le sélecteur, focus sur le champ en erreur, annonce de l'ouverture, pagination, index par type, abstractions `withSession` | low | false | Le sélecteur a toujours une valeur ; focus et pagination déjà reportés ; abstraction utilisée par trois actions. |

## Design Notes

SQL proposé (montré avant application) :

```sql
create type public.note_type as enum ('note', 'procedure', 'template', 'faq');

alter table public.notes
  add column type public.note_type not null default 'note',
  add column updated_at timestamptz not null default now(),
  add constraint notes_body_length check (char_length(body) <= 50000);

create function public.set_updated_at() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger notes_set_updated_at before update on public.notes
  for each row execute function public.set_updated_at();
```

Les notes existantes (2 notes de test) prennent le type « note » ; leur `updated_at` vaut la date de la migration.

Libellés : Note, Procédure, Modèle, FAQ. Filtre par l'adresse `/notes?type=procedure` (valeurs `note`, `procedure`, `template`, `faq`).

## Verification

**Commands:**
- `npm run lint && npx tsc --noEmit && npm run build && npm test` -- expected: succès

**Manual checks (if no CLI):**
- Après la migration : `list_tables` montre `type` et `updated_at` ; `get_advisors` (sécurité) sans nouvel avertissement sur `notes`.
- Sur la preview : modification visible après rechargement, filtre par type, suppression avec confirmation et annulation, `/notes/<id inconnu>` en 404.
