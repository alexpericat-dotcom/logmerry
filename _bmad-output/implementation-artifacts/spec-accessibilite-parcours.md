---
title: 'Accessibilité des parcours principaux (story 7.2) : audit au clavier, aux contrastes et aux libellés, puis corrections'
type: 'chore'
created: '2026-10-29'
status: 'in-review'
route: 'dispatch'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** la story 7.2 demande que les parcours UJ-1 (cockpit du lundi matin), UJ-4 (saisie après un premier rendez-vous) et UJ-5 (paiement, profil, plafonds) se fassent **au clavier seul**, avec un focus visible, des contrastes de 4,5:1 (clair et sombre), aucun état porté par la couleur seule, et des formulaires dont chaque champ a son libellé et un récapitulatif d'erreurs. Les lots D2 (formulaires), D3 (calendrier, gantt, encaissements) et D4 (liste de contrôle visuelle) ont traité des morceaux, jamais un parcours entier mesuré de bout en bout, et la dette (`deferred-work.md`, section 5) en liste encore plusieurs points.

**Approach:** (1) **mesurer** : audit automatisé (Lighthouse accessibilité) et audit scripté dans le navigateur sur les pages des trois parcours, en thème clair et sombre, à 1280 px et à 400 px ; (2) **parcourir au clavier** chaque parcours (Tab, Maj+Tab, Entrée, Espace, flèches, Échap) et noter tout blocage, focus invisible ou perdu, ordre incohérent ; (3) **mesurer les contrastes** du texte rendu (rapport calculé sur les couleurs réelles) ; (4) écrire `docs/audit-accessibilite.md` (tableau par page : constat, gravité, correctif) ; (5) **corriger** les défauts bloquants et simples, un commit chacun, et reporter le reste en dette avec son motif.

## Boundaries & Constraints

**Always:** les mesures se font sur le compte de démo A (données fictives) ; chaque défaut du rapport cite la page, le thème, la largeur et ce qui est observé ; un correctif ne change ni le texte visible ni la disposition sur ordinateur, sauf si c'est le défaut lui-même ; tout correctif de composant garde ses tests et en gagne un quand c'est faisable (fonction pure ou test de composant) ; les cibles tactiles restent de 44 px sur téléphone ; l'état n'est jamais porté par la couleur seule (icône ou mot en plus) ; aucune dépendance ajoutée.

