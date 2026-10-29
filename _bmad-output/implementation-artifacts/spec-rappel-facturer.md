---
title: 'Cockpit : rappel « Facturer » quand une mission est terminée sans facture (règle 8)'
type: 'feature'
created: '2026-10-29'
status: 'in-progress'
route: 'dispatch'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** le parcours « note, mission, devis, backlog, sprints, livraison, facture, règlement » n'a aucun rappel entre la livraison et la facture : quand Alex passe une mission en « terminée », rien ne lui dit de facturer. Les rappels du cockpit (règle 2 : facture échue) ne partent qu'une fois la facture enregistrée. Décision d'Alex du 29 octobre 2026 : « oui, un rappel facturer ».

**Approach:** une **huitième règle déterministe** du cockpit (PRD FR-14) : une mission au statut « terminée » **sans aucune facture enregistrée** produit une tâche du jour « Facturer la mission … », avec son motif et un lien vers la mission (section Factures, bouton « Nouvelle facture »). Le code décide, jamais le modèle de langage ; aucun e-mail ; aucune facture n'est créée à la place d'Alex.

## Boundaries & Constraints

**Always:** trigger = mission au statut `done` **et** zéro facture liée à cette mission (peu importe son statut ou son montant) ; la tâche disparaît dès qu'une facture est enregistrée pour la mission ; une mission « annulée », « à planifier » ou « en cours » ne déclenche rien ; une tâche par mission ; titre « Facturer la mission {titre} », motif « mission terminée, aucune facture enregistrée », contexte « Client / Mission » comme les tâches de sprint ; la tâche se coche pour le jour (table `task_checks`, comme les règles 2 à 7 : elle revient le lendemain tant qu'aucune facture n'existe) ; calculée à la lecture, jamais stockée (AD-5) ; la RLS limite aux missions et factures du propriétaire ; montants jamais affichés dans la tâche (aucun calcul fiscal).

**Never:** créer ou modifier une facture, un devis ou le statut d'une mission automatiquement ; envoyer un e-mail ; proposer un montant ; ajouter une colonne à `missions` (pas de case « sans facture » dans cette story, voir limite) ; changer les règles 1 à 7 ; compter les tâches de sprint comme une règle.

**Limite assumée :** une mission terminée qui n'a **volontairement** pas de facture (mission offerte, facturée dans un autre outil et non enregistrée) réapparaît chaque jour jusqu'à ce qu'on l'annule ou qu'on enregistre une facture. Une case « ne pas facturer » demanderait une colonne et une migration de plus : reportée en dette tant qu'Alex ne la demande pas.

## Décisions à valider

1. **Priorité dans la liste du jour (proposition : juste après la règle 2).** Argent à encaisser d'abord (facture échue), puis argent à facturer, puis plafonds, ACRE, devis, pipeline, sprint. Sans cette décision, la règle 8 passerait après la 7 par simple numérotation. La numérotation du PRD reste (« règle 8 »), seul l'ordre d'affichage est une table de priorités.
2. **Pas de délai :** le rappel apparaît dès que la mission est terminée (proposition). Alternative : attendre 1 jour. Écartée : la date de passage en « terminée » n'est pas enregistrée (`updated_at` bouge à chaque modification), donc un délai serait faux.

## I/O & Edge-Case Matrix

