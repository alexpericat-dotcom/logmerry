---
title: 'Dette, lot D3 : accessibilité (gantt, encaissements, calendrier)'
type: 'refactor'
created: '2026-10-29'
status: 'in-progress'
route: 'dispatch'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** quatre défauts d'accessibilité notés dans `deferred-work.md` (section 5), tous vérifiés dans le code le 29 octobre : (1) les jalons du gantt (boutons d'échéance, liens de facture) ont une cible de 24 px (`min-h-6`), la règle du projet est 44 px au téléphone ; (2) `Échap` ne ferme pas la fiche ouverte sous le gantt ; (3) supprimer un encaissement pendant que le formulaire d'ajout est ouvert perd le focus (`addRef` est vide : le bouton « Ajouter un encaissement » n'est pas rendu) ; (4) changer d'affichage ou de période du calendrier n'est annoncé par aucune région vocale.

**Approach:** quatre petits correctifs, un commit chacun, sans changer l'apparence sur ordinateur : (1) `max-md:min-h-11` sur les jalons ; (2) `Échap` dans la fiche du jalon la ferme et rend le focus au jalon (même chemin que « Fermer ») ; (3) quand le formulaire d'ajout est ouvert, le focus va à son premier champ (« Montant ») après une suppression, sinon au bouton comme aujourd'hui ; (4) la région vocale du calendrier annonce « Affichage : Kanban » ou « Période : Ce mois-ci » après un changement (jamais au premier rendu).

## Boundaries & Constraints

**Always:** aucune action serveur, aucune migration, aucune dépendance ; mêmes ids et mêmes textes visibles qu'aujourd'hui ; focus donné sans défilement automatique sous l'en-tête fixe (`focus({ preventScroll: true })` puis `scrollIntoView({ block: "center" })`, comme dans `invoice-payments.tsx`) ; l'annonce du calendrier réutilise la région `role="status"` existante de `deadlines-panel.tsx` (pas de seconde région) ; textes en français.

**Never:** toucher aux autres jalons ou au kanban ; ajouter un piège à clavier (`Échap` ne fait rien si la fiche est fermée ; il ne ferme pas une confirmation de suppression ouverte dans la fiche : `ConfirmPanel` gère déjà son propre `Échap`) ; annoncer au chargement de la page.

**Écarts assumés (restent en dette, non vérifiables sans vrai téléphone ou lecteur d'écran) :** glisser au toucher, focus du kanban après « faite » sur une colonne hors écran, régions vocales testées avec un vrai lecteur d'écran, titre de niveau 3 des tâches, ligne de story à 412 px.

## I/O & Edge-Case Matrix

| Scénario | Entrée / état | Comportement attendu |
|----------|---------------|----------------------|
| Jalon, téléphone | largeur < 768 px | cible d'au moins 44 px de haut ; ordinateur inchangé |
| Échap dans la fiche | fiche d'un jalon ouverte, focus dedans | la fiche se ferme, le focus revient au jalon |
| Échap, fiche fermée | aucune fiche | rien |
| Échap, confirmation ouverte | « Supprimer » en confirmation dans la fiche | la confirmation se ferme (comportement de `ConfirmPanel`), la fiche reste |
| Suppression, formulaire fermé | bouton « Ajouter un encaissement » présent | focus au bouton (inchangé) |
| Suppression, formulaire ouvert | formulaire d'ajout visible | focus au premier champ du formulaire ; annonce « Encaissement supprimé. » |
| Changement d'affichage | clic « Kanban » (ou « Liste », « Gantt ») | annonce « Affichage : Kanban » |
| Changement de période | clic « Ce mois-ci » | annonce « Période : Ce mois-ci » |
| Premier rendu | arrivée sur la page | aucune annonce |
| Même vue recliquée | l'adresse ne change pas | aucune nouvelle annonce |

</frozen-after-approval>

## Code Map

- `components/deadline-gantt.tsx` : jalons (lignes 126 et 139 : `min-h-6`), fermeture de la fiche (focus au jalon), `Échap`.
- `components/invoice-payments.tsx` : `deleted` (focus du bouton ou du formulaire).
- `components/payment-form.tsx` : identifiant du premier champ (`${idPrefix}-amount`, à vérifier).
- `components/deadlines-panel.tsx` : `announce` et effet sur `[view, display]`.
- `lib/domain/calendar-panel.ts` : libellé d'annonce pur (testable) si besoin ; `DISPLAY_LABELS`, `DEADLINE_VIEW_LABELS` existants.
- Tests : `tests/components/` (doublure des actions serveur si possible ; sinon fonction pure extraite + contrôle à la main).

## Tasks & Acceptance

- [ ] Jalons : `max-md:min-h-11` sur les deux sortes de jalons.
- [ ] Gantt : `Échap` ferme la fiche et rend le focus au jalon.
- [ ] Encaissements : le focus va au premier champ du formulaire d'ajout quand il est ouvert.
- [ ] Calendrier : annonce de l'affichage et de la période, absente au premier rendu.
- [ ] Mutations à la main (cible non agrandie, `Échap` sans effet ou sans retour de focus, focus au bouton absent, annonce au premier rendu) : détectées dans la mesure où un test les couvre ; les autres notées en dette.
- [ ] Journal, dette, 3 relecteurs, `npm test`, `tsc`, lint, `next build` en copie propre.
- [ ] Contrôle visuel à faire par Alex : gantt (clair, téléphone, clavier : `Tab` jusqu'au jalon, `Entrée`, `Échap`), suppression d'un encaissement avec le formulaire ouvert.

**Acceptation :** jalons de 44 px au téléphone, `Échap` ferme la fiche sans piège, aucun focus perdu après une suppression d'encaissement, changement d'affichage ou de période annoncé une fois.

## Review Triage Log

(à remplir après les relecteurs)
