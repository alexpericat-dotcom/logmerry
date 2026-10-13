<div align="center">

# LogMerry

**Un cockpit personnel pour piloter une activité de conseil No-Code / IA, avec un assistant qui répond depuis tes propres données et cite ses sources.**

![Statut](https://img.shields.io/badge/statut-en%20cadrage-orange)
![Next.js](https://img.shields.io/badge/Next.js-TypeScript-000000?logo=nextdotjs)
![Supabase](https://img.shields.io/badge/Supabase-Postgres%20%2B%20pgvector-3ECF8E?logo=supabase&logoColor=white)
![Tailwind](https://img.shields.io/badge/Tailwind-CSS-06B6D4?logo=tailwindcss&logoColor=white)

</div>

> **Nom de code.** Le nom public du produit reste à définir.
> **Statut : début de projet.** Le dépôt contient le gabarit Next.js + Supabase, le cadrage produit et la méthode de travail. Les fonctionnalités ci-dessous sont **prévues, pas encore construites**.

## Le problème

Lancer seul une activité de conseil demande de la rigueur : suivre prospects, clients, missions et factures, ne pas rater une échéance administrative, surveiller des revenus irréguliers, gérer son temps, et retrouver vite ce qu'on a déjà écrit (notes de rendez-vous, procédures, modèles).

## La solution

Un outil à propriétaire unique qui rassemble deux choses :

- **Un cockpit « Aujourd'hui »** : actions du jour, relances, échéances proches.
- **Un assistant IA (RAG)** : il répond à partir de ta base de connaissances, **cite ses sources**, et conserve l'historique des échanges.

## Fonctionnalités prévues

**MVP**

- [ ] Authentification sécurisée, données cloisonnées par utilisateur
- [ ] Mini CRM : prospects, clients, contacts, missions
- [ ] Suivi des factures émises et de leur statut (suivi uniquement)
- [ ] Cockpit « Aujourd'hui » et échéances
- [ ] Suivi des revenus par rapport à un plafond saisi par l'utilisateur
- [ ] Base de connaissances : notes de rendez-vous, procédures, modèles, FAQ, livrables
- [ ] Recherche dans les contenus
- [ ] Assistant RAG avec sources citées et historique
- [ ] Réalisations (portfolio) avec vue publique en lecture seule

**Ensuite** : capacité et suivi du temps, rappels d'échéances et résumé hebdomadaire (n8n), synchronisation calendrier.
**Version 2** : portail client en lecture seule, questions libres générant du SQL.

**Hors périmètre** : facturation légale ou électronique, calcul officiel de cotisations, d'impôt ou de TVA, agenda complet, tout conseil fiscal ou juridique généré par l'IA.

## Comment l'assistant garde ses réponses fiables

Les citations sont vérifiées à deux niveaux :

1. **À chaque réponse (automatique).** Chaque extrait envoyé au modèle porte un identifiant. Le modèle renvoie sa réponse et les identifiants cités ; le code rejette tout identifiant absent des extraits envoyés. L'interface relit la source en base à partir de l'identifiant. Si aucun extrait n'est assez pertinent, l'assistant dit qu'il ne trouve pas la réponse.
2. **Sur un jeu de test (manuel).** `docs/rag-tests.md` regroupe 15 à 20 questions : réponse présente (avec source attendue), réponse absente (refus attendu), et un piège entre deux comptes (aucune fuite).

## Stack

| Couche | Choix |
| --- | --- |
| Front | Next.js (App Router), TypeScript, Tailwind CSS, shadcn/ui |
| Backend | Supabase Cloud, région européenne : Auth, Postgres, Storage, pgvector |
| Hébergement | Vercel (fonctions en région Paris, `cdg1`) |
| Chat et indexation | Route Handler et Server Actions Next.js, avec la session de l'utilisateur pour que la RLS s'applique |
| Modèle de langage et embeddings | Claude (Anthropic) pour les réponses, `mistral-embed` (Mistral AI) pour les embeddings, appels côté serveur uniquement |
| Tâches asynchrones | n8n, après le MVP |

## Principes de sécurité

- **Sécurité par ligne (RLS)** sur toutes les tables, avec `owner_id = auth.uid()`. La recherche vectorielle filtre aussi par `owner_id`.
- **Aucune clé secrète** côté client, dans le code ou dans un commit. `.env.local` est ignoré par git.
- **Aucun taux, plafond ou montant fiscal codé en dur** : table de paramètres avec source et date de vérification. Les provisions sont des estimations étiquetées comme telles.
- **Schéma versionné** par migrations dans `supabase/migrations/`.
- **Données de démo fictives**, isolées des vraies données par la RLS.

## Démarrer en local

Prérequis : Node.js et un projet [Supabase](https://database.new).

```bash
git clone https://github.com/alexpericat-dotcom/logmerry.git
cd logmerry
npm install
cp .env.example .env.local
```

Renseigne `.env.local` avec les valeurs de ton projet (*Project settings → API*) :

```env
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-or-anon-key
```

```bash
npm run dev
```

L'application tourne sur [localhost:3000](http://localhost:3000).

## Déployer sur Vercel

1. Sur [vercel.com](https://vercel.com), *Add New → Project*, importer le dépôt GitHub `logmerry`.
2. Framework : Next.js (détecté). La région des fonctions (`cdg1`, Paris) est fixée dans `vercel.json`.
3. Variables d'environnement (*Settings → Environment Variables*) : `NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, les mêmes que dans `.env.local`. Aucune clé secrète à ce stade.
4. Dans Supabase (*Authentication → URL Configuration*), ajouter l'adresse Vercel dans *Site URL* et *Redirect URLs* (`https://<ton-projet>.vercel.app/**`).
5. Déployer, puis ouvrir l'adresse : la page « LogMerry » doit s'afficher.

## Documentation du projet

| Fichier | Contenu |
| --- | --- |
| [`docs/brief.md`](docs/brief.md) | Brief produit : contexte, périmètre, exigences, planning |
| [`_bmad-output/forge/logmerry-mvp/forged-idea.md`](_bmad-output/forge/logmerry-mvp/forged-idea.md) | Décisions issues de la session de cadrage |
| [`CLAUDE.md`](CLAUDE.md) | Règles de travail avec l'assistant de code |

## Contexte

LogMerry est le projet du Workshop 8 du Bachelor Chef de Projet No-Code et IA (« Réaliser et déployer une application Fullstack en utilisant des outils No-Code et l'IA »). Il est construit avec une démarche de *vibe coding* tracée et sert aussi de portfolio pour une future activité de conseil.

## Auteur

Alex, auteur et propriétaire du projet.
