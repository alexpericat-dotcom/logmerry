# Epic 5 Context: Échéances et cockpit « Aujourd'hui »

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Le calendrier administratif range les obligations du propriétaire (échéances saisies, récurrentes ou à confirmer) ; le cockpit « Aujourd'hui » en tire, avec factures, devis, plafonds et sprint, ce qu'il doit faire aujourd'hui et pourquoi, via sept règles déterministes.

## Stories

- Story 5.1a : Échéances saisies (faite)
- Story 5.1b : Calendrier administratif complet
- Story 5.2 : Tâches du jour (échéances et factures échues)
- Story 5.3 : Alertes de plafond et fin de l'ACRE
- Story 5.4 : Devis sans réponse et pipeline vide
- Story 5.4b : Tâches de mon sprint
- Story 5.5 : CA encaissé et jauges sur le cockpit
- Story 5.6 : Écran « À faire » et ligne de synthèse

## Requirements & Constraints

- Le calendrier est la source unique des échéances ; une échéance n'a qu'un statut « fait ».
- Une échéance saisie a toujours une date. Une échéance qu'une règle devrait calculer, mais dont la règle est absente/non vérifiée ou dont une donnée du profil est « À confirmer », apparaît sans date, marquée « À confirmer », jamais estimée.
- Le calendrier ne contient que des obligations, pas de rendez-vous.
- Catégories : Urssaf, France Travail, fiscale, TVA, CFE, justificatifs, renouvellements, personnalisée. Vues : Aujourd'hui, Cette semaine, Ce mois-ci, En retard.
- Aucun taux ni date fiscale codé en dur ; règles lues dans les règles réglementaires versionnées. Aucun conseil fiscal généré par l'IA.
- Interface en français, jours calculés en jour de Paris.

## Technical Decisions

- Table `deadlines` (RLS `owner_id = auth.uid()`), seule liste d'échéances. Migrations versionnées, puis régénération de `lib/supabase/database.types.ts`.
- Récurrence : une ligne par occurrence (colonne `series_id`), 12 mois créés avec la série et complétés à la lecture quand il en manque (hypothèse d'architecture à confirmer en 5.1b).
- « Factures à émettre / à relancer » : lignes calculées à partir des factures, jamais stockées comme échéances.
- Les tâches du jour sont calculées à la lecture par des fonctions pures dans `lib/domain/cockpit/` (reçoivent `asOf`) ; tri unique : numéro de règle, date, identifiant. Aucune règle ne passe par l'IA.
- Cocher une tâche d'échéance appelle `markDeadlineDone` (même action que le calendrier). `task_checks` ne sert qu'aux autres tâches.
- Tests unitaires avec `node --test`.

## Cross-Story Dependencies

- 5.1b étend la page `/calendrier` et `deadlines` livrées en 5.1a.
- 5.2 réutilise `markDeadlineDone` et les factures de l'épopée 4.
- 5.1b dépend du socle de règles et du profil (4.1a, 4.1b) pour « À confirmer ».
