# Projet : Mini CRM / Cockpit d'activité avec assistant IA (RAG)

Nom de code : LogMerry. Nom public : à définir (vérification de marque en cours). Auteur : Alex.

## Contexte
- Projet personnel du Workshop 8 du Bachelor Chef de Projet No-Code et IA : « Réaliser et déployer une application Fullstack en utilisant des outils No-Code et l'IA ».
- Le brief du WS8 (scénario NexaMind AI) attend une application web fullstack avec : compte et connexion sécurisés, tableau de bord, ajout et organisation de contenus, recherche, assistant IA connecté aux données, RAG avec base vectorielle, historique des échanges, espace structuré.
- Le challenge évalue surtout la démarche de vibe coding (piloter l'IA, itérer, corriger) : tout garder traçable dans `docs/journal.md`.
- Le cadrage avec le tuteur (Richard) est en cours : ne rien supposer sur les critères de notation.

## Produit
Outil de pilotage de ma future activité de conseil No-Code/IA : prospects, clients, missions, suivi des factures, échéances administratives, gestion du temps, et une base de connaissances (notes de rendez-vous, procédures, modèles, FAQ, livrables, réalisations) interrogeable par un assistant IA qui cite ses sources.

## Stack (à confirmer en cas de changement)
- Front : Next.js (TypeScript, Tailwind) issu du template Supabase.
- Backend : Supabase Cloud, région européenne (Auth, Postgres, Storage, pgvector).
- Hébergement : Vercel (région Paris), Next.js 16.x. Détail dans `_bmad-output/planning-artifacts/architecture/architecture-logmerry-2026-10-12/ARCHITECTURE-SPINE.md`, qui fait foi.
- IA : Claude (Anthropic) pour les réponses, `mistral-embed` (Mistral AI, 1024 dimensions) pour les embeddings. Appels côté serveur uniquement. Modèle Claude exact à valider sur `docs/rag-tests.md`.
- Chat et indexation : Route Handler et Server Actions Next.js (ni fonction Supabase, ni n8n).
- n8n : hors MVP (rappels, résumé hebdomadaire, calendrier : après le MVP).

## Règles à respecter
- Sécurité par ligne (RLS) activée sur toutes les tables, avec `owner_id = auth.uid()`. La recherche vectorielle filtre aussi par `owner_id`.
- Aucun taux, plafond ou montant fiscal codé en dur : table de paramètres avec source et date de vérification. Les provisions sont des estimations étiquetées comme telles, jamais des montants officiels.
- Aucun conseil fiscal ou juridique généré par l'IA.
- Aucune clé secrète (service role) côté client, dans le code ou dans un commit. `.env.local` est ignoré par git.
- Le schéma évolue par migrations versionnées dans `supabase/migrations/`, pas par du SQL non tracé. Montrer le SQL avant de l'appliquer.
- MCP Supabase : tant que la base ne contient que des données fictives, lecture seule hors modification du schéma, approbation manuelle des appels. Avant la première vraie donnée client (passage à l'outil pro), débrancher le MCP ou réécrire cette règle.
- La dimension des vecteurs dépend du modèle d'embeddings : toute modification impose une réindexation.
- Données de démo fictives ou anonymisées, clairement étiquetées. Pas de vraies données clients pendant le Workshop 8. Au passage à l'outil pro : purge de la base (embeddings et historique de chat inclus), seul le portfolio est conservé, puis saisie des vraies données. Démo et réel sont isolés par la RLS (`owner_id`), sans colonne « fictif ».
- Si une information manque (statut juridique, plafond, modèle d'IA), demander plutôt que supposer.

## Périmètre
- MVP : mini CRM, missions, suivi des factures, cockpit « Aujourd'hui », échéances, base de connaissances avec RAG, réalisations (portfolio avec vue publique en lecture seule pour les réalisations publiées avec accord du client).
- Cockpit étendu, par ordre de priorité : jauge de plafond, capacité, rappels d'échéances ; provision et dépenses en second temps.
- Hors périmètre : facturation légale et électronique, calcul officiel des cotisations, de l'impôt ou de la TVA, agenda complet.
- Version 2 : portail client en lecture seule (cloisonnement strict, partage activé volontairement, test avec deux comptes clients fictifs) ; questions libres générant du SQL.

## Plan (estimation de 130 h, à valider)
1. Cadrage, modèle de données, authentification, RLS (environ 15 h).
2. Tranche fine RAG de bout en bout : note, vectorisation, chat avec sources, historique (environ 35 h).
3. CRM, missions, suivi des factures (environ 30 h).
4. Cockpit, revenus, échéances, capacité, fonctions IA complémentaires, n8n (environ 30 h).
5. Tests, déploiement, démo, documentation (environ 20 h).
Le RAG est construit en premier, car c'est la partie la plus risquée et la plus évaluée.

## Démarche et qualité
- Journal de vibe coding : `docs/journal.md` (prompts, décisions, bugs, corrections).
- Jeu de test RAG : `docs/rag-tests.md` (15 à 20 questions avec la source attendue, taux de bonnes réponses).
- Test de sécurité : deux comptes fictifs ne doivent jamais voir les données de l'autre.
- Interface en français, code et commits en anglais, petits commits.

## Points ouverts
Statut juridique de l'activité, attentes exactes du tuteur, mention RGPD pour l'envoi des extraits à Anthropic et Mistral, modèle Claude exact.
