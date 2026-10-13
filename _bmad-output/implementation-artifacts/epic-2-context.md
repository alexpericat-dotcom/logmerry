# Epic 2 Context: Mes notes

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Le propriétaire écrit et organise ses notes, les retrouve par mots-clés (⌘K) et peut prouver que deux comptes ne voient jamais les données l'un de l'autre. Aucune IA dans cet epic : les notes sont le socle de la base de connaissances que l'assistant interrogera plus tard.

## Stories

- Story 2.1: Créer et lister mes notes
- Story 2.2: Modifier, classer et supprimer une note
- Story 2.3: Deux comptes fictifs ne se voient pas
- Story 2.4: Rechercher dans mes notes avec ⌘K

## Requirements & Constraints

- Une note a un titre obligatoire, du texte et un statut brouillon/actif ; les brouillons serviront plus tard aux éléments « à documenter ».
- Classement par type (note, procédure, modèle, FAQ) et filtre : story 2.2, pas avant.
- Isolation entre comptes prouvée par un script à deux comptes fictifs, à rejouer après chaque migration touchant une table.
- Données de démonstration fictives uniquement pendant le Workshop 8.
- Recherche : texte intégral de Postgres (configuration `french`), sous RLS ; la recherche vectorielle est réservée à l'assistant.

## Technical Decisions

- Toute table de `public` : `owner_id uuid not null default auth.uid() references auth.users`, RLS activée, policies `using (owner_id = (select auth.uid()))` pour select, update, delete et `with check` pour insert.
- Schéma modifié uniquement par des fichiers de `supabase/migrations/`, un fichier par changement ; le SQL est montré avant d'être appliqué ; jamais appliqué automatiquement par le déploiement.
- Valeurs à choix multiples en enums Postgres ; dates en `timestamptz` UTC.
- Lecture par Server Components, écriture par Server Actions (une par intention, ex. `createNote`) ; code d'accès aux données dans `lib/db/` (côté serveur), règles pures dans `lib/domain/` avec tests.
- Un seul projet Supabase pour le local, les previews et la production.

## UX & Interaction Patterns

- Tutoiement ; liste vide = phrase d'explication + une action principale ; état de chargement par `Skeleton` ou texte.
- Formulaires : libellé associé à chaque champ, erreur en ligne qui nomme le champ, `aria-invalid` + `aria-describedby`.
- `<title>` = « {Page} · LogMerry » ; un seul `h1` par page.
- L'éditeur riche (barre d'outils) est prévu par la conception ; le résumé généré est hors de cet epic.

## Cross-Story Dependencies

- 2.2 ajoute le type de note et la modification/suppression à la table créée en 2.1 (une migration par changement).
- 2.3 rejoue le script d'isolation sur la table `notes` ; 2.4 interroge `notes` en texte intégral.
- Epic 8 ajoutera l'état d'indexation et les extraits (table `note_chunks`).
