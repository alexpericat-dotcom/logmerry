---
title: 'Dette, lot D1 : six défauts fonctionnels'
type: 'bugfix'
created: '2026-10-29'
status: 'done'
baseline_commit: 'ee0f20372ffae95bf2ba64a0fca0d90d7ddfebe4'
route: 'dispatch'
review_loop_iteration: 0
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** six points de `deferred-work.md` (section 5), vérifiés dans le code : (1) le filtre `?type=` ou `?statut=brouillon` de `/notes` est perdu : le détail d'une note, « Annuler » et les redirections d'enregistrement et de suppression renvoient tous vers `/notes` nu ; (2) la liste « Mission liée » d'un devis propose aussi les missions terminées et annulées ; (3) la confirmation de suppression d'une mission dit combien de stories partent avec elle, pas combien de sprints ; (4) `mergeReview` valide la story entière : une erreur d'un champ **non coché** (déjà en base) bloque ou trompe ; (5) le message d'erreur du glisser-déposer ne disparaît qu'au déplacement suivant (au dépôt), pas dès qu'on saisit une autre story ; (6) le champ « Date d'encaissement » n'a ni valeur par défaut ni `max` (le serveur refuse déjà une date future : vérifié, `validatePaymentInput`).

**Approach:** un petit commit par point. (1) le filtre voyage dans l'adresse (`/notes/<id>?type=…`, `/notes/nouvelle?type=…`) et dans un champ caché, **relu côté serveur par les analyseurs existants** (`parseTypeFilter`, `parseStatusFilter`) : jamais d'adresse libre, donc pas de redirection ouverte ; (2) liste filtrée aux missions ouvertes (planifiée, en cours) plus la mission déjà liée ; (3) phrase de suppression avec stories **et** sprints, pluriels français ; (4) seules les erreurs des champs cochés comptent ; (5) l'erreur est effacée à la saisie d'une story ; (6) date du jour de Paris par défaut (donnée par le serveur), `max` = ce jour. Le serveur ne change que pour (1) et (4).

## Boundaries & Constraints

**Always:** aucune adresse de retour n'est prise telle quelle d'un formulaire : seuls les filtres `type` (valeur de la liste des types) et `statut=brouillon` sont acceptés ; une valeur inconnue retombe sur `/notes` ; le rendu de la liste des notes et ses filtres ne changent pas ; une mission déjà liée à un devis reste dans la liste de ce devis même si elle est terminée ; la règle serveur sur la date d'encaissement reste celle de `validatePaymentInput` ; aucune dépendance, aucune migration.

**Never:** modifier l'action `createPayment`/`updatePayment` ou `validatePaymentInput` (pas de règle nouvelle) ; ajouter un paramètre `retour` libre ; toucher à la logique de déplacement (`moveStory`, `reorderStories`) ; changer la forme de la liste « Mission liée » de la facture (le sélecteur de mission d'une facture n'est pas dans ce lot : il est dans `invoice-form.tsx`, à examiner seulement s'il a le même défaut, sinon le laisser tel quel et le dire).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Retour filtré | liste `/notes?type=procedure`, ouvrir une note, « Annuler » / enregistrer / supprimer | retour sur `/notes?type=procedure` | N/A |
| Retour brouillons | liste `/notes?statut=brouillon` | retour sur `/notes?statut=brouillon` | N/A |
| Sans filtre | liste `/notes` | retour sur `/notes` | N/A |
| Filtre falsifié | `?type=<script>` ou `type=https://evil` dans l'adresse ou le champ caché | retour sur `/notes` | jamais l'adresse reçue |
| Création | « Créer une note » depuis un filtre | « Annuler » et enregistrement reviennent au même filtre | N/A |
| Mission liée, ouverte | missions planifiée / en cours | proposées | N/A |
| Mission liée, close | mission terminée ou annulée, non liée | absente de la liste | N/A |
| Mission liée, déjà liée | devis lié à une mission terminée | cette mission reste proposée (et sélectionnée) | N/A |
| Suppression de mission | N stories, M sprints (0 à plusieurs) | « Son backlog sera supprimé aussi : 3 user stories, 1 sprint. » ; rien si 0 et 0 ; « 1 user story » au singulier ; sprints seuls (0 story) : « 2 sprints » | N/A |
| Relecture IA | champ non coché invalide déjà en base | pas d'erreur (seuls les champs cochés sont validés et écrits) | un champ coché invalide : erreur de CE champ |
| Relecture IA | rien coché | « Coche au moins un champ à appliquer. » (inchangé) | N/A |
| Glisser-déposer | erreur affichée, nouvelle story saisie | message effacé dès la saisie | N/A |
| Date d'encaissement | nouvel encaissement / modification d'un encaissement | date du jour (Paris) par défaut / valeur existante ; `max` = jour de Paris | une date future saisie à la main : refus du serveur (inchangé) |

