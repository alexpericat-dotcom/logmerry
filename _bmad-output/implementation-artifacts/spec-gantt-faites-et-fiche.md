---
title: 'Gantt : échéances faites visibles et jalon qui ouvre sa fiche'
type: 'feature'
created: '2026-10-29'
status: 'in-progress'
baseline_commit: '924314dbfbc7aa8882733e5877a36ee431bb6002'
route: 'dispatch'
review_loop_iteration: 0
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** le gantt du calendrier n'affiche que les échéances à faire, et un jalon n'est qu'une étiquette : pour modifier, cocher ou supprimer, il faut passer en Liste ou en Kanban (décisions d'Alex du 29 octobre 2026 : les faites doivent y figurer, un jalon doit ouvrir une fiche).

**Approach:** (1) une échéance faite apparaît au gantt, grisée et barrée, sans couleur d'urgence, annoncée « Faite » ; seulement si sa date limite tombe dans les 30 derniers jours (ou plus tard), pour que l'axe reste lisible (décision d'Alex) ; (2) le jalon d'une échéance administrative devient un bouton qui ouvre, sous le diagramme, la fiche existante (`DeadlineRow` : modifier, marquer faite ou rouvrir, supprimer), sans quitter la page ; les jalons de facture restent des liens vers `/factures` (une échéance administrative n'a pas de mission).

## Boundaries & Constraints

**Always:** le filtre de période (`inView`) reste la seule règle de présence : hors « Toutes », les faites sont déjà exclues, comme en Liste et en Kanban ; compteurs, Liste et Kanban inchangés ; chaque jalon garde un nom accessible qui contient intitulé, date et état (« …, 12 oct. 2026, Faite ») ; la fiche réutilise `DeadlineRow` et ses actions serveur telles quelles ; la fiche annonce (région vocale du panneau) et rend le focus : au jalon d'origine à la fermeture, au titre « Axe du temps » si la fiche disparaît (supprimée, ou plus dans la vue) ; aucune dépendance, aucune migration.

**Never:** modifier `DeadlineRow`, `DeadlineForm`, les actions du calendrier ou la règle `inView` ; ouvrir une mission depuis un jalon ; ajouter une fenêtre modale ; inventer des barres (une échéance n'a qu'une date) ; changer l'axe (`ganttScale`) ni les niveaux (`assignLanes`).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| À faire | échéance non faite, toute date | jalon coloré par urgence, bouton | N/A |
| Faite récente | faite, date limite dans les 30 derniers jours (inclus) ou à venir | jalon gris, intitulé barré, « Faite » (lecteur d'écran et infobulle) | N/A |
| Faite ancienne | faite, date limite il y a 31 jours ou plus | absente du gantt (reste en Liste et Kanban) | N/A |
| Vue autre que « Toutes » | vue Semaine, Mois, En retard, Aujourd'hui | faites absentes (règle `inView` inchangée) | N/A |
| Jalon de facture | ligne `invoice_issue` ou `invoice_chase` | lien vers `/factures`, comme avant | N/A |
| Ouvrir la fiche | clic ou Entrée / Espace sur un jalon d'échéance | fiche sous le diagramme (`aria-expanded` vrai sur le jalon) ; un autre jalon remplace la fiche | N/A |
| Fermer | bouton « Fermer » ou clic sur le même jalon | fiche fermée, focus sur le jalon | N/A |
| Marquer faite | fiche ouverte, vue « Toutes » | la fiche reste, passe « Faite » avec « Rouvrir » ; le jalon devient gris | échec : message d'alerte de la fiche |
| Marquer faite, autre vue | fiche ouverte, vue Mois | la fiche disparaît (plus dans la vue), annonce, focus sur « Axe du temps » | N/A |
| Supprimer | fiche ouverte | confirmation (`ConfirmPanel`), puis fiche disparue, annonce, focus sur « Axe du temps » | N/A |
| Rien à afficher | aucun jalon | message « Rien à afficher sur l'axe du temps. » inchangé | N/A |

</frozen-after-approval>

## Code Map

- `components/deadline-gantt.tsx` -- diagramme : construit les jalons en ligne (l. 28-30, filtre `done_at === null`), rend losange + intitulé, lien pour les factures ; commentaire (l. 21-24) et pied de page (« passe en Liste ou en Kanban ») à mettre à jour ; devient client (état de la fiche).
- `lib/domain/deadline-boards.ts` -- `urgency`, `URGENCY_LABELS/STYLES` (le niveau « done » est déjà gris, barré à l'affichage), `ganttScale` ; accueille `GANTT_DONE_DAYS = 30` et `ganttMarks(deadlines, lines, today)` (extraction du code en ligne, testable) ; `daysUntil` pour la fenêtre.
- `lib/domain/deadline-boards.test.ts` -- modèle des tests (`node --test`).
- `components/deadline-row.tsx` -- fiche réutilisée telle quelle (`sectionId`, `onChanged`) ; `components/deadline-kanban.tsx` -- modèle d'usage de `DeadlineRow` et de `onChanged`.
- `components/deadlines-panel.tsx` -- passe `deadlines={visible}` et `lines`, déjà filtrés par `inView` ; fournira `onChanged` au gantt (comme au Kanban) ; région vocale `role="status"` unique.
- `app/(app)/calendrier/page.tsx` -- inchangée.
- `_bmad-output/implementation-artifacts/deferred-work.md` -- section 5, ligne « Calendrier » : retirer « les échéances faites ne figurent pas au gantt et un jalon de gantt n'ouvre pas de fiche ».

## Tasks & Acceptance

**Execution:**
- [ ] `lib/domain/deadline-boards.ts` -- `GANTT_DONE_DAYS`, `ganttMarks` (faites gardées dans la fenêtre, niveau « done », jalon d'échéance = fiche, ligne de facture = lien) -- règle testée hors du composant
- [ ] `lib/domain/deadline-boards.test.ts` -- une ligne de test par ligne de la matrice qui relève du domaine (faite récente / ancienne / future, à faire, facture, tri) -- comportement figé
- [ ] `components/deadline-gantt.tsx` -- jalons depuis `ganttMarks` ; bouton `aria-expanded` pour une échéance, lien pour une facture ; fiche sous le diagramme (`DeadlineRow`) avec « Fermer » ; titre « Axe du temps » (`tabIndex={-1}`) ; focus rendu comme dans la matrice ; commentaire et pied de page à jour -- décisions d'Alex
- [ ] `components/deadlines-panel.tsx` -- passer `onChanged` au gantt -- annonce et focus
- [ ] `docs/journal.md`, `deferred-work.md` -- journal ; retirer l'entrée du gantt

**Acceptance Criteria:**
- Given `npm test`, then les nouveaux tests passent et les anciens sont inchangés.
- Given une mutation (fenêtre à 31 jours, ne plus filtrer les faites, niveau « done » oublié, facture rendue comme échéance), when les tests tournent, then au moins un échoue.
- Given `tsc --noEmit`, `npm run lint` et `next build` (copie propre), then sans erreur.
- Given le gantt en vue « Toutes » avec le compte de démonstration, then une échéance faite récente est grise et barrée, un jalon s'ouvre au clavier (Tab, Entrée) en fiche, Échap n'est pas piégé, et marquer faite, rouvrir, modifier et supprimer fonctionnent depuis la fiche (contrôle d'Alex, aucun test de page).

## Implementation Notes

## Spec Change Log

## Review Triage Log

## Verification

**Commands:**
- `npm test` -- expected: tous les lots passent
- `npx tsc --noEmit && npm run lint` -- expected: sans erreur
- Mutations à la main sur `ganttMarks` -- expected: un test échoue à chaque fois, puis restauration
- `next build` dans une copie propre -- expected: passe

**Manual checks (if no CLI):**
- `/calendrier?affichage=gantt` : jalon d'une échéance faite récente (grisé, barré), clic sur un jalon (fiche), Fermer (focus sur le jalon), « Marquer faite » en vue Mois (fiche disparue, focus sur « Axe du temps »), jalon de facture (lien Factures). Thème clair et sombre, largeur téléphone (le diagramme défile horizontalement).
