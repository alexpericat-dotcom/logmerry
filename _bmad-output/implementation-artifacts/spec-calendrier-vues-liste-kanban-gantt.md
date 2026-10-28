---
title: 'Calendrier : vues liste, kanban et gantt'
type: 'feature'
created: '2026-10-28'
status: 'done'
baseline_commit: '5e87cb33c4eba083592d06bb52ad4e8e3d24b1b3'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-5-context.md'
  - '{project-root}/docs/ui-rules.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** le calendrier n'a qu'une présentation, une liste en trois sections (En retard, À venir, Faites) ; Alex veut aussi voir ses échéances en tableau kanban et en diagramme de Gantt.

**Approach:** un sélecteur d'affichage « Liste / Kanban / Gantt » au bandeau du calendrier (dans l'adresse : `?affichage=`), qui s'ajoute aux filtres de période existants (Toutes, Aujourd'hui, Cette semaine, Ce mois-ci, En retard). Les trois affichages lisent les mêmes lignes (échéances saisies et lignes calculées) : même source, aucune donnée nouvelle.

## Boundaries & Constraints

**Always:**
- Décisions d'Alex (28 octobre) : **kanban** en colonnes dans le temps (En retard, Cette semaine, Ce mois-ci, Plus tard, Faites), sans glisser-déposer (on déplace une carte en la cochant « faite ») ; **gantt** en jalons (un losange à la date limite sur un axe du temps, une ligne par catégorie), sans barre inventée.
- Codes couleur d'urgence dans les trois affichages : en retard (destructif), urgent = aujourd'hui à 3 jours (orange), cette semaine = 4 à 7 jours (jaune), plus tard (teal), faite (atténué). Une fonction pure `urgency(date, faite, aujourd'hui)` les décide ; chaque niveau a aussi son texte (« En retard », « Urgent », « Cette semaine », « Plus tard », « Faite ») : la couleur ne porte jamais seule l'information. Jetons de couleur seulement, contrastes lisibles dans les deux thèmes.
- La liste reste l'affichage par défaut, inchangée. Le filtre de période s'applique aux trois affichages.
- Cocher « fait », rouvrir, modifier et supprimer une échéance gardent les mêmes actions que la liste (`DeadlineRow`, `markDeadlineDone`) depuis le kanban ; le gantt ouvre la même fiche par un lien.
- Les lignes calculées (factures à émettre ou à relancer) s'affichent avec leur lien, en lecture seule ; les lignes « À confirmer » (sans date) restent dans leur section sous l'affichage choisi : jamais placées sur une date.
- Accessibilité : chaque affichage a une alternative textuelle équivalente (liste ou tableau lu par les lecteurs d'écran) ; toute action faisable à la souris l'est au clavier ; 44 px sur téléphone ; aucune couleur écrite en dur (jetons `tone-*`), thèmes clair et sombre ; le texte ne passe jamais par la couleur seule.
- Fonctions pures pour le regroupement des colonnes et le calcul de l'échelle du gantt, testées (`node --test`) ; aucune migration.

**Never:** modifier le modèle `deadlines` ; estimer ou inventer une date ; faire du calendrier un agenda (pas de rendez-vous) ; ajouter une bibliothèque autre que dnd-kit (et seulement si le glisser-déposer est retenu).

## I/O & Edge-Case Matrix

| Scénario | Entrée / État | Comportement attendu | Erreur |
|----------|--------------|---------------------|--------|
| Choix d'affichage | `?affichage=kanban` | le kanban s'affiche, filtre de période conservé | valeur inconnue : liste |
| Calendrier vide | aucune échéance | message vide dans les trois affichages | N/A |
| Kanban | échéances en retard, de la semaine, plus tardives, faites | une carte par échéance dans sa colonne ; cocher « faite » la déplace | échec : message, rien changé |
| Gantt | échéances sur plusieurs mois | échelle de la première à la dernière date, jour courant repéré, retard distingué par texte et couleur | N/A |
| Urgence | en retard, dans 2 jours, dans 6 jours, dans 3 semaines, faite | destructif, orange, jaune, teal, atténué, chacun avec son libellé | N/A |
| Une seule date | une échéance | échelle minimale lisible, pas de division par zéro | N/A |
| Ligne sans date | « À confirmer » | reste dans sa section, hors kanban et gantt | N/A |
| Téléphone | écran étroit | le gantt défile horizontalement ; le kanban passe en colonnes empilées | N/A |

</frozen-after-approval>

## Code Map

- `app/(app)/calendrier/page.tsx` -- lit `searchParams` (déjà `vue`) ; y ajouter `affichage`.
- `components/deadlines-panel.tsx` -- client : filtre par vue (`inView`), sections, `FilterChips` du bandeau ; y brancher le sélecteur d'affichage et rendre kanban ou gantt à la place des sections (la liste reste telle quelle).
- `lib/domain/deadlines.ts` -- `DEADLINE_VIEWS`, `inView`, `groupDeadlines`, `parseDeadlineView` : modèle pour `parseDisplay` et pour les fonctions de regroupement (nouveau `lib/domain/deadline-boards.ts` + test).
- `components/deadline-row.tsx`, `components/calendar-line-row.tsx`, `components/filter-chips.tsx` -- réutilisés ; ne pas modifier le comportement des actions.
- `components/dashboard-widgets.tsx` (`MiniCalendar`, jetons `tone-*`) -- modèle visuel (SVG, tableau sr-only).

## Tasks & Acceptance

**Execution:**
- [ ] `lib/domain/deadline-boards.ts` + test -- `parseDisplay`, `urgency`, colonnes du kanban, échelle et jalons du gantt -- logique pure testée (une ligne de test par ligne de la matrice)
- [ ] `components/deadline-kanban.tsx`, `components/deadline-gantt.tsx` -- les deux affichages, avec leur alternative textuelle -- interface
- [ ] `components/deadlines-panel.tsx`, `app/(app)/calendrier/page.tsx` -- sélecteur « Liste / Kanban / Gantt » dans l'adresse -- branchement

**Acceptance Criteria:**
- Given le calendrier, when je choisis Kanban ou Gantt, then mes échéances s'y affichent avec le même filtre de période et l'adresse garde mon choix.
- Given une échéance dans le kanban, when je la coche faite, then elle passe en « Faites » comme dans la liste.
- Given des lignes « À confirmer », then elles ne sont placées sur aucune date.
- Given des échéances à des urgences différentes, then chacune porte sa couleur et son libellé d'urgence (liste, kanban, gantt), avec la même règle.
- Given le gantt ou le kanban, then un lecteur d'écran obtient la même information en texte.

## Implementation Notes

Implémentée directement. Kanban en cinq colonnes dans le temps, sans glisser-déposer ; gantt en jalons sur un axe fixe, une ligne par catégorie (« Factures » pour les lignes calculées), seulement les échéances à faire ; codes couleur d'urgence (`urgency`) dans la liste, le kanban et le gantt, toujours avec leur libellé. Le sélecteur d'affichage et les périodes se gardent l'un l'autre dans l'adresse (`calendarHref`). **Écarts avec le texte figé, à confirmer par Alex** : (1) le gantt n'ouvre pas de « fiche » d'une échéance saisie (il n'existe pas de page par échéance) : un jalon est du texte, la modification se fait en Liste ou en Kanban ; seul un jalon de facture est un lien ; (2) les échéances faites ne figurent pas au gantt. Vérifié : 450 tests unitaires, `tsc`, lint. **Rendu non vérifié dans Chrome** : la session du compte de démo a expiré (mes scripts de remplissage la fermaient ; corrigé, ils ferment maintenant seulement leur propre session) et je n'ai pas le droit de lire le mot de passe du compte de démo.

