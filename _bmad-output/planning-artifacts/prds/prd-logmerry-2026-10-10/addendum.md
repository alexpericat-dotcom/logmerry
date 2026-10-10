# Addendum technique : LogMerry

Contenu qui n'a pas sa place dans le PRD : choix techniques et justifications. À reprendre dans `bmad-architecture`.

## Chat et ingestion
- **Chat :** fonction Supabase. Le jeton de l'utilisateur connecté arrive tel quel, donc la RLS s'applique. n8n a été écarté pour le chat (un maillon de plus à sécuriser).
- **n8n :** réservé à l'asynchrone (ingestion, rappels, résumé hebdomadaire, calendrier). Porte de sortie : démarrer l'ingestion dans une fonction Supabase si n8n ralentit le jalon du 30 octobre.

## Vérification des citations
1. Chaque extrait envoyé au modèle porte un identifiant.
2. Le modèle renvoie sa réponse et les identifiants cités, en format structuré.
3. Le code rejette toute citation dont l'identifiant n'a pas été envoyé.
4. L'interface relit la source en base par identifiant, jamais le texte « cité » par le modèle.
5. Refus si aucun extrait n'atteint le seuil de similarité.
6. Vérification manuelle (la source soutient-elle la phrase ?) sur `docs/rag-tests.md`.

## Découpage et embeddings
Les notes sont découpées en extraits avec chevauchement avant vectorisation (pipeline : ingestion, découpage, embeddings, indexation pgvector, recherche par similarité filtrée par `owner_id`, injection du contexte, réponse avec sources).

Choix à faire avec `bmad-deep-recon` en type `technical`. Critères classés : RGPD (hébergement UE, politique de données), qualité en français, coût (négligeable à 10-20 entités). La dimension des vecteurs fixe la première migration ; toute modification impose une réindexation complète.

## Calculs
Déterministes, dans le code, à partir de la table de paramètres. Le modèle de langage explique, il ne calcule pas. Les taux et seuils ne sont pas dans le RAG. Veille n8n (version 2) : elle détecte et alerte. Les paramètres ne sont mis à jour qu'après validation du propriétaire, car une page mal interprétée pourrait corrompre tous les calculs sans signal.

## Données et environnement
Une seule base Supabase. Comptes de démonstration et compte réel isolés par RLS, sans colonne « fictif ». Le MCP Supabase est débranché avant la première vraie donnée client ; embeddings et historique fictifs purgés aussi.

## Options écartées
- Colonne « fictif » par ligne : mélange démo et réel, risque de citer une note de démo ou de fausser la jauge.
- Second projet Supabase pour le réel : proposé, non retenu.
- Mise à jour autonome des taux par scraping : écartée.
- Suivi d'ouverture de lien chez les prospects : écarté (pistage, RGPD).

## Strava et Coros (version future)
Données de santé, catégorie spéciale du RGPD : consentement actif, signal dérivé conservé (ex. « charge élevée hier »), données brutes jamais conservées, jamais envoyées au modèle de langage.

## Devis
MVP : brouillon de lignes. Version future : document complet, qui implique mentions légales, numérotation et suivi d'acceptation, donc une frontière avec la facturation légale, hors périmètre.
