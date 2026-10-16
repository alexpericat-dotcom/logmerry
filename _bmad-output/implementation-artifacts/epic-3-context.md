# Epic 3 Context: Clients et missions

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Le propriétaire suit ses prospects et clients, leurs contacts, ses missions pilotées en agile (backlog de user stories, tâches, sprints), et ses devis, pour savoir à qui il a affaire, où en est son travail et quels devis attendent une réponse. C'est le mini CRM sur lequel s'appuieront les factures (epic 4), le cockpit (epic 5) et le portfolio (epic 6).

## Stories

- Story 3.1: Gérer mes prospects et clients
- Story 3.2: Ajouter des contacts et passer un prospect en client
- Story 3.3: Lier une note à un client ou un prospect
- Story 3.4: Créer des missions
- Story 3.5a: Backlog et user stories d'une mission (remplace l'ancienne 3.5 « étapes », décision d'Alex du 2026-10-16)
- Story 3.5b: Tâches d'une user story
- Story 3.5c: Sprints
- Story 3.6: Suivre mes devis
- Story 3.7: Rechercher aussi clients et missions

## Requirements & Constraints

- Prospect et client sont une seule entité avec un statut ; passer de prospect à client ne fait rien perdre (contacts, notes).
- Une fiche exige seulement un nom et une étiquette d'origine (client réel, formation, ami, démo) ; les autres champs sont facultatifs.
- Liste filtrable par statut et par origine, triable, avec recherche ; liste vide = phrase d'explication + une action.
- Isolation entre comptes prouvée pour chaque nouvelle table (test à deux comptes fictifs, rejoué après chaque migration).
- Données de démonstration fictives et étiquetées ; pas de vraies données clients pendant le Workshop 8.
- Aucune facturation légale ni montant fiscal dans cet epic ; un devis est un simple suivi (montant, date d'envoi, statut), pas un document.

## Technical Decisions

- Toute table : `owner_id uuid not null default auth.uid() references auth.users on delete cascade`, RLS activée, policies select/insert/update/delete sur `owner_id = (select auth.uid())` ; les clés étrangères contournent la RLS : une policy d'insertion/mise à jour vérifie que la ligne référencée appartient au même compte.
- Valeurs à choix (statut, origine) en enums Postgres ; montants en centimes entiers (`bigint`) ; dates métier en `date`, horodatages en `timestamptz`.
- Schéma modifié seulement par fichiers de `supabase/migrations/` (un par changement), nommés avec la version enregistrée par Supabase ; le SQL est montré et approuvé avant d'être appliqué ; jamais appliqué automatiquement par le déploiement.
- Lecture par Server Components, écriture par Server Actions (une par intention, retour `{ ok, ... }` avec message français) ; accès aux données dans `lib/db/` (serveur), règles pures dans `lib/domain/` avec tests ; aucun écriture directe du navigateur vers Supabase.
- Recherche (story 3.7) : colonnes `tsvector` générées en configuration `french`, une seule Server Action pour notes, clients et missions, sous RLS.

## UX & Interaction Patterns

- Tutoiement ; formulaires avec libellé visible, erreur en ligne nommant le champ (`aria-invalid` + `aria-describedby`) ; `<title>` « {Page} · LogMerry » ; un seul `h1` par page.
- Tableau de données : `<table>` natif, légende masquée visuellement, tri par bouton dans l'en-tête avec `aria-sort`, nom du client = lien dans la 1re cellule, chiffres et dates en mono tabulaire alignés à droite, état `role="status"` après filtre (« 12 clients sur 40 »), défilement horizontal dans un conteneur focalisable nommé.
- Pastilles de statut : icône + mot (prospect, client), jamais la couleur seule ; le statut « prospect » ne réutilise pas une couleur d'état.
- Écrans avec le bandeau d'en-tête de page et le thème Cobalt (voir `docs/ui-rules.md`) ; boutons d'action en dégradé.

## Cross-Story Dependencies

- 3.1 crée la table `clients` ; 3.2, 3.3, 3.4 et 3.6 s'y rattachent (contacts, notes liées, missions, devis).
- 3.4 crée `missions` ; 3.5 et 3.6 en dépendent ; les factures (epic 4) et les réalisations (epic 6) se rattachent aux missions.
- 3.7 dépend de 3.1 et 3.4 et étend la palette ⌘K existante (story 2.4).
- Le tableau de données créé en 3.1 est réutilisé pour les missions (3.4) et les factures (4.2).
