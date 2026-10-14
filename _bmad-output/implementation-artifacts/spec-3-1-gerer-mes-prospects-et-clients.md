---
title: 'Story 3.1 : Gérer mes prospects et clients'
type: 'feature'
created: '2026-10-14'
status: 'ready-for-dev'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-3-context.md'
  - '{project-root}/docs/ui-rules.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** LogMerry n'a pas de CRM : impossible de noter à qui j'ai affaire, et l'entrée « Clients » de la barre latérale est inactive.

**Approach:** une migration crée la table `clients` (statut prospect/client, étiquette d'origine, RLS) ; une page `/clients` affiche un tableau triable, filtrable par statut et par origine ; une page `/clients/nouvelle` crée une fiche (nom et origine obligatoires) ; une page fiche `/clients/[id]` permet de la modifier (nom, statut, origine) et de la supprimer après confirmation. Le tableau est un composant réutilisable (missions, factures plus tard).

## Boundaries & Constraints

**Always:** SQL montré puis approuvé avant application ; fichier de migration nommé avec la version enregistrée par Supabase ; `owner_id uuid not null default auth.uid()` + RLS (select, insert, update, delete sur `owner_id = (select auth.uid())`) ; enums Postgres `client_status` (prospect, client ; défaut prospect) et `client_origin` (client réel, formation, ami, démo) ; nom 1 à 200 caractères (contrainte base et validation serveur, même décompte) ; filtres et tri dans l'adresse (`?statut=&origine=&tri=&ordre=`), valeur inconnue ignorée ; `<table>` natif avec légende masquée, `aria-sort` sur la colonne triée, nom = lien dans la 1re cellule ; statut en pastille icône + mot (prospect : icône et couleur de signature distinctes des couleurs d'état) ; état `role="status"` « 12 clients sur 40 » après filtre ; liste vide = phrase d'explication + action « Créer une fiche » ; tutoiement, bandeau d'en-tête de page, boutons d'action ; test d'isolation étendu à `clients`.

**Décisions du propriétaire :** modification et suppression incluses dans cette story (calquées sur les notes) ; aucun champ facultatif en dehors du nom, du statut et de l'origine (pas de remarque, d'e-mail, de téléphone ni d'adresse : les contacts avec e-mail viennent à la story 3.2).

**Never:** remarque libre, téléphone, adresse ; contacts et passage prospect → client (story 3.2) ; lien avec les notes (3.3) ; recherche ⌘K dans les clients (3.7) ; missions, devis ; import de fichiers ; détection de doublons ; service externe ; nouvelle dépendance.

## I/O & Edge-Case Matrix

| Scénario | Entrée / État | Comportement attendu | Erreur |
|----------|--------------|---------------------|--------|
| Création | nom + origine | fiche créée en statut « prospect », visible dans le tableau | N/A |
| Nom vide ou d'espaces, origine absente | formulaire | erreur en ligne nommant le champ, saisie conservée | aucune écriture |
| Filtre | `?statut=client&origine=demo` | seules les fiches correspondantes ; « N clients sur M » | valeur inconnue : ignorée |
| Tri | `?tri=nom&ordre=desc` | ordre demandé, `aria-sort` sur la colonne | tri inconnu : date de création, récent d'abord |
| Aucune fiche | compte neuf | phrase d'explication + « Créer une fiche » | N/A |
| Modification | fiche existante, nouveau nom, statut ou origine | fiche mise à jour, tableau à jour | mêmes erreurs que la création ; fiche supprimée entre-temps : « Cette fiche n'existe plus. » |
| Suppression | « Supprimer cette fiche » puis confirmation (focus sur « Annuler ») | fiche supprimée, retour au tableau | échec : message, fiche conservée |
| Autre compte | fiche d'un autre compte | jamais visible, jamais modifiable | RLS |
| Sans session | action appelée sans connexion | redirection vers `/auth/login` | N/A |
| Erreur de la base | échec d'écriture ou de lecture | « Enregistrement impossible. Réessaie. » / message de page d'erreur | message visible |

</frozen-after-approval>

## Code Map

