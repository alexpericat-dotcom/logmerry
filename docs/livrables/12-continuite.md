# Continuité de service et reprise

> **En deux phrases.** LogMerry tourne sur l'**offre gratuite** de Supabase et sur Vercel, ce qui suffit pour un projet de démonstration mais **ne garantit ni sauvegarde automatique, ni disponibilité contractuelle**. Ce chapitre dit ce qui est garanti, ce qui ne l'est pas, comment tout reconstruire, et ce qui reste à tester : **une restauration a été testée une fois, le 12 novembre 2026 : données et structure principales restaurées, deux écarts connus, corrections non testées** (section « Test de restauration du 12 novembre 2026 »).

## Ce que l'offre gratuite garantit, et ne garantit pas

Faits relevés sur les pages officielles de Supabase le 4 novembre 2026 (pages non datées : à revérifier sur le site avant de les citer). Relus le 10 novembre 2026 : <https://supabase.com/pricing>, <https://supabase.com/docs/guides/platform/free-project-pausing> et <https://supabase.com/docs/guides/platform/backups>. Cette dernière précise que les sauvegardes de la base **n'incluent pas les fichiers du stockage** (« Database backups do not include objects you store via the Storage API »).

| Sujet | Offre gratuite (celle de LogMerry) | Offre Pro |
|---|---|---|
| Sauvegardes automatiques | **Non incluses.** Supabase recommande d'exporter régulièrement les données avec `db dump` et de garder des copies hors du service | Quotidiennes, conservées 7 jours |
| Restauration à la minute près (PITR) | Non incluse | Module payant |
| Pause du projet | **Si l'activité sur la base est trop faible pendant 1 semaine** (la page de Supabase parle d'une activité « sufficient » sur la semaine écoulée et dit que « typically a few user requests to the database each day » suffisent ; le seuil exact n'est pas publié ; un projet en pause se restaure jusqu'à 1 an après la pause) | Jamais |
| Protection contre les mots de passe divulgués | Non incluse | Incluse |
| Disponibilité contractuelle (SLA) | Non incluse | Non incluse (réservée à l'offre Enterprise) |

L'offre gratuite est suffisante pour développer et démontrer. Ses deux limites qui comptent ici sont l'absence de sauvegarde automatique et la mise en pause du projet.

## Objectifs de reprise, tels qu'ils sont aujourd'hui

RPO : quelle quantité de données peut être perdue. RTO : combien de temps pour redémarrer.

| Élément | Où il est conservé | RPO | RTO |
|---|---|---|---|
| Code de l'application | Dépôt GitHub (une branche par fonctionnalité) | Dernier envoi sur GitHub | À mesurer |
| Schéma de la base | 56 migrations versionnées dans `supabase/migrations/` | Aucune perte : rejouables depuis le dépôt | À mesurer |
| Données de la base (notes, clients, factures…) | Supabase seulement | **Âge du dernier export manuel. Aucun export automatique ni planifié n'existe** (aucune tâche de ce type dans `vercel.json` ni dans `.github/workflows/`) | À mesurer |
| Images du portfolio (Supabase Storage) | Supabase Storage ; sources dans `assets-source/` (non commitées) | Non couvertes par un export de la base | À mesurer |
| Variables d'environnement et clés | Vercel et `.env.local` (ignoré par Git) | **À confirmer** : copie hors de ces deux endroits, par exemple dans un gestionnaire de mots de passe | À mesurer |

> **À confirmer.** Les durées de reprise (RTO) ne sont **pas mesurées** : le test de restauration du 12 novembre 2026 n'a pas été chronométré (sa durée totale, de 18 h 20 à 20 h 45 environ, comprend la recherche d'un mot de passe perdu). Je n'en annonce aucune.

## Test de restauration du 12 novembre 2026

**Résultat : restauration testée une fois, données et structure principales restaurées, deux écarts connus, corrections non testées.** Ce n'est pas un « réussi » sans réserve. Faits constatés par l'auteur ; les fichiers d'export ont été supprimés après le test, donc l'assistant n'a pas pu les relire.