</frozen-after-approval>

## Code Map

- `lib/domain/notes.ts` -- `parseTypeFilter`, `parseStatusFilter` (existants) ; ajouter `notesListHref(filter)` et `parseListFilter(type, statut)` (pure, testée).
- `app/(app)/notes/page.tsx` -- liens des cartes (`/notes/${id}`) et « Créer une note » : ajouter le filtre courant ; `[id]/page.tsx` et `nouvelle/page.tsx` : lire `searchParams`, passer le filtre au formulaire et à `DeleteNote`.
- `components/note-form.tsx` (champ caché, lien « Annuler », l. 211), `components/delete-note.tsx` -- reçoivent le filtre.
- `app/(app)/notes/actions.ts` -- `save` (`redirect("/notes")`, l. 119), `deleteNote` (l. 164) : relire le filtre du formulaire (ou de l'argument) par `parseListFilter` ; `tests/actions/notes.test.ts`.
- `components/quotes-section.tsx` (l. 122-130 : liste ; `missions` des `QuoteRow` et du formulaire d'ajout), `app/(app)/clients/[id]/page.tsx` (l. 71 : ne passe que `id` et `title` : ajouter `status`) -- `selectableMissions(missions, currentId)` dans `lib/domain/quotes.ts` (ou missions.ts), testée.
- `components/delete-mission.tsx` (`storyCount`), `app/(app)/missions/[id]/modifier/page.tsx` (l. 24, 42 : `storyCount` ; sprints : `listSprints` existe dans `lib/db/sprints.ts`) -- `missionDeletionNotice(stories, sprints)` dans `lib/domain/missions.ts`, testée.
- `lib/domain/story-review.ts` (`mergeReview`, l. 170-190) et `story-review.test.ts` -- filtrer les erreurs de `validateStoryInput` sur les champs cochés.
- `components/backlog.tsx` (`onDragStart` l. 174, `setDndError` l. 95, 202-215) -- effacer l'erreur à la saisie.
- `components/payment-form.tsx` (l. 84), `invoice-payments.tsx` (`empty`, l. 14, l. 96, 133), `invoice-row.tsx` (a déjà `today`, l. 30-37) -- passer `today` ; valeur par défaut et `max`.
- `_bmad-output/implementation-artifacts/deferred-work.md` (section 5) -- retirer les points résolus.

## Tasks & Acceptance

**Execution:**
- [x] `lib/domain/notes.ts` + tests, `notes/page.tsx`, `[id]/page.tsx`, `nouvelle/page.tsx`, `note-form.tsx`, `delete-note.tsx`, `notes/actions.ts` + `tests/actions/notes.test.ts` -- (1) filtre conservé, relu côté serveur -- retour sur la liste filtrée
- [x] `quotes-section.tsx`, `clients/[id]/page.tsx`, domaine + tests -- (2) missions ouvertes + mission déjà liée
- [x] `delete-mission.tsx`, page de modification de mission, domaine + tests -- (3) stories et sprints dans la confirmation
- [x] `story-review.ts` + tests -- (4) erreurs des seuls champs cochés
- [x] `backlog.tsx` -- (5) erreur effacée à la saisie
- [x] `payment-form.tsx`, `invoice-payments.tsx`, `invoice-row.tsx` -- (6) date du jour et `max`
- [x] `docs/journal.md`, `deferred-work.md` -- journal ; retirer les points résolus

**Acceptance Criteria:**
- Given `npm test`, then les nouveaux tests passent et les anciens sont inchangés.
- Given une mutation (accepter un filtre inconnu, rediriger vers `/notes` nu, ne plus filtrer les missions closes, oublier la mission déjà liée, pluriel ou sprint oublié, valider les champs non cochés), when les tests tournent, then au moins un échoue.
- Given `tsc --noEmit`, `npm run lint` et `next build` (copie propre), then sans erreur.
- Given l'application : filtrer les notes sur « Procédures », ouvrir une note, « Annuler », enregistrer, supprimer : retour sur « Procédures » (contrôle d'Alex).

## Implementation Notes

- (1) `parseListFilter`, `notesListHref`, `notesFilterQuery` dans `lib/domain/notes.ts` ; les cartes, « Créer une note », le détail, la création, `NoteForm` (champs cachés `list_type` et `list_statut` : `type` est déjà le champ du type de la note), `DeleteNote` et les actions (`backTo`, `deleteNote(id, list)`) relisent le filtre par les analyseurs existants. (2) `selectableMissions` (`missions.ts`), liste du devis filtrée ; la page de la fiche passe `status`. (3) `missionDeletionNotice` ; la page de modification lit `listSprints`. (4) `mergeReview` : champs non cochés remplacés par une valeur neutre avant validation. (5) `setDndError("")` à `onDragStart`. (6) `today` passe de `InvoiceRow` à `PaymentForm` (valeur par défaut, `max`) ; serveur inchangé (refuse déjà une date future).
- Le sélecteur « Mission » d'une facture n'a pas le même défaut (champ obligatoire, on facture une mission terminée) : laissé tel quel. Tests après relecture : 5 de domaine (notes 2, missions 2, relecture 1), 5 d'actions, 4 de composants (`PaymentForm` 2, `NoteForm` 3 dont un par filtre) ; dix mutations détectées (le point 5, visuel, n'en a pas). La date du jour par défaut est posée DANS `PaymentForm` (date vide) pour être testée ; `InvoicePayments` ne fait que passer `today`.

