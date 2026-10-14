---
title: 'Story 3.2 : Ajouter des contacts et passer un prospect en client'
type: 'feature'
created: '2026-10-15'
status: 'done'
baseline_commit: 'c383dc36ff0249429157e1081a9b33df3f9ca335'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-3-context.md'
  - '{project-root}/docs/ui-rules.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** une fiche prospect ou client ne dit pas avec qui je parle, et passer un prospect en client oblige à ouvrir le formulaire et changer le menu « Statut ».

**Approach:** une migration crée la table `contacts` (rattachée obligatoirement à une fiche, RLS qui vérifie aussi que la fiche m'appartient) ; la page fiche affiche la liste des contacts, un formulaire d'ajout et la modification et la suppression d'un contact ; un bouton « Passer en client » (visible seulement sur un prospect) change le statut en un clic, contacts conservés.

## Boundaries & Constraints

**Décisions du propriétaire :** un contact peut être modifié et supprimé (comme les fiches) ; champs d'un contact : nom (obligatoire), fonction, e-mail, téléphone, adresse (tous facultatifs) ; adresse et téléphone de la fiche elle-même reportés à l'epic 4 ; « contact principal » reporté.

**Always:** SQL montré puis approuvé avant application ; fichier de migration nommé avec la version enregistrée par Supabase ; `owner_id uuid not null default auth.uid()` + RLS ; `client_id uuid not null references clients on delete cascade` (un contact ne peut pas exister sans fiche) ; les clés étrangères contournent la RLS : la policy d'insertion et de mise à jour vérifie que la fiche référencée est à moi ; nom 1 à 200 caractères ; fonction 200 caractères au plus ; e-mail 254 caractères au plus, un `@` entouré de texte (validation simple, même règle en base et en serveur) ; téléphone 30 caractères au plus, texte libre sans contrôle de format ; adresse texte libre sur plusieurs lignes, 500 caractères au plus ; un champ facultatif laissé vide est enregistré comme absent (jamais une chaîne vide) ; message de suppression d'une fiche : « Ses contacts seront supprimés aussi » ; tutoiement, erreurs en ligne nommant le champ ; test d'isolation étendu à `contacts`.

**Never:** lien avec les notes (3.3) ; envoi d'e-mail ; import de contacts ; doublons ; adresse ou téléphone de la fiche (epic 4) ; contact principal ; nouvelle dépendance.

## I/O & Edge-Case Matrix

| Scénario | Entrée / État | Comportement attendu | Erreur |
|----------|--------------|---------------------|--------|
| Ajout | nom (+ fonction, e-mail, téléphone, adresse facultatifs) sur une fiche | le contact apparaît sur la fiche, formulaire vidé | N/A |
| Modification | nouveau nom ou autres champs d'un contact | contact mis à jour ; un champ vidé redevient absent | mêmes erreurs que l'ajout ; contact supprimé entre-temps : « Ce contact n'existe plus. » |
| Suppression | « Supprimer » puis confirmation (focus sur « Annuler ») | contact supprimé, la fiche reste | échec : message, contact conservé |
| Nom vide, e-mail mal formé, champ trop long | formulaire | erreur en ligne nommant le champ, saisie conservée | aucune écriture |
| Passer en client | fiche prospect, clic | statut « Client », contacts toujours là, bouton disparu | échec : message, statut inchangé |
| Fiche déjà client | fiche client | pas de bouton « Passer en client » | N/A |
| Fiche supprimée | suppression confirmée | ses contacts disparaissent avec elle | N/A |
| Fiche d'un autre compte | ajout visant l'identifiant d'une fiche étrangère | refusé, rien d'écrit | RLS |
| Sans session | action appelée sans connexion | redirection vers `/auth/login` | N/A |
| Fiche disparue | ajout sur une fiche supprimée entre-temps | « Cette fiche n'existe plus. » | message visible |

</frozen-after-approval>

## Code Map

- `supabase/migrations/20261014174338_clients.sql` -- modèle de table et policies ; `20261013160000_note_chunks_owned_note_policies.sql` -- modèle de policy qui vérifie la propriété de la ligne référencée
- `lib/domain/clients.ts` -- modèle de validation (décompte en points de code, nettoyage) ; nouveau `lib/domain/contacts.ts` + test
- `lib/db/clients.ts` -- modèle de lecture sous RLS ; nouveau `lib/db/contacts.ts` (liste des contacts d'une fiche)
- `app/(app)/clients/actions.ts` -- `withSession` partagé (`lib/supabase/with-session.ts`), schéma signed-out → `redirect` ; nouvelle `app/(app)/clients/contact-actions.ts` (ajout, suppression) et action « Passer en client » dans `actions.ts`
- `app/(app)/clients/[id]/page.tsx` -- page fiche : ajouter la section « Contacts » et le bouton
- `components/client-form.tsx`, `components/delete-client.tsx` -- modèle de formulaire et de confirmation ; texte de suppression à compléter
- `components/data-table.tsx` -- réutilisable pour la liste des contacts si utile, sinon liste simple
- `tests/isolation.test.ts` -- ajouter les cas `contacts` (B ne voit, n'ajoute, ne supprime rien chez A ; ajout visant une fiche étrangère refusé ; cascade à la suppression de la fiche)

## Tasks & Acceptance

**Execution:**
- [x] `supabase/migrations/<version>_contacts.sql` -- table, index, RLS avec vérification de la fiche -- migration (SQL montré avant application)
- [x] `lib/domain/contacts.ts` + test -- validation (nom, fonction, e-mail, téléphone, adresse), champs vides = absents -- règle pure testée
- [x] `lib/db/contacts.ts` -- liste des contacts d'une fiche -- accès sous RLS
- [x] `app/(app)/clients/contact-actions.ts` et `actions.ts` -- ajout, modification et suppression de contact, « Passer en client » -- écritures
- [x] `app/(app)/clients/[id]/page.tsx`, `components/contact-form.tsx` (ajout et modification), `components/delete-contact.tsx`, `components/promote-client.tsx`, `components/delete-client.tsx` -- section contacts, bouton, texte de suppression -- interface
- [x] `tests/isolation.test.ts` -- cas `contacts` -- isolation
- [x] `docs/journal.md` -- entrée de la story

**Acceptance Criteria:**
- Given une fiche prospect, when j'ajoute un contact avec un nom, then il apparaît sur la fiche ; avec un e-mail mal formé, then une erreur en ligne nomme le champ.
- Given un contact, when je le modifie ou le supprime (après confirmation), then la fiche le reflète ; when la suppression échoue, then il reste.
- Given un prospect avec des contacts, when je clique « Passer en client », then le statut devient « Client » et les contacts sont toujours listés.
- Given un contact, when sa fiche est supprimée, then il disparaît ; given un identifiant de fiche d'un autre compte, when j'ajoute un contact, then c'est refusé (prouvé par `npm run test:isolation`).
- Given la migration appliquée, then `get_advisors` (sécurité) ne signale rien de nouveau.

## Implementation Notes

- Migration appliquée le 2026-10-15 (version 20261014230836, fichier renommé) ; `get_advisors` : seul l'avertissement déjà connu, rien de nouveau. Isolation 34/34 (8 cas `contacts`).
- Écart au Code Map : « Passer en client » est dans `app/(app)/clients/actions.ts` (`promoteToClient`), le bouton dans l'en-tête de la page fiche (`actions` du bandeau) ; `components/contacts-section.tsx` regroupe la liste, l'ajout, la modification en place et la suppression avec confirmation (pas de `delete-contact.tsx` séparé).
- `addContact` lit d'abord la fiche pour distinguer « fiche disparue » d'une erreur de base ; la RLS refuse de toute façon une fiche étrangère.
- Vérifié dans Chrome (compte de démonstration A, fiche de test supprimée ensuite) : liste vide, erreurs en ligne (nom, e-mail), ajout avec tous les champs, modification (téléphone vidé = `null` en base), passage en client (contacts conservés, bouton disparu, statut en base), suppression avec confirmation (focus sur « Annuler »).
- Écart connu avec la matrice : la redirection sans session et l'échec de la base ne sont pas testés automatiquement (même choix que les notes et les fiches) ; l'accès anonyme à la table l'est.

## Spec Change Log

## Review Triage Log

| Constat (relecteur) | Verdict | Route | Preuve / décision |
|---|---|---|---|
| Formulaire de la fiche non réinitialisé après « Passer en client » : l'enregistrer remettrait le statut à prospect (cas limites) | high | patch | champ non contrôlé gardant sa valeur initiale ; `key` sur le statut et la date de modification ; mesuré dans Chrome : le menu affiche « client » après promotion |
| Le focus se perd après la suppression d'un contact (cas limites) | medium | patch | la ligne disparaît avec le bouton focalisé ; le focus passe au titre de la section, mesuré (`contacts-title`) |
| Lien `tel:` faux pour un numéro avec lettres ou extension (aveugle, cas limites) | medium | patch | « 06 12 (poste 3) » composerait « 06123 » ; lien seulement pour un numéro de chiffres, espaces et `+ ( ) . -` |
| Test « passer en client » auto-réalisé : la remise à prospect n'est pas vérifiée (aveugle, lacune) | low | patch | les deux étapes sont maintenant vérifiées, départ prospect compris ; 34/34 |
| Tests des Server Actions (ajout, modification, suppression, promotion) absents (lacune ×2) | medium | defer | même choix que notes et fiches, entrée de `deferred-work.md` étendue aux contacts |
| `promoteToClient` sans condition `status = prospect` (aveugle, cas limites ×2, lacune) | low | rejeté | seuls deux statuts existent : l'appliquer à un client ne change rien ; double clic inoffensif |
| Pas de revalidation sur les chemins « n'existe plus » (cas limites ×3) | low | rejeté | seulement deux onglets en désaccord ; un rechargement efface la ligne |
| Ligne de contact figée si modifiée ailleurs, `updated_at` absent du type, pas de détection de conflit (aveugle, cas limites) | low | rejeté | mono-utilisateur, comme la fiche |
| Regex d'e-mail JS (`\s`) et Postgres (`[[:space:]]`) non identiques ; `a@b` accepté (aveugle, cas limites, lacune) | low | rejeté | validation volontairement simple (spec) ; écart seulement sur des espaces exotiques, et la base refuse alors proprement |
| `FormData` pouvant contenir un fichier (cas limites) | low | rejeté | requête fabriquée à la main ; même schéma que les autres actions |
| Course « fiche supprimée entre la lecture et l'insertion » : message générique (cas limites) | low | rejeté | la base refuse (code 42501 ou 23503) sans écrire ; seul le message diffère |
| `ContactForm` bloqué sur d'anciennes valeurs, `onDone` répété (aveugle) | false | rejeté | le formulaire est démonté à l'annulation et à la réussite ; `onDone` est un `useCallback` stable |
| `written!` sur une union (aveugle) | low | rejeté | écart de type sans panne : les deux branches s'excluent |
| Migration : pas d'unicité d'e-mail, pas de `revoke anon`, `set_updated_at` à vérifier, pas de retour arrière, SQL non montré (aveugle) | false | rejeté | pas de règle de doublon voulue (spec) ; `anon` n'a aucune règle ; `set_updated_at` est utilisée par la table des fiches ; SQL montré et approuvé dans la conversation |
| Accessibilité : pas de message de succès, `aria-label` du compteur, nombre de contacts dans le message de suppression, pas de confirmation à l'annulation d'une saisie (aveugle) | low | rejeté / defer | succès des formulaires déjà reporté (story 7.2) ; le reste est cosmétique |
| Reformatage de lignes non modifiées dans `[id]/page.tsx` (aveugle) | low | rejeté | cosmétique |
| Écarts avec le Design Notes et la tâche `delete-contact.tsx` (cas limites, affirmations) | low | rejeté | le formulaire remplace la ligne pendant la modification ; fichier unique consigné dans les Implementation Notes |

## Design Notes

Le contact n'a pas de page propre : il vit sur la fiche ; sa modification se fait en place (le formulaire s'ouvre sous le contact). Deux e-mails identiques sur une même fiche sont permis (pas de règle de doublon).

## Verification

**Commands:**
- `npm run lint && npx tsc --noEmit && npm run build && npm test && npm run test:isolation` -- expected: succès

**Manual checks (if no CLI):**
- Après la migration : `list_tables` montre `contacts`, `get_advisors` sans nouvel avertissement ; sur la preview : ajouter, supprimer, passer en client, lecteur d'écran sur le formulaire.