| Élément | Constat |
|---|---|
| Outils | `pg_dump` et `psql` 18.6 (libpq) ; pas de CLI Supabase ni de Docker |
| Source et cible | Production PostgreSQL 17.11 (lecture seule) vers un projet temporaire « logmerry-restauration-test » (région « Europe », serveur `eu-west-3`), session pooler, port 5432 ; projet temporaire supprimé ensuite |
| Export | Schéma `public` seul, sans propriétaires : `schema.sql` 120 246 octets, `data.sql` 129 806 octets ; avertissement de `pg_dump` sur `regulatory_rules` (clés étrangères circulaires) |
| Restauration | Une passe, sans transaction unique, avec `SET session_replication_role = replica` avant les données : **17 erreurs, toutes dans `schema.sql`, aucune dans `data.sql`** |
| Données | **Nombre de lignes identique sur les 22 tables** (389 lignes au total) ; seuls des nombres ont été comparés, pas le contenu |
| Structure | Index 66 / 66, politiques de sécurité par ligne 74 / 74, déclencheurs 22 / 22, tables avec sécurité par ligne active 22 / 22, droits de `service_role` 168 / 168 |
| **Écart 1** | **Fonction `match_chunks` absente du projet restauré** (fonctions 23 en production, 22 dans le test, confirmé par requête). Cause supposée : un réglage `hnsw.iterative_scan` refusé à la création (**non vérifié**). Sans elle, la recherche de l'assistant ne fonctionnerait pas sur la base restaurée |
| **Écart 2** | **Droits de `anon` sur `public` : 2 en production, 74 dans le test** ; droits de `authenticated` 153 / 159. Cause supposée : 12 réglages de droits par défaut refusés (« permission denied to change default privileges ») ; le lien avec la case « Automatically expose new tables » décochée **n'est pas établi** |
| Corrections | Recréer la fonction et réappliquer les retraits de droits : **non testées** |
| Durée | **Non mesurée** (18 h 20 à 20 h 45 environ, recherche d'un mot de passe perdu comprise) |
| Non couvert | Comptes `auth.users`, fichiers du stockage (bucket `portfolio`), déclencheurs éventuels sur les tables `auth`, test applicatif et test d'isolation sur la base restaurée |

Les droits de `anon` plus larges dans la base restaurée sont un écart de sécurité à corriger avant de s'appuyer sur cette restauration pour une vraie reprise, sous la seule protection de la sécurité par ligne (active sur les 22 tables).

**Événement lié, 12 novembre 2026 vers 19 h :** le mot de passe de la base de production a été réinitialisé, faute de le retrouver. Aucune chaîne de connexion directe à la base n'existe dans les variables Vercel ni dans les secrets GitHub (noms relevés par l'auteur). Après la réinitialisation, le portfolio public et la connexion au compte de démonstration « semblent fonctionner » (constat de l'auteur, sans test systématique).

## Reconstruire LogMerry de zéro

Procédure de reprise, **non testée de bout en bout** : le test du 12 novembre 2026 ne couvre que la restauration du schéma `public` avec ses données (voir plus bas), pas la procédure ci-dessous :

1. Créer un nouveau projet Supabase, région Paris (`eu-west-3`, comme l'actuel).
2. Appliquer les 56 migrations du dossier `supabase/migrations/` (par l'outil en ligne de commande de Supabase).
3. Importer le dernier export des données.
4. Mettre à jour dans Vercel l'adresse du projet et la clé publique Supabase, ainsi que les clés des services d'IA.
5. Redéployer l'application.
6. Vérifier : les tests d'isolation entre comptes et l'audit de la sécurité par ligne doivent passer.

Le schéma est donc reconstructible sans perte. Seules les **données** dépendent d'un export.

## Exporter les données

Supabase recommande, pour l'offre gratuite, l'export par la commande `supabase db dump`, avec une copie conservée hors du service. Je propose : un export après chaque séance de travail importante et au minimum **une fois par semaine**, rangé hors du dépôt (il contient des données). Ce rythme **n'est pas encore en place**.

## Modes dégradés dans le code

L'IA sert à l'assistant, à l'indexation des notes et aux propositions (stories, tâches, prompts, résumés). Si un service d'IA est en panne, le reste continue de fonctionner : clients, missions, factures, échéances et notes.

| Situation | Ce qui se passe |
|---|---|
| Claude ou Mistral ne répond pas (délais : 60 s pour Claude, 20 s pour Mistral) | L'assistant renvoie une erreur (statut 502) ; rien d'autre n'est bloqué |
| Aucun extrait ne dépasse le seuil de similarité | Message fixe, sans appel à Claude |
| Réponse de Claude contenant un nombre ou une adresse absents des extraits | Réponse rejetée avant affichage (statut 502, message dédié) |
| Quota dépassé : plus de 20 appels par minute ou 300 par jour et par compte | Refus clair (statut 429) ; si le compteur lui-même échoue : statut 503 |
| Échec de l'indexation d'une note | La note est enregistrée ; son état passe à « échec » et l'indexation peut être relancée |
| Échec de l'enregistrement de l'historique d'un échange | La réponse est quand même affichée ; l'erreur est journalisée |
| Utilisateur non connecté | Accès refusé à l'assistant (statut 401) |

## Disponibilité et retour arrière

- **Région.** Supabase (Paris) et les fonctions Vercel (`cdg1`, Paris) sont dans la même région.
- **Déploiements.** Chaque envoi sur GitHub produit un déploiement sur Vercel. Les déploiements de production précédents restent disponibles (au moins huit sont visibles à ce jour, tous « Ready », d'une durée de 23 à 54 secondes). Le retour arrière consiste à rétablir un déploiement précédent. Il **n'a pas été exercé** : à tester.
- **Haute disponibilité.** Elle n'est **pas garantie** : une seule base, une seule région, sans engagement de disponibilité. Ce chapitre ne prétend pas le contraire.

## Scénarios et réponses

| Scénario | Effet | Réponse |
|---|---|---|
| Le projet Supabase est mis en pause (1 semaine sans activité) | L'application ne répond plus | Réactiver depuis le tableau de bord Supabase (« Resume project ») ; avant la soutenance, vérifier la veille que le projet est actif. **Prévention :** le test d'isolation de nuit (`isolation.yml`, 3 h 17 UTC) crée puis supprime des notes dans la vraie base chaque jour, donc la base reçoit des écritures quotidiennes. D'après la page de Supabase, quelques requêtes utilisateur par jour suffisent en général ; que ces écritures de nuit comptent comme telles reste **À confirmer**, et aucun ping dédié n'a été ajouté (sources : `supabase.com/docs/guides/platform/free-project-pausing`, `supabase.com/kb/faqs/platform/free-project-pausing`, discussion `github.com/orgs/supabase/discussions/51126`) |
| Suppression ou corruption de données | Perte jusqu'au dernier export | Réimporter l'export ; sans export, la perte est définitive |
| Panne de Supabase | Application indisponible | Attendre ; aucun engagement de délai sur l'offre gratuite |
| Mauvais déploiement | Fonctionnalité cassée | Rétablir le déploiement précédent sur Vercel |
| Panne d'Anthropic ou de Mistral | Assistant indisponible | Mode dégradé ci-dessus ; le reste de l'application fonctionne |
| Clé secrète exposée | Risque d'usage frauduleux | Révoquer la clé chez le fournisseur, en créer une autre, la changer dans Vercel et redéployer |

## Ce qui reste à faire

1. **Test de restauration : fait une fois le 12 novembre 2026** (procès-verbal dans `docs/plan-test-restauration.md`, section 7). **À refaire ou à compléter :** recréer la fonction `match_chunks` et réappliquer les retraits de droits sur le projet restauré (corrections **non testées**), mesurer les durées, restaurer les comptes et les fichiers du stockage, lancer le test d'isolation et `rls_audit()` sur la base restaurée.
2. **Mettre en place l'export hebdomadaire** et décider où l'archiver.
3. **Faire un exercice de retour arrière** sur Vercel.
4. **Avant la soutenance du 16 novembre** : s'assurer que le projet Supabase est actif.
5. **Option** : passer à l'offre Pro apporterait les sauvegardes quotidiennes sur 7 jours, l'absence de pause et la protection contre les mots de passe divulgués, au prix indiqué sur la page tarifs de Supabase.