- `supabase/migrations/20261013131016_create_notes.sql` -- modèle de table + policies à imiter ; `…notes_type_updated_at.sql` -- `set_updated_at` à réutiliser si `updated_at` est ajouté
- `lib/domain/notes.ts` -- modèle de validation (`validateNoteInput`, `isUuid`, décompte en points de code) ; nouveau `lib/domain/clients.ts` (enums, libellés, validation, lecture des paramètres d'adresse, tri) + test
- `lib/db/notes.ts` -- modèle de lecture sous RLS (`createClient()` serveur) ; nouveau `lib/db/clients.ts`
- `app/(app)/notes/actions.ts` -- `withSession` (non exporté) et schéma signed-out → `redirect` à refaire dans `app/(app)/clients/actions.ts`
- `app/(app)/notes/page.tsx` + `nouvelle/page.tsx` + `[id]/page.tsx` + `components/note-form.tsx` + `components/delete-note.tsx` -- modèle des pages liste, création, modification et de la suppression avec confirmation ; filtres en liens avec `aria-current`
- `components/page-banner.tsx`, `components/ui/badge.tsx` -- bandeau et pastilles à utiliser ; `components/ui/table.tsx` n'existe pas : créer `components/data-table.tsx` (tableau réutilisable)
- `lib/nav.ts` -- passer « Clients » à `available: true`
- `tests/isolation.test.ts` -- ajouter les cas `clients` ; schéma de l'abonnement des comptes A et B à suivre

## Tasks & Acceptance

**Execution:**
- [ ] `supabase/migrations/<version>_clients.sql` -- enums, table, index `(owner_id, created_at desc)`, RLS, contraintes -- migration (SQL montré avant application)
- [ ] `lib/domain/clients.ts` + test -- enums, libellés, validation, lecture des paramètres, tri -- règles pures testées
- [ ] `lib/db/clients.ts` -- liste filtrée et triée, création -- accès aux données sous RLS
- [ ] `app/(app)/clients/actions.ts` -- `createClientRecord`, `updateClientRecord`, `deleteClientRecord` (Server Actions) -- écriture
- [ ] `components/data-table.tsx` -- tableau réutilisable (légende, `aria-sort`, tri par liens) -- composant du DESIGN
- [ ] `app/(app)/clients/page.tsx`, `nouvelle/page.tsx`, `[id]/page.tsx`, `components/client-form.tsx`, `components/client-status.tsx`, `components/delete-client.tsx` -- pages, formulaire et suppression avec confirmation -- interface
- [ ] `lib/nav.ts` -- activer « Clients » -- navigation
- [ ] `tests/isolation.test.ts` -- cas `clients` -- isolation
- [ ] `docs/journal.md` -- entrée de la story

**Acceptance Criteria:**
- Given aucune fiche, when j'ouvre « Clients », then je vois une phrase d'explication et « Créer une fiche ».
- Given le formulaire, when je saisis un nom et choisis une origine, then la fiche apparaît dans le tableau en statut prospect.
- Given plusieurs fiches, when je filtre par statut ou origine, then le tableau et le compteur suivent ; when je clique un en-tête, then l'ordre change et `aria-sort` l'indique.
- Given une fiche, when je la modifie ou la supprime (après confirmation), then le tableau le reflète ; when la suppression échoue, then la fiche reste.
- Given une fiche d'un autre compte, when je liste ou ouvre son adresse, then rien n'apparaît (prouvé par `npm run test:isolation`).
- Given la migration appliquée, then `get_advisors` (sécurité) ne signale rien de nouveau.

## Implementation Notes

## Spec Change Log

## Review Triage Log

## Design Notes

Colonnes du tableau : Nom (lien), Statut (pastille), Origine, Créée le (mono, à droite). Libellés d'origine : « Client réel », « Formation », « Ami », « Démo ». Pas de pagination au MVP (quelques dizaines de fiches).

## Verification

**Commands:**
- `npm run lint && npx tsc --noEmit && npm run build && npm test && npm run test:isolation` -- expected: succès

**Manual checks (if no CLI):**
- Après la migration : `list_tables` montre `clients`, `get_advisors` sans nouvel avertissement ; sur la preview : créer, filtrer, trier, lecteur d'écran sur le tableau.
