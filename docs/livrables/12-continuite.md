# Continuité de service et reprise

> **En deux phrases.** LogMerry tourne sur l'**offre gratuite** de Supabase et sur Vercel, ce qui suffit pour un projet de démonstration mais **ne garantit ni sauvegarde automatique, ni disponibilité contractuelle**. Ce chapitre dit ce qui est garanti, ce qui ne l'est pas, comment tout reconstruire, et ce qui reste à tester : **aucun test de restauration n'a encore été réalisé**.

## Ce que l'offre gratuite garantit, et ne garantit pas

Faits relevés sur les pages officielles de Supabase le 4 novembre 2026 (pages non datées : à revérifier sur le site avant de les citer).

| Sujet | Offre gratuite (celle de LogMerry) | Offre Pro |
|---|---|---|
| Sauvegardes automatiques | **Non incluses.** Supabase recommande d'exporter régulièrement les données avec `db dump` et de garder des copies hors du service | Quotidiennes, conservées 7 jours |
| Restauration à la minute près (PITR) | Non incluse | Module payant |
| Pause du projet | **Après 1 semaine d'inactivité** | Jamais |
| Protection contre les mots de passe divulgués | Non incluse | Incluse |
| Disponibilité contractuelle (SLA) | Non incluse | Non incluse (réservée à l'offre Enterprise) |

L'offre gratuite est suffisante pour développer et démontrer. Ses deux limites qui comptent ici sont l'absence de sauvegarde automatique et la mise en pause du projet.

## Objectifs de reprise, tels qu'ils sont aujourd'hui

RPO : quelle quantité de données peut être perdue. RTO : combien de temps pour redémarrer.

| Élément | Où il est conservé | RPO | RTO |
|---|---|---|---|
| Code de l'application | Dépôt GitHub (une branche par fonctionnalité) | Dernier envoi sur GitHub | À mesurer |
| Schéma de la base | 55 migrations versionnées dans `supabase/migrations/` | Aucune perte : rejouables depuis le dépôt | À mesurer |
| Données de la base (notes, clients, factures…) | Supabase seulement | **Âge du dernier export manuel. Aucun export automatique ni planifié n'existe** (aucune tâche de ce type dans `vercel.json` ni dans `.github/workflows/`) | À mesurer |
| Images du portfolio (Supabase Storage) | Supabase Storage ; sources dans `assets-source/` (non commitées) | Non couvertes par un export de la base | À mesurer |
| Variables d'environnement et clés | Vercel et `.env.local` (ignoré par Git) | **À confirmer** : copie hors de ces deux endroits, par exemple dans un gestionnaire de mots de passe | À mesurer |

> **À confirmer.** Les durées de reprise (RTO) ne sont pas mesurées : elles le seront lors du test de restauration prévu plus bas. Je n'en annonce aucune.

## Reconstruire LogMerry de zéro

Procédure de reprise, **non testée** à ce jour :

1. Créer un nouveau projet Supabase, région Paris (`eu-west-3`, comme l'actuel).
2. Appliquer les 55 migrations du dossier `supabase/migrations/` (par l'outil en ligne de commande de Supabase).
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
| Le projet Supabase est mis en pause (1 semaine sans activité) | L'application ne répond plus | Réactiver depuis le tableau de bord Supabase (**À confirmer** : durée et conditions) ; avant la soutenance, vérifier la veille que le projet est actif |
| Suppression ou corruption de données | Perte jusqu'au dernier export | Réimporter l'export ; sans export, la perte est définitive |
| Panne de Supabase | Application indisponible | Attendre ; aucun engagement de délai sur l'offre gratuite |
| Mauvais déploiement | Fonctionnalité cassée | Rétablir le déploiement précédent sur Vercel |
| Panne d'Anthropic ou de Mistral | Assistant indisponible | Mode dégradé ci-dessus ; le reste de l'application fonctionne |
| Clé secrète exposée | Risque d'usage frauduleux | Révoquer la clé chez le fournisseur, en créer une autre, la changer dans Vercel et redéployer |

## Ce qui reste à faire

1. **Test de restauration** (le procès-verbal attendu par ce livrable n'existe pas encore) : exporter la base, la rejouer sur un projet Supabase temporaire, mesurer le temps, vérifier par les tests d'isolation, puis supprimer le projet temporaire. Il demande de créer un second projet gratuit : à faire avec l'accord d'Alex.
2. **Mettre en place l'export hebdomadaire** et décider où l'archiver.
3. **Faire un exercice de retour arrière** sur Vercel.
4. **Avant la soutenance du 16 novembre** : s'assurer que le projet Supabase est actif.
5. **Option** : passer à l'offre Pro apporterait les sauvegardes quotidiennes sur 7 jours, l'absence de pause et la protection contre les mots de passe divulgués, au prix indiqué sur la page tarifs de Supabase.
