# Addendum technique : LogMerry

Contenu qui n'a pas sa place dans le PRD : choix techniques et justifications. Repris et tranché dans `architecture/architecture-logmerry-2026-10-12/ARCHITECTURE-SPINE.md` (12-13 octobre 2026), qui fait foi en cas d'écart.

## Chat et ingestion
- **Chat :** Route Handler Next.js (`app/api/chat`), déployé sur Vercel. La session de l'utilisateur connecté (cookie) est utilisée pour interroger Supabase, donc la RLS s'applique. Ni fonction Supabase ni n8n pour le chat (un maillon de moins à sécuriser). Pas de réponse en flux : la réponse n'est affichée qu'après vérification des citations.
- **Ingestion :** dans la Server Action de sauvegarde d'une note (découpage, embeddings, indexation). La note est enregistrée même si l'IA échoue (état « échec d'indexation », nouvel essai possible).
- **n8n :** absent du MVP. Réservé à l'asynchrone après le MVP (rappels, résumé hebdomadaire, calendrier, veille des taux).

## Vérification des citations
1. Chaque extrait envoyé au modèle porte un identifiant.
2. Le modèle renvoie sa réponse et les identifiants cités, en format structuré.
3. Le code rejette toute citation dont l'identifiant n'a pas été envoyé.
4. L'interface relit la source en base par identifiant, jamais le texte « cité » par le modèle.
5. Refus si aucun extrait n'atteint le seuil de similarité.
6. Vérification manuelle (la source soutient-elle la phrase ?) sur `docs/rag-tests.md`.

## Découpage et embeddings
Les notes sont découpées en extraits avec chevauchement avant vectorisation (pipeline : ingestion, découpage, embeddings, indexation pgvector, recherche par similarité filtrée par `owner_id`, injection du contexte, réponse avec sources).

**Choix retenus (architecture) :** réponses par Claude (Anthropic, choix de l'auteur ; modèle exact dans `AI_CHAT_MODEL`, à valider sur `docs/rag-tests.md`) ; embeddings par `mistral-embed` (Mistral AI, 1024 dimensions), car Anthropic ne propose pas d'embeddings. Les extraits de notes sont donc envoyés à deux fournisseurs : à documenter pour le RGPD avant toute donnée réelle. La dimension des vecteurs fixe la première migration ; toute modification impose une réindexation complète.

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
MVP : simple suivi (montant, date d'envoi, statut ; FR-22), sans document. Brouillon de lignes depuis le catalogue (FR-18) : hors MVP avec le catalogue. Version future : document complet, qui implique mentions légales et numérotation, donc une frontière avec la facturation légale, hors périmètre.

## Éléments à documenter (FR-21)
Une Note brouillon vide n'est pas indexée (pas d'extrait, pas d'embedding) ; l'indexation démarre au premier contenu, comme pour toute note (FR-3). Le comptage de la ligne de synthèse du cockpit est calculé côté serveur, filtré par `owner_id`.

## Formulaire de contact public (après MVP)
Contraintes : table de demandes en insertion seule pour un visiteur anonyme (cas RLS particulier : pas de lecture, pas de mise à jour) ; anti-spam sans test cognitif (champ piège masqué, délai minimal de soumission, limitation de débit côté serveur) ; aucun e-mail automatique ; mention RGPD. Au MVP : lien `mailto:`, aucune écriture en base, page publique en lecture seule (FR-16).

## « Prendre de l'avance » (après MVP)
Déterministe, sans IA. Source : étapes de mission à venir et échéances des 30 prochains jours ; ordre par date la plus proche ; 3 tâches au plus, étiquetées « à venir » avec date et motif ; source vide : félicitation seule.
