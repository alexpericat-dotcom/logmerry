---
title: 'Story 5.6 : Écran « À faire » et ligne de synthèse'
type: 'feature'
created: '2026-10-28'
status: 'done'
baseline_commit: 'bd2789f0cfb1cd351fe6f8acd3ba5a9f2a9e6515'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-5-context.md'
  - '{project-root}/docs/ui-rules.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** une note laissée en brouillon (à documenter plus tard) n'est visible que dans le filtre « Brouillons » des notes : rien ne la rappelle, et l'entrée « À faire » de la barre est inactive.

**Approach:** activer l'écran « À faire », qui liste mes notes au statut brouillon, et ajouter sur le cockpit une ligne de synthèse « N procédures à documenter » qui y mène. Ce n'est pas une tâche : elle n'entre ni dans `todayTasks`, ni dans le décompte du jour.

## Boundaries & Constraints

**Always:**
- Écran « À faire » : mes notes `status = draft`, de la plus récente à la plus ancienne ; chaque ligne ouvre l'éditeur de la note (`/notes/{id}`) ; type, fiche liée et date visibles. Lecture par `listNotes(null, "draft")` (RLS : mes notes seulement).
- Décision d'Alex (28 octobre) : tout brouillon, quel que soit son type ; l'écran et la ligne comptent la même liste.
- Ligne de synthèse sous les tâches du cockpit : « 2 procédures à documenter » quand tous les brouillons sont des procédures, sinon « 2 brouillons à documenter » ; « 1 procédure à documenter » / « 1 brouillon à documenter » au singulier ; lien vers « À faire », absente à 0. Le libellé est calculé par une fonction pure testée (`draftSummary(types)`).
- L'entrée « À faire » de la barre devient disponible (`lib/nav.ts`) ; le test de la barre est mis à jour.
- Aucun appel IA : une note brouillon vide n'est jamais envoyée à l'IA (rien n'est indexé ni envoyé par cette story).
- Cockpit : la ligne tient dans l'écran compact, sans le rallonger de plus d'une ligne ; tutoiement, thèmes clair et sombre, 44 px sur téléphone.

**Never:** créer ou modifier des notes depuis « À faire » (l'éditeur existe) ; migration ; faire de la ligne une tâche cochable ; indexer ou résumer un brouillon.

## I/O & Edge-Case Matrix

| Scénario | Entrée / État | Comportement attendu | Erreur |
|----------|--------------|---------------------|--------|
| Brouillons | 3 notes brouillon, 2 actives | l'écran en liste 3 ; cockpit : « 3 … à documenter » | N/A |
| Un brouillon | 1 | singulier : « 1 procédure à documenter » | N/A |
| Aucun | 0 brouillon | écran : message vide ; cockpit : ligne absente | N/A |
| Ouverture | clic sur une ligne | éditeur de la note | N/A |
| Lecture en échec | erreur de base | message d'erreur de la page (comme les autres écrans) | message, rien d'affiché |

</frozen-after-approval>

## Code Map

- `lib/nav.ts`, `lib/nav.test.ts` -- entrée « À faire » (`available: false`), test de la liste des entrées disponibles.
- `app/(app)/a-faire/page.tsx` -- nouvelle page (à créer), modèle : `app/(app)/notes/page.tsx` (carte de note, pastilles `NOTE_TYPE_LABELS`, `formatDateTime`, `excerpt`).
- `lib/db/notes.ts` -- `listNotes(type, status)` déjà prêt pour le filtre brouillon ; ne pas modifier.
- `lib/domain/cockpit/` -- nouvelle fonction pure `draftSummary(types)` (libellé singulier/pluriel, « procédure » seulement si tous les brouillons en sont, null à 0) + test ; ne pas toucher `todayTasks`.
- `app/(app)/aujourd-hui/page.tsx` -- lire le nombre de brouillons (types des brouillons), afficher la ligne sous les tâches (panneau « À faire aujourd'hui »).
- `app/(app)/notes/actions.ts` -- les écritures de notes revalident déjà `/notes` ; ajouter `/a-faire` et `/aujourd-hui`.
- `tests/isolation.test.ts` -- bloc notes : un compte B ne voit pas les brouillons de A (déjà couvert par la RLS des notes ; vérifier, ne pas dupliquer).

## Tasks & Acceptance

**Execution:**
- [ ] `lib/domain/cockpit/summary.ts` + test -- `draftSummary(types)` : singulier, pluriel, procédures seules ou mélange, absente à 0 -- logique pure testée
- [ ] `lib/nav.ts`, `lib/nav.test.ts` -- « À faire » disponible -- barre
- [ ] `app/(app)/a-faire/page.tsx` -- écran des brouillons, état vide, erreur -- interface
- [ ] `app/(app)/aujourd-hui/page.tsx` -- ligne de synthèse avec lien -- cockpit
- [ ] `app/(app)/notes/actions.ts` -- revalidation de `/a-faire` et `/aujourd-hui` -- à jour au retour

**Acceptance Criteria:**
- Given des notes brouillon, when j'ouvre « À faire », then je les vois listées et cliquer sur l'une ouvre l'éditeur.
- Given au moins un brouillon, when j'ouvre le cockpit, then la ligne de synthèse s'affiche sous les tâches (singulier pour 1) et mène à « À faire » ; à 0 elle est absente.
- Given la ligne de synthèse, then elle n'est ni dans la liste des tâches ni dans leur décompte.
- Given un brouillon vide, then aucun appel IA n'a lieu.

## Implementation Notes

Implémentée directement. Cockpit : la ligne de synthèse lit seulement les types des brouillons (`listDraftTypes`), pas les textes ; sa lecture en échec la masque sans bloquer le cockpit. Vérifié : 442 tests unitaires, `tsc`, lint ; dans Chrome (compte de démo A, deux brouillons fictifs ajoutés) : « 2 procédures à documenter » sous les tâches, écran « À faire » listé, entrée de la barre active. Pas d'ouverture de l'éditeur testée au clic.

## Spec Change Log

## Review Triage Log

Relecture 5.6 (3 relecteurs, 28 octobre). patch : le cockpit lisait les textes entiers des brouillons pour les compter (medium : `listDraftTypes`, types seulement) ; une lecture en échec bloquait tout le cockpit pour une ligne secondaire (low, correction directe : masquée) ; libellé d'accessibilité « Notes brouillon » (low). false : titre vide (obligatoire à la saisie), type inconnu (énumération fermée), erreur de `error.tsx` non journalisée (même modèle que les autres écrans), lien collé aux paramètres manquants (espacement du panneau vérifié à l'écran), cache périmé après renommage de fiche (pages dynamiques, sans cache), autres écrivains de notes (ils ne changent que `index_status`, non affiché ici). defer : liste « À faire » sans limite (comme la liste Notes), revalidations non testées (aucun précédent de test d'action serveur).

## Verification

**Commands:**
- `npm test` -- expected: tous verts
- `npx tsc --noEmit && npm run lint` -- expected: aucune erreur

**Manual checks (if no CLI):**
- Chrome : cockpit avec 0, 1 puis plusieurs brouillons (compte de démo A) ; l'écran « À faire » et son état vide ; clic vers l'éditeur ; thèmes clair et sombre, téléphone ; le cockpit tient toujours sur un écran.
