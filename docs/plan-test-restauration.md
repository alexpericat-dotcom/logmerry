# Plan du test de restauration (à exécuter par l'auteur, mercredi 11 novembre 2026)

**Statut : préparé, non exécuté. Rien n'a été lancé ni testé.** Ce document ne contient aucun résultat. Le procès-verbal (section 5) est vide : il sera rempli par l'auteur avec les résultats réels, y compris partiels ou en échec.

## 1. Objectif
Prouver qu'une sauvegarde manuelle de la base de production se restaure dans un **second projet Supabase Free temporaire**, et mesurer le temps que cela prend (RTO observé). C'est ce qui manque au livrable 12 (« continuité testée », chapitre 12, ligne « Ce qui reste à faire »).

## 2. Règles de sécurité
- Les chaînes de connexion (adresse, mot de passe de la base) sont **saisies par l'auteur dans son terminal** : jamais dans le dépôt, jamais dans le chat, jamais lues par l'assistant. Suggestion (à adapter) : saisie masquée avec `read -rs SOURCE_URL` puis `read -rs CIBLE_URL`, variables d'environnement du seul terminal, effacées à la fin (`unset`).
- Les fichiers d'export sont écrits **hors du dépôt**, jamais commités, en lecture pour l'auteur seulement, et **supprimés à la fin**. Ils peuvent contenir des données personnelles (comptes de démonstration, messages de visiteurs du formulaire de contact) : à vérifier avant de les ranger.
  - Dossier proposé : `EXPORT_DIR="$(mktemp -d "$HOME/restauration-test-XXXXXX")" && chmod 700 "$EXPORT_DIR"`. `$HOME` (`/Users/alexpericat`) n'est pas un dépôt Git (vérifié par `git -C "$HOME" rev-parse` : « not a git repository ») et le dépôt du projet est `/Users/alexpericat/logmerry`, donc un chemin `$HOME/restauration-test-*` est **hors du dépôt**.
  - Contrôle avant d'écrire un fichier : `git -C "$EXPORT_DIR" rev-parse --is-inside-work-tree` doit répondre « not a git repository » ; s'il répond `true`, **s'arrêter**.
- **Aucune commande d'écriture ne vise la production.** Seul l'export lit la base source. Relire chaque commande avant de l'exécuter : `source` = production, `cible` = projet temporaire.

## 3. Prérequis (à vérifier)
- **Outils : absents de la machine de développement au 10 novembre 2026.** `which pg_dump psql supabase docker` ne trouve aucun des quatre. À installer avant : au choix le CLI Supabase (qui peut demander Docker : **non vérifié**) ou les outils clients PostgreSQL (`pg_dump`, `psql`).
- **Système détecté (`uname`, `sw_vers`) :** macOS 13.7.8, Darwin 22.6.0, architecture x86_64 (Intel) ; Homebrew présent (`/usr/local/bin/brew`). **Commandes d'installation proposées : non vérifiées, non exécutées.**
  - CLI Supabase : `brew install supabase/tap/supabase` (commande donnée par la page <https://supabase.com/docs/guides/local-development/cli/getting-started>, lue le 10 novembre 2026 ; jamais exécutée ici). La même page dit que la pile locale tourne dans des conteneurs et nécessite un moteur de conteneurs ; **elle ne dit pas** si `supabase db dump` en a besoin (la page de référence résume `db dump` comme lançant `pg_dump` « dans un conteneur » : résumé non vérifié mot à mot).
  - Clients PostgreSQL (`pg_dump`, `psql`) : `brew install libpq`, puis ajouter son dossier `bin` au `PATH` (sur Mac Intel, probablement `/usr/local/opt/libpq/bin` ; **non vérifié**). La version de `pg_dump` doit être au moins celle du serveur source : **non vérifié**.
  - Moteur de conteneurs, seulement si le CLI le réclame : Docker Desktop (par exemple `brew install --cask docker`, **non vérifié**) ou l'une des alternatives citées par la page Supabase (OrbStack, colima, Podman, Rancher Desktop).
- **Limite de projets Free actifs :** la page tarifaire indique « Limit of 2 active projects » ; la page de facturation indique que les projets en pause ne comptent pas. **À vérifier dans l'organisation** avant de créer le projet temporaire.
- Le mot de passe de la base source (tableau de bord Supabase) et celui du projet temporaire, à portée de main.
- Les deux comptes de test du test d'isolation : variables `TEST_A_EMAIL`, `TEST_A_PASSWORD`, `TEST_B_EMAIL`, `TEST_B_PASSWORD`, `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` (noms relevés dans `.github/workflows/isolation.yml`).

## 4. Étapes (3 h au plus, estimation non mesurée)
1. **Préparer (30 à 45 min).** Installer les outils, vérifier `which`. Noter l'heure de début dans le procès-verbal.
2. **Créer le projet temporaire (10 min).** Supabase, région Paris, nom explicite (« LogMerry-restauration-test »). Noter son adresse dans le terminal seulement.
3. **Activer les extensions utilisées par les migrations (5 min), à vérifier.** Les migrations demandent `vector` (pgvector), `unaccent` et `btree_gist`, dans le schéma `extensions` (`supabase/migrations/`, lignes `create extension`). Elles les créent si elles sont rejouées, mais une restauration par fichier de schéma peut échouer si elles manquent : **à vérifier**.
4. **Exporter la base source (15 min).** Selon la page de Supabase « Backup and Restore using the CLI » : trois exports (rôles, schéma, données) avec `supabase db dump`, ou l'équivalent `pg_dump`. **Commandes citées par la page, à vérifier avec l'aide du CLI installé (`supabase db dump --help`) :**
   - `supabase db dump --remote=[CONNEXION] -f roles.sql --role-only`
   - `supabase db dump --remote=[CONNEXION] -f schema.sql`
   - `supabase db dump --remote=[CONNEXION] -f data.sql --use-copy --data-only -x "storage.buckets_vectors" -x "storage.vector_indexes"`
   Noter la **durée** et la **taille** de chaque fichier.
5. **Restaurer dans le projet temporaire (30 min).** Commande citée par la même page : `psql --single-transaction --variable ON_ERROR_STOP=1 --file roles.sql --file schema.sql --command 'SET session_replication_role = replica' --file data.sql --dbname [CONNEXION_CIBLE]`. Noter chaque erreur telle quelle. Si la restauration échoue, **le noter** : c'est un résultat valable du procès-verbal.
6. **Ce que la sauvegarde ne couvre pas, à constater et noter (20 min).**
   - **Fichiers du stockage :** les sauvegardes de base n'incluent pas les objets du stockage (« Database backups do not include objects you store via the Storage API »). Le bucket `portfolio` est créé par une migration ; ses fichiers (captures du portfolio) ne seront pas là. Les noter comme **non restaurés**, ou suivre la section « Migrating storage objects » de la page.
   - **Schéma `auth` (comptes) :** la page dit que les modifications des schémas `auth` et `storage` doivent être restaurées séparément ; **l'inclusion des comptes dans l'export n'est pas indiquée : à vérifier**. Constater dans le projet temporaire si des comptes existent.
   - **Mots de passe des rôles personnalisés :** à redéfinir à la main d'après la page.
7. **Vérifier (40 min).**
   - Nombre de lignes par table, source contre cible (22 tables : chapitre 1).
   - `select * from rls_audit();` (fonction de `supabase/migrations/20261030110000_rls_audit.sql`) : aucune table sans sécurité par ligne.
   - Créer, si besoin, les deux comptes de test dans le projet temporaire (tableau de bord, « Add user »).
   - Lancer le test d'isolation contre le projet temporaire avec les variables exportées dans le terminal : `node --test tests/isolation.test.ts`. **Non vérifié** : la commande habituelle (`npm run test:isolation`) charge `.env.local` ; la priorité entre variables du terminal et fichiers d'environnement n'a pas été vérifiée, et le test ne doit pas pointer par erreur vers la production.
8. **Chronométrer.** RTO observé = de la fin de la création du projet temporaire (étape 2) à la vérification réussie (étape 7).
9. **Nettoyer (15 min).** Vérifier d'abord le nom du projet (c'est bien le projet **temporaire**, jamais la production), puis : supprimer le projet temporaire ; supprimer le dossier d'export et vérifier qu'il n'existe plus (`ls "$EXPORT_DIR"`) ; `unset` des variables ; retirer de l'historique du terminal les lignes contenant des chaînes de connexion. Cocher chaque suppression dans le procès-verbal (section 5).

