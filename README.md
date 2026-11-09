<div align="center">

# LogMerry

**Un cockpit personnel pour piloter une activité de conseil No-Code / IA, avec un assistant qui répond depuis mes propres notes et cite ses sources.**

</div>

> **Nom de code** (le nom public reste à définir). **Statut : MVP livré pour la soutenance du 16 novembre 2026, périmètre gelé.** Projet personnel du Workshop 8 du Bachelor Chef de Projet No-Code et IA, construit en vibe coding avec Claude : la démarche (prompts, décisions, bugs, corrections) est tracée dans [`docs/journal.md`](docs/journal.md).

- **Application déployée** : <https://logmerry.vercel.app> (le compte de démonstration est remis séparément au jury : aucun identifiant dans ce dépôt)
- **Dossier de soutenance (PDF, 14 chapitres dont une annexe)** : [`docs/livrables/livrables-soutenance.pdf`](docs/livrables/livrables-soutenance.pdf)

## Objectif

Lancer seul une activité de conseil demande de la rigueur : suivre prospects, clients, missions et factures, ne pas rater une échéance administrative, retrouver une information dispersée. LogMerry est un outil à **propriétaire unique** qui rassemble un cockpit « Aujourd'hui » et un **assistant IA (RAG)** qui répond à partir de mes notes, cite ses sources et garde l'historique des échanges.

## Ce que fait l'application

- Connexion sécurisée, données cloisonnées par compte (sécurité par ligne sur les 22 tables).
- Cockpit « Aujourd'hui » : tâches du jour avec leur motif, échéances, jauges de plafond (estimations étiquetées).
- Notes (note, procédure, modèle, FAQ), recherche par mots-clés et par sens, résumé d'une note.
- Assistant : réponse sourcée à partir de mes notes, refus clair quand rien n'est trouvé, historique conservé.
- Mini CRM (prospects, clients, contacts), devis, factures et encaissements (suivi interne, pas de facturation légale).
- Missions en mode agile (backlog, user stories, tâches, sprints) avec propositions de l'IA, éphémères tant que je ne les garde pas.
- Portfolio public en lecture seule (réalisations publiées avec accord du client) et formulaire de contact.

**Hors périmètre** : facturation légale, calcul officiel de cotisations, d'impôt ou de TVA, conseil fiscal ou juridique généré par l'IA, agenda complet. **Après le MVP** : rappels et résumé hebdomadaire (n8n), portail client en lecture seule.

## Architecture

| Couche | Choix |
| --- | --- |
| Front et serveur | Next.js (App Router), TypeScript, Tailwind CSS, shadcn/ui ; Server Actions et un Route Handler (`POST /api/chat`) |
| Données | Supabase Cloud, région Paris : Auth, Postgres, Storage, pgvector ; schéma versionné dans `supabase/migrations/` |
| Hébergement | Vercel, fonctions en région Paris (`cdg1`) |
| IA | Claude (Anthropic) pour les réponses ; `mistral-embed` (Mistral AI, 1 024 dimensions) pour les embeddings ; **appels côté serveur uniquement** |

**Chemin du RAG.** Note → découpage (1 000 caractères, chevauchement de 150) → embeddings → index pgvector (HNSW, cosinus) → recherche par sens et par mots-clés **filtrée par propriétaire** → réponse de Claude à partir des seuls extraits → **vérification avant affichage** (les sources citées existent, aucun nombre ni adresse inventé) → affichage. Une réponse qui échoue à la vérification est rejetée. Détail : chapitres 2, 7, 8 et 9 du PDF.

## Installation

Prérequis : Node.js 24 et un projet [Supabase](https://database.new) avec l'extension pgvector.

```bash
git clone <adresse du dépôt>
cd logmerry
npm install
cp .env.example .env.local
```

Renseigner `.env.local` (jamais versionné) : l'adresse et la clé **publique** du projet Supabase, puis les clés des fournisseurs d'IA, utilisées côté serveur seulement.

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
ANTHROPIC_API_KEY=...
MISTRAL_API_KEY=...
AI_CHAT_MODEL=...
```

Appliquer les migrations de `supabase/migrations/` au projet, puis `npm run dev` (<http://localhost:3000>). Aucune clé d'administration (`service_role`) n'est utilisée dans le projet.

**Tests.** `npm test` (unitaires, actions, composants, accès) ne demande ni base ni clé. `npm run test:isolation` rejoue l'isolation entre deux comptes fictifs sur la vraie base (identifiants dans `.env.test.local`, ignoré par git ; lancé aussi chaque nuit par GitHub Actions). `npm run test:rag` et `npm run test:leak` appellent Claude et Mistral (payants, quelques centimes).

## Comptes et données de démonstration

Toutes les données de la base sont **fictives et étiquetées « démo »** ; aucune vraie donnée client. Le compte de démonstration est un compte fictif en `@example.com`, dont le mot de passe est remis séparément. Les jeux de données se créent avec `npm run seed:demo`, `seed:backlog`, `seed:activity` et `seed:to-invoice` (comptes fictifs uniquement : les scripts refusent tout autre compte). Le déroulé de démonstration est dans [`docs/parcours-demo.md`](docs/parcours-demo.md).

## Évaluation de l'assistant

20 questions sur un corpus fictif de 11 notes (réponses présentes, mots-clés, reformulations, refus attendus, pièges) : de 19 à 20 bonnes réponses sur 6 exécutions, **20 sur 20 le 4 novembre 2026**, aucune fuite entre comptes. Corpus petit : le score est optimiste (chapitre 7 du PDF, [`docs/rag-tests.md`](docs/rag-tests.md)).

## Limites connues

Le détail et le plan d'action sont au chapitre 13 du PDF.

- **Hébergement gratuit** : plan Hobby de Vercel (usage non commercial, DPA non applicable) et plan Free de Supabase (pas de sauvegarde automatique, pause après une semaine d'inactivité). **Aucune vraie donnée client** tant qu'une décision (plan Pro ou export régulier) n'est pas prise.
- **RGPD** : registre des traitements validé, avec des points « À confirmer » listés ; purges automatiques **documentées en annexe, non activées**.
- Pas de double authentification, pas d'alerte ni de surveillance automatique ; parcours clavier complets non essayés de bout en bout.
- Outil à utilisateur unique, volontairement (outil personnel autorisé par le brief du challenge).

## Documentation

| Fichier | Contenu |
| --- | --- |
| [`docs/livrables/livrables-soutenance.pdf`](docs/livrables/livrables-soutenance.pdf) | Les 13 livrables et l'annexe des purges, en un seul PDF (sources : [`docs/livrables/`](docs/livrables/)) |
| [`docs/journal.md`](docs/journal.md) | Journal de vibe coding : prompts, décisions, bugs, corrections |
| [`docs/brief.md`](docs/brief.md) | Brief produit de départ |
| [`CLAUDE.md`](CLAUDE.md) | Règles de travail avec l'assistant de code |

## Auteur

Alex Pericat, auteur et propriétaire du projet.
