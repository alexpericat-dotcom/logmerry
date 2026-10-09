# LogMerry : idée forgée

## Décisions verrouillées
- **Données** : une seule base Supabase. Pendant le WS8, uniquement des données fictives. Au passage à l'outil pro : purge (y compris embeddings et historique de chat), seul le portfolio est conservé, puis saisie des vraies données.
- **MCP Supabase** : autorisé tant que la base est fictive. À débrancher (ou règle réécrite) avant la première vraie donnée client.
- **Contrainte** : la date, pas les heures. Fin de formation le 8 février 2027. Le WS8 (130 h) est une estimation, dépassable. Capacité déclarée : 35 h/sem, sauf la semaine du 12 octobre. Reste ~195 h (WS8 + WS9 + WS10).
- **Jalon** : RAG de bout en bout (note, vectorisation, chat avec sources, historique) le **30 octobre 2026**. S'il n'y est pas : aucune nouvelle fonction, correction du RAG d'abord.
- **Citations** : (1) automatique à chaque réponse : extraits avec identifiant, le modèle renvoie réponse + ids cités, le code rejette tout id absent des extraits envoyés, l'interface relit la source en base par id, refus si aucun extrait ne passe le seuil de similarité ; (2) manuel sur `docs/rag-tests.md` : la source soutient-elle la phrase ?
- **Jeu de test RAG** : réponse présente (source attendue), sans réponse (refus attendu), piège inter-comptes (aucune fuite).
- **Chat** : fonction Supabase (le jeton de l'utilisateur arrive tel quel, la RLS s'applique). n8n réservé à l'asynchrone : ingestion, rappels, résumé hebdomadaire, calendrier.
- **Embeddings** : critères classés RGPD (hébergement UE) > qualité en français > coût (négligeable à 10-20 entités). Choix avant la première migration (dimension des vecteurs), via `bmad-deep-recon` type `technical`.

## Écarté
- Colonne « fictif » par ligne : mélange démo et réel, risque de citer une note de démo ou de fausser la jauge de plafond. Remplacé par l'isolation RLS `owner_id`.
- Second projet Supabase pour le réel : proposé, non retenu par l'auteur (purge de la base à la place).
- Sacrifier du périmètre pour tenir 130 h : refusé, la contrainte réelle est la date.
- n8n pour le chat : écarté, un maillon de plus à sécuriser.

## Points ouverts
- Critères exacts, formalisme BMAD et date de soutenance : Richard, session du 12 octobre 2026.
- Nom public ; statut juridique et plafond (saisis par l'auteur, avec source).
- 35 h/sem sur ~17 semaines : déclaré, non vérifié.
- Le CRM se justifie surtout par le RAG (10-20 entités) : à garder sous contrôle de périmètre.