## 5. Procès-verbal (à remplir par l'auteur ; aucun champ n'est prérempli)

| Champ | Valeur |
|---|---|
| Date et heure de début | |
| Date et heure de fin | |
| Durée totale (RTO observé) | |
| Outils et versions (`pg_dump`, `psql`, CLI Supabase) | |
| Projet source (nom, région) | |
| Projet temporaire (nom, région) | |
| Commande d'export (sans chaîne de connexion) | |
| Durée de l'export | |
| Taille des fichiers d'export | |
| Commande de restauration (sans chaîne de connexion) | |
| Durée de la restauration | |
| Résultat de la restauration (réussie, partielle, échec) | |
| Erreurs rencontrées, telles quelles | |
| Extensions activées dans le projet temporaire | |
| Comptes présents dans le projet temporaire après la restauration | |
| Fichiers du stockage : restaurés ou non | |
| Nombre de lignes par table : source / cible | |
| Résultat de `rls_audit()` | |
| Résultat du test d'isolation (nombre de contrôles, échecs) | |
| Écarts constatés avec ce plan | |
| Nettoyage : projet temporaire supprimé (date, heure) | ☐ |
| Nettoyage : fichier et dossier d'export supprimés (date, heure) | ☐ |
| Nettoyage : chemin d'export hors du dépôt, vérifié avant l'écriture | ☐ |
| Nettoyage : variables et historique du terminal | |
| Conclusion de l'auteur (sans enjolivement) | |

## 6. À vérifier (non affirmé)
- Les trois outils (CLI Supabase, Docker, clients PostgreSQL) : lesquels sont réellement nécessaires pour l'export.
- Que `pgvector` s'active sans autre action dans le projet temporaire, et que l'index vectoriel se reconstruit.
- Ce que l'export contient du schéma `auth`.
- Le comportement du test d'isolation face aux variables d'environnement.
- La limite de projets Free actifs dans l'organisation.
- Les données personnelles présentes dans l'export.

## Sources (pages de Supabase lues par l'assistant le 10 novembre 2026 ; pages non datées)
- <https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore> (commandes, stockage, schéma `auth`, extensions)
- <https://supabase.com/docs/guides/platform/backups> (objets du stockage non inclus ; sauvegardes automatiques : plans payants ; export recommandé pour le plan gratuit)
- <https://supabase.com/pricing> (« Automatic backups : Not included » en Free ; « Limit of 2 active projects »)
- <https://supabase.com/docs/guides/platform/billing-on-supabase> (« Paused projects do not count towards your free project limit »)