## Spec Change Log

## Review Triage Log

Relecture (3 relecteurs, 28 octobre). patch : couleur du haut des colonnes construite par `replace` sur un nom de classe (Tailwind ne génère pas ce qu'il ne lit pas en toutes lettres : classes `top` littérales) ; libellé d'urgence « Cette semaine » (glissant) confondu avec la colonne du même nom (jusqu'au dimanche) : « Sous 7 jours » ; une échéance faite ancienne étirait l'axe du gantt (les faites n'y figurent plus) ; niveaux des jalons calculés sur une largeur différente de celle affichée (axe de largeur fixe, jalons en pixels) ; balisage invalide (trait dans une liste, titre `h2` par ligne) ; graduations trop nombreuses sur un axe long ; `today` facultatif dans `CalendarLineRow` (obligatoire) ; placement des niveaux et construction de l'adresse non testés (extraits dans le domaine, testés). false : date mal formée (colonne `date` de la base), clé « Factures » en conflit avec une catégorie (les catégories sont une liste fermée), libellé « À faire » remplacé dans la liste (voulu : codes couleur demandés par Alex), contraste des jetons `tone-*` avec `action-foreground` (mêmes paires que les tuiles du cockpit). defer : cible tactile de 44 px des liens du gantt (diagramme à défilement horizontal, usage bureau), focus après « faite » sur un titre de colonne hors écran, colonne « Faites » sans limite, écart de couleur entre la barre d'une colonne et les pastilles de ses cartes.

## Verification

**Commands:**
- `npm test` -- expected: tous verts
- `npx tsc --noEmit && npm run lint` -- expected: aucune erreur

**Manual checks (if no CLI):**
- Chrome : les trois affichages avec le compte de démo A, thèmes clair et sombre, téléphone ; cocher une échéance depuis le kanban ; navigation au clavier.
