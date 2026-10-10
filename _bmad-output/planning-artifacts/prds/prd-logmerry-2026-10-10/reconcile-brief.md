# Réconciliation : docs/brief.md vs prd.md + addendum.md

Entrée : `docs/brief.md`. Changements intentionnels non rapportés (calcul par code, phasage, devis, Strava/Coros, chat en fonction Supabase, base unique).

## Écarts (abandons silencieux ou non expliqués)

1. **Planning de 130 h abandonné.** Le brief (§9) donne 5 phases chiffrées (15/35/30/30/20 h). Le PRD ne garde que le jalon du 30 octobre et « MVP après le RAG ». Plus de budget d'heures, ni de phase « Tests, déploiement, démo, documentation ».
2. **Critères de réussite du brief non repris.** Absents du PRD : parcours de démo complet (connexion, client, note, question avec source, historique) ; application déployée sur une URL ; journal de vibe coding à jour comme critère (seulement NFR-5 « traçabilité »). Le déploiement n'est mentionné nulle part. SM-1 à SM-5 portent sur l'usage réel, pas sur la livraison du WS8.
3. **Fonctions « Ensuite » du brief sans destination claire.** Capacité et suivi du temps : déplacés en V2 (suivi du temps) sans mention de la « capacité ». Rappels d'échéances par n8n, résumé hebdomadaire et synchronisation calendrier via n8n : n'apparaissent plus dans les FR ni en V2 (l'addendum ne cite n8n que pour « rappels, résumé hebdomadaire, calendrier » sans FR). Provision et dépenses : « dépenses » disparaît (provisions couvertes par FR-11).
4. **Contexte WS8 et portfolio perdu en partie.** Le brief dit que le projet « sert aussi de portfolio pour la future activité de conseil » ; le PRD ne garde que les deux buts (valider WS8, piloter l'activité). Les exigences WS8 (compte, tableau de bord, recherche, historique, espace structuré) ne sont pas mappées aux FR. La recherche (item 7 du MVP) n'est qu'une conséquence de FR-3, sans FR propre.
5. **Contradictions / précisions mineures.**
   - V2 : le brief précise « l'assistant et le RAG restent privés » pour le portail client ; le PRD l'omet.
   - Brief : plafond « saisi par moi » ; PRD : plafond issu de la table de paramètres, avec valeurs « non vérifiées » (cohérent, mais le statut juridique, question ouverte du brief, n'est plus listé en §9, seulement en hypothèse).
   - Brief : pipeline RAG (découpage avec chevauchement, injection du contexte) ; PRD : pas de chevauchement mentionné (peut-être dans l'architecture).
   - Brief : questions ouvertes « chemin du chat » et « méthode BMAD » ; chemin du chat tranché dans l'addendum (intentionnel), méthode BMAD reprise en §9.1.
   - Ajouts du PRD absents du brief (non gap) : catalogue d'outils, six règles d'adaptation, NFR perf/accessibilité.

## Éléments bien repris
RLS et `owner_id`, aucune clé secrète, paramètres avec source et date, migrations, données de démo étiquetées, langue, hébergement UE, hors-périmètre, V2 portail et SQL, seuil RAG (fixé à 18/20), deux comptes fictifs.