| Scénario | État | Comportement attendu |
|----------|------|----------------------|
| Mission terminée sans facture | `status = done`, 0 facture | une tâche « Facturer la mission … » |
| Facture enregistrée ensuite | 1 facture (quel que soit son état) | la tâche disparaît |
| Mission terminée avec facture | ≥ 1 facture | rien |
| Mission annulée / à planifier / en cours | autre statut | rien |
| Plusieurs missions terminées sans facture | 2 ou plus | une tâche chacune, ordre : titre de mission puis identifiant |
| Tâche cochée aujourd'hui | coche du jour | cochée, en bas de liste ; revient demain |
| Mission supprimée | n'existe plus | rien |
| Aucune donnée | compte neuf | rien (jamais d'erreur) |

</frozen-after-approval>

## Code Map

- `lib/domain/cockpit/today.ts` : `TodayTask.kind` (+ `"invoice-due"`), `CheckTarget` (+ règle 8), `todayTasks` (+ entrée des missions terminées), table de priorité ; le rang 8 actuel des tâches de sprint devient 9.
- `lib/db/missions.ts` et `lib/db/invoices.ts` : lecture des missions terminées et des factures par mission (réutiliser la lecture du cockpit si elle donne déjà `mission_id`).
- `lib/domain/cockpit/assembly.ts` : assemblage (missions terminées sans facture), fonction pure testée.
- `app/(app)/aujourd-hui/page.tsx` et `components/today-tasks.tsx` : affichage et lien vers `/missions/{id}`.
- `app/(app)/aujourd-hui/actions.ts` : la coche de la règle 8 (source = la mission).
- `supabase/migrations/…_task_checks_invoice_due.sql` : `rule_no between 1 and 8` et forme de la règle 8 (`source_id` non nul, ni plafond ni seuil). **SQL montré avant d'être appliqué ; appliqué par Alex dans l'éditeur SQL**, puis `database.types.ts` régénéré.
- `_bmad-output/planning-artifacts/prds/…/prd.md` : FR-14 (huit règles, ordre), glossaire « Tâche du jour » ; `docs/journal.md`, `deferred-work.md`.
- Tests : `lib/domain/cockpit/today.test.ts`, `assembly.test.ts`, et un test de composant de la ligne.

## Tasks & Acceptance

- [ ] Migration (SQL montré, appliquée par Alex) + types régénérés.
- [ ] Domaine : règle 8, priorité, rang des tâches de sprint décalé ; tests (tous les cas de la matrice).
- [ ] Assemblage et lecture : missions terminées sans facture.
- [ ] Cockpit : la ligne, le lien, la coche du jour.
- [ ] Mutations à la main (statut ignoré, facture ignorée, annulée comptée, coche perdue, priorité, rang des tâches de sprint) : toutes détectées.
- [ ] PRD (FR-14), journal, dette ; 3 relecteurs ; `npm test`, `tsc`, lint, `next build` en copie propre ; `test:isolation` (la coche d'un compte n'est jamais vue par l'autre).
- [ ] Données de démonstration : au moins une mission terminée sans facture sur le compte A, pour voir le rappel.
- [ ] Contrôle visuel d'Alex : le cockpit montre le rappel, le lien ouvre la mission, enregistrer une facture le fait disparaître.

**Acceptation :** passer une mission en « terminée » fait apparaître « Facturer la mission … » au cockpit ; enregistrer une facture la fait disparaître ; aucune autre tâche ne change de place sauf l'insertion décidée.

## Review Triage Log

(29 octobre 2026, 3 relecteurs, 20 constats, aucun bloquant)

Corrigés : ordre des missions « titre puis identifiant » (le code triait par identifiant seul : écart avec la spec, test avec titres inversés) ; test qui enchaîne la lecture (`missionsForCockpit`) et la règle (`todayTasks`) ; commentaire périmé de `task-checks.ts`.
Reportés (dette) : lecture sans pagination (la base coupe en silence autour de 1 000 lignes : une facture dans la partie coupée ferait un faux rappel) ; ligne de `task_checks` orpheline quand une mission cochée est supprimée (comme les règles 2, 5 et 7) ; liste non plafonnée (vingt anciennes missions terminées « offertes » noieraient le cockpit : limite assumée) ; pas de test du composant de la ligne ni de la page ; script de démo sans retour arrière ; `invoiced` absent = aucun rappel (un futur appelant qui l'oublierait ne serait pas averti).
Vérifié à l'exécution seulement après la migration : `test:isolation` (code 23514 pour une coche de règle 8 sans mission).
Rejetés : la coche ne vaut que pour le jour (voulu, comme les autres règles) ; étiquette `LINKS["invoice-due"]` remplacée par le lien de la mission (sans effet).
