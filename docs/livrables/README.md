# Livrables de la soutenance du 16 novembre 2026

Liste de livrables donnée par Richard (tuteur) le 30 octobre 2026 (**déclaré par l'auteur ; non vérifié : aucune trace écrite de Richard dans le dépôt**), reprise dans ce dépôt le 4 novembre 2026 ; objectif : **prêts vendredi 6 novembre au matin** (rendez-vous avec le tuteur). Leur lien avec le Workshop 8 et avec les critères de notation n'est pas précisé, et ils n'ont pas de lien avec le numéro RNCP : ne rien supposer sur les critères de notation, les confirmer avec le tuteur.

Règle : rien d'inventé. Ce qui est dans ces documents vient du code, des migrations, des tests et des documents du projet ; ce qui est inconnu est écrit « À confirmer ».

Le PDF d'ensemble se génère avec `npm run livrables` (Chrome sans interface, aucun service externe) : couverture, sommaire avec numéros de page, un chapitre par fichier `NN-*.md`. Résultat : `livrables-soutenance.pdf`.

Statuts, d'après la relecture de tous les chapitres le 10 novembre 2026 (cellules longues tronquées à l'affichage ; diagrammes du chapitre 1 parcourus, non lus ligne à ligne) : **complet** = tout ce que l'intitulé demande est couvert ; **partiel** = une partie de l'intitulé n'est pas couverte (voir la réserve). Les intitulés sont ceux de la liste de Richard, mot pour mot (liste déclarée par l'auteur, non vérifiée par l'assistant).

| N° | Intitulé (liste de Richard) | Chapitre | Statut | Réserve |
|---|---|---|---|---|
| 1 | Schéma de données (conceptuel/logique), dictionnaire et règles d'intégrité | `01-schema-de-donnees.md` | **complet** | Relu dans la base le 4 novembre ; dictionnaire limité aux colonnes principales |
| 2 | Diagrammes de workflows (états, événements, règles, exceptions, SLA) | `02-workflows.md` | **partiel** | États des workflows métier documentés (devis, sprint, mission, facture calculée, réalisation) ; exceptions et SLA hors RAG non documentés |
| 3 | Guide UX / design system (gabarits, composants, critères d'accessibilité) | `03-ux-design-system.md` | **partiel** | Une ligne sur les composants, aucune section « gabarits » ; maquettes périmées ; parcours clavier non essayé |
| 4 | Spécifications d'intégration (contrats d'API, webhooks, mappings, authentification) | `04-integration-api-auth.md` | **partiel** | Mappings documentés pour 3 cas ; autres formulaires non relus ; webhooks : aucun |
| 5 | Exigences QoS (budgets de performance, observabilité, résilience, modes dégradés) | `05-qos.md` | **partiel** | Budgets seulement proposés ; aucune alerte ; aucune mesure en production |
| 6 | Application / feature IA-driven opérationnelle (lien, QR, démo) | `06-demo.md` | **partiel** | Scénario non rejoué en entier en production |
| 7 | Rapport d'évaluation (jeu de tests et métriques : pertinence, hallucinations, latence, coût) | `07-rapport-evaluation.md` | **complet** | Coût estimé ; corpus de 11 notes (score optimiste) |
| 8 | Registre des données et index RAG, politiques de gouvernance | `08-registre-rag.md` | **complet** | Purge non exécutée ; conditions des prestataires d'IA à confirmer |
| 9 | Dossier de garde-fous et conformité (modération, PII, journalisation) | `09-garde-fous.md` | **partiel** | Ni modération ni détection de données personnelles ; journalisation sans contenu |
| 10 | Dossier de déploiement et exécution (pipelines dev→prod, compte rendu de mise en production, stratégie de rollback) | `10-deploiement.md` | **complet** | Retour arrière jamais exercé ; affirmation sur les préversions non revérifiée |
| 11 | Sécurité d'accès opérationnelle : SSO/MFA, matrice IAM (rôles/droits), gestion des secrets | `11-securite-acces.md` | **partiel** | Ni SSO ni MFA (TOTP disponible, non utilisé) ; matrice réduite à trois situations ; pas de rotation des secrets documentée |
| 12 | Continuité testée : sauvegardes (RPO/RTO), procès-verbal de test de restauration, PRA/PCA synthétique, mode dégradé, haute disponibilité | `12-continuite.md` | **partiel** | Aucune sauvegarde automatique ; restauration testée une fois (12 novembre 2026), procès-verbal rempli (`docs/plan-test-restauration.md`), RTO non mesuré |
| 13 | Exploitation et conformité actives : tableau de bord (logs, métriques, alertes), kit support N1/N2 (FAQ, SLA), registre RGPD/sécurité synthétique | `13-exploitation-conformite.md` | **partiel** | Aucune alerte d'indisponibilité automatisée ; pas de tableau de bord unique ; aucun SLA engagé |

## Questions ouvertes

Les questions de l'ancienne liste (rédigée avant le 6 novembre) sont réglées, sauf deux ; une troisième s'y ajoute (annotations de Richard). Réglées : offre Supabase (plan Free, déclaré par l'auteur : `13-exploitation-conformite.md:92`), MFA (aucun : `11-securite-acces.md:14`), état de la production Vercel (commit `89bd458` au 9 novembre : `10-deploiement.md:26`), mesures payantes du livrable 7 (exécutées le 4 novembre : `07-rapport-evaluation.md:44`, `docs/rag-tests.md:120-121`). L'ordre de rédaction « en deux jours » est périmé : les 13 chapitres existent.

- **Format de remise.** Un PDF unique produit ; confirmation écrite de Richard non disponible.
- **Ce que désigne « MCP » dans le livrable 2.** Le chapitre 2 dit qu'aucun MCP n'est intégré à l'application et que le MCP Supabase ne sert qu'au développement (`02-workflows.md:145-147`) ; la validation de cette formulation par l'auteur n'est pas consignée.
- **Annotations de Richard sur la liste.** Aucune annotation séparée n'a été fournie : les statuts ci-dessus n'en tiennent pas compte.