**Never:** refondre le design ni changer les couleurs de la charte sans décision d'Alex (un contraste insuffisant est d'abord signalé avec la valeur mesurée et la correction proposée) ; toucher au comportement métier (cockpit, factures, plafonds) ; prétendre qu'un lecteur d'écran réel a été testé (VoiceOver reste un contrôle d'Alex) ; corriger en masse sans mesure.

**Limites assumées :** un audit automatisé ne détecte qu'une partie des défauts (environ un tiers) ; le glisser-déposer au toucher, les annonces vocales et la lecture réelle au lecteur d'écran restent des contrôles d'Alex, listés dans `docs/controles-visuels.md`.

## Décisions à valider

1. **Périmètre des pages (proposition) :** UJ-1 : connexion, cockpit `/aujourd-hui`, calendrier `/calendrier` ; UJ-4 : clients (liste, fiche, création), notes (liste, création), missions (liste, fiche avec backlog, sprint, devis), assistant (panneau) ; UJ-5 : factures, plafonds, profil, règles. Hors périmètre : la page À faire et la palette ⌘K (déjà couvertes en D3 et par tests).
2. **Seuil de correction :** je corrige sans redemander les défauts de gravité « bloquant au clavier » ou « libellé manquant » ; pour un contraste sous 4,5:1 qui demande de changer une couleur de la charte, je te montre la valeur mesurée et la correction proposée avant de toucher au code.
3. **Rapport :** `docs/audit-accessibilite.md`, en français, réutilisable pour la démo et pour le tuteur (critère « qualité de l'expérience »).

## I/O & Edge-Case Matrix

| Scénario | Mesure | Attendu |
|----------|--------|---------|
| Parcours au clavier seul (UJ-1, UJ-4, UJ-5) | Tab, Maj+Tab, Entrée, Espace, flèches, Échap | toute action atteignable ; ordre logique ; aucun piège |
| Focus | page après page, clair et sombre | un contour visible sur chaque élément atteint ; jamais caché sous l'en-tête fixe |
| Contraste du texte | rapport calculé sur les couleurs réelles | au moins 4,5:1 (texte courant), 3:1 (texte large et composants) |
| État sans couleur | statuts, pastilles, anneaux, coches | un mot ou une icône double chaque couleur |
| Formulaires | champs de chaque formulaire des parcours | libellé associé, aide liée, récapitulatif d'erreurs avec focus |
| Téléphone (400 px) | mêmes pages | cibles de 44 px, aucun défilement horizontal de page |
| Lighthouse accessibilité | page par page | score relevé ; chaque échec expliqué ou corrigé |

</frozen-after-approval>

## Code Map

- Mesures : navigateur piloté (Chrome DevTools), `lighthouse_audit`, scripts d'évaluation dans la page (ordre de tabulation, contours, rapports de contraste).
- Composants probables : `components/app-sidebar.tsx`, `components/today-tasks.tsx`, `components/kpi-tile.tsx`, `components/filter-chips.tsx`, `components/story-list.tsx`, `components/sprint-block.tsx`, `components/invoice-payments.tsx`, `components/assistant-panel.tsx`, `components/form-helpers.tsx` ; jetons de couleur dans `app/globals.css`.
- Livrables : `docs/audit-accessibilite.md` ; `docs/controles-visuels.md` (contrôles restant à Alex) ; `deferred-work.md` (section 5 mise à jour) ; `docs/journal.md`.

## Tasks & Acceptance

- [x] Audit Lighthouse (accessibilité) : 5 pages en ordinateur seulement (écart : pas de 400 px ni toutes les pages, voir les limites du rapport).
- [x] Parcours clavier : focus visible et ouverture des formulaires sur toutes les pages mesurées ; parcours touche par touche sur UJ-5 seulement (écart : UJ-1 et UJ-4 restent à Alex).
- [x] Mesure des contrastes du texte rendu, thèmes clair et sombre.
- [x] `docs/audit-accessibilite.md` : tableau des constats avec gravité et correctif.
- [x] Corrections des défauts bloquants et simples (un commit chacun, tests quand c'est faisable) ; contrastes à valider avec Alex.
- [x] Journal, dette, 3 relecteurs sur les correctifs ; `npm test`, `tsc`, lint, `next build` en copie propre.
- [ ] Contrôle d'Alex : parcours au clavier seul sur son poste, lecteur d'écran (facultatif).

**Acceptation :** les trois parcours se font au clavier seul sans blocage ; chaque champ de formulaire a son libellé ; le rapport liste ce qui reste (avec motif) ; aucun contraste de texte courant sous 4,5:1 sans décision écrite d'Alex.

## Review Triage Log

(29 octobre 2026, 3 relecteurs, 32 constats, aucun bloquant)

Corrigés : formulaires de **modification** en place (facture, encaissement, échéance, sprint, devis, contact, story) qui perdaient aussi le focus (constat Edge Case Hunter, confirmé au navigateur : 4 cas perdus, tous corrigés) ; `FocusOnMount` saute un champ en lecture seule, une case, un bouton, et essaie le champ suivant si le premier ne prend pas le focus ; tests : champ en lecture seule, zone de texte, non-reprise du focus à un nouveau rendu (le test sur `className` jugé tautologique est retiré) ; rapport réécrit pour ne dire que ce qui est étayé (listes nominales par mesure, « 100 » sur les 5 pages Lighthouse, 7 boutons dans la dette de départ, limites de méthode, un seul parcours clavier touche par touche), scripts versionnés dans `docs/audit-accessibilite-scripts.md`.
Reportés (dette) : retour du focus après « Annuler » pour factures, devis, règles ; liens d'en-tête de colonne étroits ; anneau de focus de 1 px ; câblage de `FocusOnMount` sans test par conteneur ; formulaire de modification d'une proposition d'histoire IA non enveloppé (il est précédé d'un éditeur de tâches, le focus y est géré par la carte) ; `scrollIntoView` centré sur les longs formulaires au téléphone avec le clavier virtuel ; parcours UJ-1 et UJ-4 touche par touche.
Rejetés : `scrollIntoView` après `preventScroll` (voulu : pas de saut, puis centrage doux, comme `focusField`) ; focus volé au chargement (aucun formulaire n'est affiché à l'arrivée, vérifié par les `useState(false)` et sur le build) ; formulaires d'ajout de story et de sprint sans focus (ils en ont un, vérifié sur le build) ; ordre des imports dans `deadlines-panel.tsx` (le lint passe).
