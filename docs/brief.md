# Brief produit : LogMerry (nom de code)

Document de départ à donner à l'agent Product Manager de BMAD pour produire le PRD.
Auteur : Alex. Statut : brouillon, à challenger. Les points marqués « à confirmer » ne sont pas décidés.

## 1. Contexte
- Projet personnel du Workshop 8 du Bachelor Chef de Projet No-Code et IA (130 h) : « Réaliser et déployer une application Fullstack en utilisant des outils No-Code et l'IA ».
- Exigences du brief du WS8 : compte et connexion sécurisés, tableau de bord, ajout et organisation de contenus, recherche, assistant IA connecté aux données, RAG avec base vectorielle, historique des échanges, espace structuré.
- Le challenge évalue surtout la démarche de vibe coding (piloter l'IA, itérer, corriger). Tout doit rester traçable (`docs/journal.md`). Les critères exacts de notation sont à confirmer avec Richard.
- Le projet sert aussi de portfolio pour ma future activité de conseil No-Code/IA.

## 2. Problème et vision
Lancer seul une activité de conseil demande de la rigueur : suivre prospects, clients, missions et factures, ne pas rater d'échéance administrative, surveiller mes revenus (irréguliers) par rapport au plafond de mon statut, gérer mon temps, et retrouver vite ce que j'ai déjà écrit (notes, procédures, modèles).

Vision : un cockpit personnel qui me dit chaque jour quoi faire, et un assistant IA qui répond à partir de MES données en citant ses sources.

## 3. Utilisateurs
- Principal : moi (propriétaire unique).
- Version 2 : clients, en lecture seule sur ce que je choisis de partager (cloisonnement strict).
- Public : visiteurs du portfolio, en lecture seule, uniquement sur les réalisations publiées avec accord du client.

## 4. Périmètre

### MVP
1. Authentification sécurisée, données cloisonnées par utilisateur.
2. Mini CRM : prospects, clients, contacts, missions, statut, étiquette d'origine (client réel, formation, ami, démo).
3. Suivi des factures émises et de leur statut (suivi uniquement, pas de facturation légale).
4. Cockpit « Aujourd'hui » : actions du jour, relances, échéances proches.
5. Suivi des revenus par rapport à un plafond saisi par moi (jauge).
6. Base de connaissances : notes de rendez-vous, procédures, modèles, FAQ, livrables.
7. Recherche dans les contenus.
8. Assistant IA (RAG) : répond depuis ma base, cite ses sources, historique des échanges conservé.
9. Réalisations (portfolio) avec vue publique en lecture seule pour les réalisations publiées.

### Ensuite (priorité décroissante, si le temps le permet)
- Capacité et suivi du temps.
- Rappels d'échéances, résumé hebdomadaire (via n8n).
- Synchronisation avec un calendrier via n8n (pas d'agenda complet développé).
- Provision et dépenses : estimation étiquetée « estimation », jamais un montant officiel.

### Hors périmètre
- Facturation légale et électronique.
- Calcul officiel de cotisations, d'impôt ou de TVA.
- Conseil fiscal ou juridique généré par l'IA.
- Agenda complet.

### Version 2
- Portail client en lecture seule, partage activé volontairement, test avec deux comptes clients fictifs. L'assistant et le RAG restent privés.
- Questions libres générant du SQL.

## 5. Exigences non fonctionnelles
- Sécurité par ligne (RLS) sur toutes les tables, avec `owner_id = auth.uid()`. La recherche vectorielle filtre aussi par `owner_id`.
- Aucune clé secrète côté client, dans le code ou dans un commit. `.env.local` est ignoré par git.
- Aucun taux, plafond ou montant fiscal codé en dur : table de paramètres avec source (URL) et date de vérification.
- Schéma versionné dans `supabase/migrations/`.
- Données de démo fictives ou anonymisées, étiquetées comme telles. Pas de vraies données clients dans le projet de test.
- Interface en français, code et commits en anglais.
- Données hébergées dans l'Union européenne (région Supabase).

## 6. Stack envisagée (à confirmer)
- Front : Next.js (TypeScript, Tailwind), template Supabase `with-supabase`.
- Backend : Supabase Cloud (Auth, Postgres, Storage, pgvector).
- Orchestration : n8n (ingestion, rappels, résumé hebdomadaire, calendrier).
- Modèle de langage et embeddings : API à choisir (coût, qualité, RGPD). La dimension des vecteurs dépend du modèle d'embeddings.
- Chemin du chat (n8n ou fonction Supabase) : à trancher après test.

## 7. Pipeline RAG (rappel)
Ingestion, découpage avec chevauchement, embeddings, indexation pgvector, recherche par similarité filtrée par `owner_id`, injection du contexte, réponse avec sources citées. Le RAG est construit en premier (tranche fine de bout en bout), car c'est la partie la plus risquée et la plus évaluée.

## 8. Critères de réussite (propositions)
- Jeu de test RAG de 15 à 20 questions (`docs/rag-tests.md`) : objectif de taux de bonnes réponses à fixer avec Richard.
- Deux comptes fictifs ne voient jamais les données l'un de l'autre.
- Parcours de démo complet : connexion, création d'un client, note, question à l'assistant avec source citée, historique.
- Application déployée et accessible par une URL.
- Journal de vibe coding à jour (prompts, décisions, bugs, corrections).

## 9. Planning (estimation de 130 h, à valider)
1. Cadrage, modèle de données, authentification, RLS : environ 15 h.
2. Tranche fine RAG de bout en bout : environ 35 h.
3. CRM, missions, suivi des factures : environ 30 h.
4. Cockpit, revenus, échéances, capacité, n8n : environ 30 h.
5. Tests, déploiement, démo, documentation : environ 20 h.

## 10. Questions ouvertes
- Critères d'évaluation exacts et livrables attendus par Richard.
- Statut juridique de l'activité et plafond applicable (à saisir par moi, avec source).
- Modèle de langage et d'embeddings.
- Chemin du chat : n8n ou fonction Supabase.
- Nom public du produit (LogMerry reste un nom de code, vérification de marque en cours).
- Méthode BMAD attendue (niveau de formalisme, artefacts à livrer).