## Spec Change Log

## Review Triage Log

Trois relecteurs (Blind Hunter, Edge Case Hunter, Verification Gap).

| # | Constat | Verdict | Preuve / route |
|---|---------|---------|----------------|
| 1 | Câblage du filtre des notes (champs cachés, « Annuler ») sans test : les actions étaient testées à la main | medium | patch : `note-form.test.tsx` (3 cas), doublure de `next/link` dans le chargeur ; deux mutations détectées |
| 2 | Date du jour par défaut posée dans `InvoicePayments`, non testée | medium | patch : le défaut est posé dans `PaymentForm` (date vide), testé |
| 3 | `formData.get(...) as string` et `list.type` de l'action traités comme des textes alors que ce peut être un fichier ou un objet | medium | patch : `text()` ne relit que des textes ; tests (objet, fichier non relus) |
| 4 | Cas d'actions manquants : mise à jour d'une note disparue ou en échec avec un filtre, type et brouillons ensemble | low | patch |
| 5 | `slice(6)` fragile dans un test | low | patch : `URLSearchParams` |
| 6 | Autres entrées vers une note (fiche client, À faire…) sans filtre ; date et `max` périmés après minuit ; filtre de missions seulement à l'affichage ; composants non rendus | low | defer : voulu ou accepté, noté dans la dette (« Suites du lot D1 ») |
| 7 | `mergeReview` : valeur neutre `"-"`, règles entre champs, écriture des champs non cochés | false | `validateStoryInput` n'a aucune règle entre champs (lu) ; seuls les champs cochés sont renvoyés ; un test passe avec titre et rôle invalides en base |
| 8 | Date `max` pour des encaissements « du futur » déjà en base ; mission liée supprimée | false | le serveur refuse les dates futures ; une mission liée à un devis ne peut pas être supprimée (clé étrangère) |
| 9 | `listSprints` charge les lignes pour compter ; phrase « Ses sprints… » ; tâches non citées | low | rejeté (coût négligeable, la page lève déjà sur erreur ; cosmétique) |
| 10 | Test du glisser-déposer | low | defer : dnd-kit difficile à simuler ; dette |
| 11 | Spec : décomptes de tests, journal de triage vide | low | patch (cette mise à jour) |

## Verification

**Commands:**
- `npm test` -- expected: tous les lots passent
- `npx tsc --noEmit && npm run lint` -- expected: sans erreur
- Mutations à la main -- expected: un test échoue à chaque fois, puis restauration
- `next build` dans une copie propre -- expected: passe

**Manual checks (if no CLI):**
- `/notes` filtrée (Procédures, puis Brouillons) : ouvrir une note, Annuler / Enregistrer / Supprimer : retour au même filtre ; créer une note depuis un filtre.
- Fiche d'un client avec une mission terminée : elle n'est pas proposée dans « Mission liée » d'un nouveau devis ; un devis déjà lié à elle la garde.
- Modifier une mission qui a des stories et des sprints : la confirmation les compte.
- Facture : « Ajouter un encaissement » : la date du jour est préremplie et une date future est refusée.
