# Plan du test de restauration (à exécuter par l'auteur, mercredi 11 novembre 2026)

**Statut : exécuté une fois le 12 novembre 2026 par l'auteur ; résultats consignés en section 7, d'après le message de l'auteur (faits constatés par lui, non revérifiés par l'assistant : les fichiers d'export ont été supprimés). Le plan ci-dessus est celui qui était prévu ; les écarts sont listés en section 7.**

## 1. Objectif
Prouver qu'une sauvegarde manuelle de la base de production se restaure dans un **second projet Supabase Free temporaire**, et mesurer le temps que cela prend (RTO observé). C'est ce qui manque au livrable 12 (« continuité testée », chapitre 12, ligne « Ce qui reste à faire »).

## 2. Règles de sécurité
- Les chaînes de connexion (adresse, mot de passe de la base) sont **saisies par l'auteur dans son terminal** : jamais dans le dépôt, jamais dans le chat, jamais lues par l'assistant. Suggestion (à adapter) : saisie masquée avec `read -rs PROD_URL` puis `read -rs TEST_URL`, variables d'environnement du seul terminal, effacées à la fin (`unset`).
- Les fichiers d'export sont écrits **hors du dépôt**, jamais commités, en lecture pour l'auteur seulement, et **supprimés à la fin**. Ils peuvent contenir des données personnelles (comptes de démonstration, messages de visiteurs du formulaire de contact) : à vérifier avant de les ranger.
  - Dossier proposé : `EXPORT_DIR="$(mktemp -d "$HOME/restauration-test-XXXXXX")" && chmod 700 "$EXPORT_DIR"`. `$HOME` (`/Users/alexpericat`) n'est pas un dépôt Git (vérifié par `git -C "$HOME" rev-parse` : « not a git repository ») et le dépôt du projet est `/Users/alexpericat/logmerry`, donc un chemin `$HOME/restauration-test-*` est **hors du dépôt**.
  - Contrôle avant d'écrire un fichier : `git -C "$EXPORT_DIR" rev-parse --is-inside-work-tree` doit répondre « not a git repository » ; s'il répond `true`, **s'arrêter**.
- **Aucune commande d'écriture ne vise la production.** Seul l'export lit la base source. Relire chaque commande avant de l'exécuter : `source` = production, `cible` = projet temporaire.

## 3. Prérequis (état du 12 novembre 2026, soir)
- **Outils :** `libpq` installé par Homebrew pour `pg_dump` et `psql` ; **pas de CLI Supabase, pas de Docker** (décision de l'auteur : le CLI `supabase db dump` lance `pg_dump` dans un conteneur, d'après https://supabase.com/docs/guides/self-hosting/restore-from-platform). Installé le 12 novembre 2026 : `pg_dump (PostgreSQL) 18.6` et `psql (PostgreSQL) 18.6` (`/usr/local/opt/libpq/bin`, non ajouté au `PATH` par l'assistant). Pour la session en cours : `export PATH="/usr/local/opt/libpq/bin:$PATH"`.
- **Écart avec les pages officielles, à consigner.** Les deux pages officielles (https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore et https://supabase.com/docs/guides/self-hosting/restore-from-platform) donnent l'export avec `supabase db dump`, et la restauration avec `psql`. **Aucune des deux ne donne de commande `pg_dump`** ; la seconde écrit : « Using raw `pg_dump` directly will include Supabase internals and cause permission errors during restore. » Les commandes `pg_dump` ci-dessous sont donc **de mémoire, non vérifiées** ; elles se limitent au schéma `public` pour éviter les objets internes.
- **Limite de projets Free actifs :** « Limit of 2 active projects » (https://supabase.com/pricing) ; les projets en pause ne comptent pas (https://supabase.com/docs/guides/platform/billing-on-supabase). À vérifier dans l'organisation.
- **Connexion : session pooler** (compatible IPv4). La page https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore dit : « Use the direct connection string. If your network doesn't support [IPv6] and you don't have the [IPv4 add-on] enabled, use the [Session pooler] connection string instead. » Forme donnée par la page : `postgresql://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@aws-0-us-east-1.pooler.supabase.com:5432/postgres` (le nom d'hôte de la région est celui affiché dans le tableau de bord pour chaque projet : **non vérifié** pour eu-west-3).
- **Saisie des chaînes par l'auteur seulement** (jamais lues par l'assistant) : `read -rs PROD_URL` puis `read -rs TEST_URL` (saisie masquée ; **de mémoire, non vérifié** sous zsh).
- **Réglages du projet temporaire, à consigner au procès-verbal :** région « Europe » (la production est en `eu-west-3`) ; « Automatically expose new tables » décoché ; Data API activée ; RLS automatique désactivée. **Impact de ces réglages sur la restauration : non vérifié.**

## 4. Périmètre

**Couvert :** schéma `public` (tables de l'application, index, fonctions, politiques de sécurité par ligne) **avec les données**.

**Non couvert, et comment le gérer :**

| Élément | Pourquoi | Gestion | Source |
|---|---|---|---|
| Comptes (`auth.users`) | Hors schéma `public`. Les 22 tables portent `owner_id` qui référence `auth.users` (migrations) | Avec `schema.sql` puis `SET session_replication_role = replica` puis `data.sql`, les lignes devraient se charger avec des `owner_id` orphelins (**raisonnement, non vérifié** ; voir « Pourquoi deux fichiers »). Les comptes de test créés dans le projet temporaire auront d'autres identifiants : le test d'isolation sur les données restaurées n'est donc pas significatif. Option, **non vérifiée et non documentée** : exporter `auth.users` seulement (données) | La seconde page officielle dit que `auth.users` est dans l'export du CLI (« Your `auth.users` table and related data are included in the database dump ») ; la première ne le dit pas |
| Fichiers du stockage | Les sauvegardes de base ne contiennent pas les objets du stockage | Noter « non restaurés ». Le bucket `portfolio` et ses règles sont créés par `20261030170000_realisation_images.sql` et `20261030180000_realisation_images_hardening.sql` (schéma `storage`, hors export) : à rejouer à la main si on veut le bucket (**non vérifié**) | https://supabase.com/docs/guides/platform/backups (lue le 10 novembre) ; la page de restauration décrit un script Node pour les objets |
| Rôles et mots de passe | Pas de `roles.sql` dans ce périmètre | Les rôles `anon`, `authenticated`, `service_role` existent dans tout projet Supabase (**non vérifié**) ; aucun rôle personnalisé n'est connu dans les migrations (**à vérifier**) | Page de restauration : mots de passe des rôles personnalisés à redéfinir |
| Extensions | `CREATE EXTENSION` n'est pas dans un export limité à `public` | Les migrations en utilisent trois, toutes `with schema extensions` : `unaccent` (`20261013131016`…), `vector`, `btree_gist` (grep `create extension` dans `supabase/migrations/`). Aucune autre, ni `pg_cron`, ni `pg_net`. À activer dans le projet temporaire **avant** la restauration (tableau de bord, « Extensions », ou `create extension if not exists vector with schema extensions;`) | « Enable any non-default extensions » : page de restauration ; la requête `select * from pg_extension;` y est aussi |
| Historique des migrations (`supabase_migrations`) | Hors périmètre | Non restauré, noté | Page 1 : export séparé avec `--schema supabase_migrations` (CLI) |

## 5. Étapes courtes (point d'arrêt : **20 h 45**)

Estimation totale : 1 h 35 à 2 h, **non mesurée**. Si une étape déborde, passer au nettoyage (étape 12) à 20 h 30 au plus tard.

| # | Étape | Temps | Commande ou action | Origine |
|---|---|---|---|---|
| 1 | Installer, noter les versions | 5 min | `brew install libpq` ; `pg_dump --version` ; `psql --version` | Homebrew ; versions : compte rendu |
| 2 | Créer le projet temporaire (heure de début du RTO), réglages de la section 3, nom « LogMerry-restauration-test » | 10 min | Tableau de bord | Réglages donnés par l'auteur |
| 3 | Activer `vector`, `unaccent`, `btree_gist` dans le projet temporaire | 5 min | Tableau de bord, « Extensions » | Page de restauration (principe) |
| 4 | Saisir les chaînes, créer le dossier d'export | 5 min | `read -rs PROD_URL` ; `read -rs TEST_URL` ; `EXPORT_DIR="$(mktemp -d "$HOME/restauration-test-XXXXXX")" && chmod 700 "$EXPORT_DIR"` ; `git -C "$EXPORT_DIR" rev-parse --is-inside-work-tree` doit répondre « not a git repository » | Plan du 10 nov. (mémoire pour `read`, `mktemp`) |
| 5 | Lire la version de Postgres de la production (voir « Version » ci-dessous) | 2 min | `psql "$PROD_URL" -Atc "select current_setting('server_version'), current_setting('server_version_num')"` : noter les deux nombres au procès-verbal | **Non vérifié** (mémoire) ; requête de lecture seule |
| 6 | Exporter en **deux fichiers**, dans l'ordre de la page officielle (schéma, puis données) | 10 min | `pg_dump "$PROD_URL" --schema=public --schema-only --no-owner --file="$EXPORT_DIR/schema.sql"` ; `pg_dump "$PROD_URL" --schema=public --data-only --no-owner --file="$EXPORT_DIR/data.sql"` ; noter durées et tailles (`ls -l`) | Découpage et ordre : pages officielles (`schema.sql`, `data.sql`) ; options `pg_dump` **de mémoire, non vérifiées** |
| 7 | Restaurer une première fois **sans** `--single-transaction` pour lister toutes les erreurs | 10 min | `psql --variable ON_ERROR_STOP=0 --file "$EXPORT_DIR/schema.sql" --command 'SET session_replication_role = replica' --file "$EXPORT_DIR/data.sql" --dbname "$TEST_URL" 2> "$EXPORT_DIR/erreurs.txt"` | Structure : page 1 (backup-restore) ; principe « sans `--single-transaction` d'abord » : page de restauration ; **sans `roles.sql`, `ON_ERROR_STOP=0` : non vérifié** |
| 8 | Si les erreurs sont toutes « attendues » (voir ci-dessous), ne pas refaire ; sinon repartir d'un projet vide et restaurer en une transaction | 10 min | même commande avec `--single-transaction --variable ON_ERROR_STOP=1` | Forme : page 1 ; **non vérifié** sans `roles.sql` |
| 9 | Comptages source et cible, comparaison (nombres seulement) | 15 min | Voir ci-dessous | Requête **de mémoire, non vérifiée** |
| 10 | `select * from rls_audit();` sur la cible | 5 min | `psql "$TEST_URL" -c "select * from rls_audit();"` | Fonction du dépôt (`20261030110000_rls_audit.sql`) |
| 11 | Noter ce qui n'est pas couvert (comptes, stockage, extensions réelles) | 10 min | `psql "$TEST_URL" -Atc "select count(*) from auth.users"` ; `select extname from pg_extension` | Page de restauration (requêtes) |
| 12 | Nettoyer | 15 min | Section 6 | Plan du 10 nov. |

**`session_replication_role` avec `pg_dump` (réponse à la question a).** Un `pg_dump` en format texte **ne le positionne pas** (de mémoire : le fichier contient des `SET` de session comme `client_encoding`, pas celui-là ; seule l'option `--disable-triggers` produit des `DISABLE TRIGGER`, et elle exige un super-utilisateur : **non vérifié**, non utilisée). Il est donc positionné **par `psql`**, avec `--command 'SET session_replication_role = replica'` placé **entre `schema.sql` et `data.sql`**, comme sur les deux pages officielles. `psql` exécute les `--file` et `--command` dans l'ordre, dans la **même connexion** (comportement **non vérifié** ici ; les pages l'utilisent ainsi). La page dit que ce réglage « disables triggers » ; les clés étrangères étant des déclencheurs, leur contrôle est suspendu pendant le chargement (**raisonnement, non vérifié**).

**Pourquoi deux fichiers, et les clés étrangères vers `auth.users` (réponse à la question b).** Un seul fichier de `pg_dump` ajoute les clés étrangères **après** les données ; l'ajout d'une clé étrangère contrôle les lignes existantes **sans passer par les déclencheurs** : `session_replication_role` ne l'empêche pas, et chacune des 22 clés `owner_id` échouerait (**de mémoire, non vérifié**). Avec `schema.sql` puis `data.sql`, les clés existent déjà au chargement des données et sont suspendues par le réglage. Pour 22 colonnes, `grep -h "references auth.users" supabase/migrations/*.sql` donne 22 lignes.

| Cas | À quoi on le reconnaît dans `erreurs.txt` | Verdict |
|---|---|---|
| **Attendu** : clé vers `auth.users` contrôlée malgré tout (réglage non appliqué) | Message `violates foreign key constraint "<table>_owner_id_fkey"` et détail `is not present in table "users"` ; code 23503. Noms par défaut, aucune migration ne nomme ces clés (grep) | Noter, ne pas considérer comme échec : la table concernée a un **comptage à 0** à l'étape 9 (un `COPY` échoue en entier) ; consigner la liste des tables |
| **Attendu** : version trop récente de `pg_dump` | `unrecognized configuration parameter "transaction_timeout"` | Contournement de la page de restauration : `sed -i '' 's/^SET transaction_timeout/-- &/' data.sql` (page : `sed -i` GNU ; sous macOS, `sed -i ''`) |
| **Attendu** : lignes `ALTER ... OWNER TO "supabase_admin"` | `permission denied` | Page 1 : commenter ces lignes (inutile avec `--no-owner`) |
| **Vraie erreur** | Tout autre message ; ou un 23503 dont la clé ne finit pas par `_owner_id_fkey` ; ou `could not open extension control file` (extension oubliée à l'étape 3) ; ou un comptage différent sans erreur FK | Consigner telle quelle au procès-verbal, conclure « restauration partielle » ou « échec » |

Commande de tri, nombres seulement : `grep -c 'owner_id_fkey' "$EXPORT_DIR/erreurs.txt"` (attendues) et `grep -c 'ERROR' "$EXPORT_DIR/erreurs.txt"` (total) ; la différence est le nombre d'erreurs à lire. **Non vérifié** : le format exact des messages de ta version de `psql`.

**Version (réponse à la question c).** La production est lue par la requête de l'étape 5, dans ton terminal ; je ne la lis pas. Règle : la version **majeure** de `pg_dump` doit être **supérieure ou égale** à celle du serveur source (`pg_dump` refuse un serveur plus récent que lui : **de mémoire, non vérifié**, aucune page officielle lue ici ne le dit). Exemple : serveur `17.x` (`server_version_num` à partir de 170000), `pg_dump` 17 ou plus. Les pages officielles disent seulement que les fichiers du CLI sont « compatibles across Postgres versions ». Une version de `pg_dump` plus récente que la cible peut produire des lignes que la cible refuse (cas `transaction_timeout`, officiel). La version majeure de la cible : même requête sur `$TEST_URL`, à noter.

**Comptages (étape 9).** Un seul fichier de requête, lancé sur les deux bases, qui ne rend que des noms de table et des nombres :

```
psql "$PROD_URL" -At -F ' ' -c "select table_name, (xpath('/row/c/text()', query_to_xml(format('select count(*) as c from public.%I', table_name), false, true, '')))[1]::text::int from information_schema.tables where table_schema = 'public' and table_type = 'BASE TABLE' order by 1" > "$EXPORT_DIR/compte-source.txt"
psql "$TEST_URL"  -At -F ' ' -c "…même requête…" > "$EXPORT_DIR/compte-cible.txt"
join "$EXPORT_DIR/compte-source.txt" "$EXPORT_DIR/compte-cible.txt"
```

**Non vérifié.** Si tous les nombres sont 0 des deux côtés, le rôle de connexion ne contourne peut-être pas la sécurité par ligne (**non vérifié**) : le noter, ne pas conclure. Reporter les résultats dans le tableau « table, source, cible, écart » du procès-verbal.

## 6. Nettoyage (cases à cocher au procès-verbal)
- ☐ Vérifier d'abord le nom du projet (c'est le projet **temporaire**), puis le supprimer.
- ☐ Supprimer le dossier d'export (`rm -r "$EXPORT_DIR"`), vérifier qu'il n'existe plus (`ls "$EXPORT_DIR"`). Il contient l'export et les fichiers de comptage.
- ☐ `unset PROD_URL TEST_URL EXPORT_DIR`, retirer de l'historique du terminal les lignes qui contiennent une chaîne de connexion.

## 7. Procès-verbal (rempli le 12 novembre 2026 d'après les faits donnés par l'auteur ; « non communiqué » = non fourni, « non vérifié » = hypothèse)

Formulation retenue : **restauration testée une fois, données et structure principales restaurées, deux écarts connus, corrections non testées.** Ce n'est pas « réussie » sans nuance.

| Champ | Valeur |
|---|---|
| Date | 12 novembre 2026 |
| Heures | Début vers 18 h 20, fin vers 20 h 45 (nettoyage constaté à 20 h 43). **Durée totale non mesurée avec précision** : elle comprend la recherche d'un mot de passe de base perdu (réinitialisé vers 19 h) |
| Durée totale (RTO observé) | **Non mesurée.** Pas de chronomètre sur l'export, la restauration, la vérification. Aucune durée de reprise n'est annoncée |
| Outils et versions | `pg_dump` 18.6 et `psql` 18.6 (libpq installé par Homebrew) ; pas de CLI Supabase ni de Docker |
| Projet source | LogMerry (production), PostgreSQL **17.11** (lu par SQL, lecture seule), région `eu-west-3`, connexion par session pooler, port 5432 |
| Projet temporaire | « logmerry-restauration-test », région choisie « Europe » (le serveur de connexion affichait `eu-west-3`), session pooler, port 5432 |
| Réglages du projet temporaire | Data API activée ; « Automatically expose new tables » décoché ; RLS automatique désactivée ; aucun dépôt GitHub lié. Impact de ces réglages sur la restauration : **non vérifié** |
| Commandes d'export (sans chaîne de connexion) | Exactement celles des étapes 5, 6a et 6b du plan (confirmé par l'auteur) : lecture de la version (`psql "$PROD_URL" -Atc "select current_setting('server_version'), current_setting('server_version_num')"`), puis `pg_dump "$PROD_URL" --schema=public --schema-only --no-owner --file="$EXPORT_DIR/schema.sql"` et `pg_dump "$PROD_URL" --schema=public --data-only --no-owner --file="$EXPORT_DIR/data.sql"` |
| Durée de l'export | Non mesurée. Export réalisé vers 20 h 34 |
| Taille des fichiers d'export | `schema.sql` 120 246 octets ; `data.sql` 129 806 octets (schéma `public` seul, sans propriétaires). Avertissement de `pg_dump` sur `regulatory_rules` (clés étrangères circulaires) |
| Commande de restauration (sans chaîne de connexion) | Exactement celle de l'étape 7 du plan (confirmé par l'auteur), avec pour seule différence les deux redirections `> sortie.txt 2> erreurs.txt` : `psql --variable ON_ERROR_STOP=0 --file "$EXPORT_DIR/schema.sql" --command 'SET session_replication_role = replica' --file "$EXPORT_DIR/data.sql" --dbname "$TEST_URL"` (une passe, sans transaction unique, erreurs non bloquantes) |
| Garde-fous avant restauration | Base de test : 0 table dans `public` ; production : 24 objets dans `public` (22 tables, plus probablement 2 vues : **non vérifié**) ; identifiants de projet différents |
| Durée de la restauration | Non mesurée |
| Résultat de la restauration | **Partielle, avec deux écarts connus.** Toutes les données chargées (comptages identiques) ; structure principale identique (voir ci-dessous) ; une fonction absente et des droits par défaut différents |
| Erreurs rencontrées, telles quelles | **17 erreurs, toutes dans `schema.sql`, aucune dans `data.sql`.** 1 attendue (schéma `public` déjà existant). 1 : « permission denied to set parameter "hnsw.iterative_scan" » (ligne 482). 3 : « function public.match_chunks(extensions.vector, double precision, integer) does not exist » (lignes 3186 à 3188). 12 : « permission denied to change default privileges » (lignes 3527 à 3530, 3546 à 3549, 3565 à 3568) |
| Extensions dans le projet temporaire | Identiques à la production : `btree_gist` 1.7, `vector` 0.8.2, `unaccent` 1.1, `uuid-ossp` 1.1, `pgcrypto` 1.3, `plpgsql` 1.0, `pg_stat_statements` 1.11 |
| Comptes dans le projet temporaire | Non couverts : les lignes référencent des comptes absents (`auth.users` non exporté) ; contrôles de clés étrangères suspendus par `session_replication_role = replica`. Aucune erreur de clé étrangère n'est apparue |
| Fichiers du stockage | **Non restaurés** (bucket `portfolio` non couvert) |
| Comparaison de la structure, production / test | Index 66 / 66 ; politiques de sécurité par ligne 74 / 74 ; déclencheurs 22 / 22 ; tables avec sécurité par ligne active 22 / 22 ; droits de `service_role` 168 / 168 (identiques). **Différences : fonctions 23 / 22** (`match_chunks` présente en production, **absente du test**, confirmé par requête) ; **droits de `anon` sur `public` : 2 / 74** ; droits de `authenticated` : 153 / 159 |
| Résultat de `rls_audit()` | Non communiqué (comparaison « tables avec sécurité par ligne active » 22 / 22 seulement) |
| Résultat du test d'isolation | Non lancé, non communiqué : pas de test applicatif sur la base restaurée |
| Écarts constatés avec ce plan | Voir la liste sous le tableau |
| Nettoyage : projet temporaire supprimé | ☑ supprimé dans le tableau de bord ; la liste des projets ne montre plus que LogMerry (constaté à 20 h 43) |
| Nettoyage : dossier d'export supprimé | ☑ par `rm` : **pas un effacement sécurisé** ; fichiers non relus ensuite |
| Nettoyage : chemin d'export hors du dépôt, vérifié avant l'écriture | ☐ non communiqué |
| Nettoyage : variables du terminal | ☑ effacées ; historique du terminal : ☐ non communiqué |
| Conclusion de l'auteur (sans enjolivement) | Voir ci-dessous |

### Comptage de lignes par table, production et test (diff vide, d'après l'auteur ; nombres seulement)

| Table | Production = test | Table | Production = test |
|---|---|---|---|
| `ai_calls` | 66 | `payments` | 11 |
| `clients` | 10 | `professional_profile` | 5 |
| `contact_form_settings` | 1 | `quotes` | 3 |
| `contact_submissions` | 0 | `realisation_images` | 3 |
| `contacts` | 3 | `realisations` | 3 |
| `deadlines` | 8 | `regulatory_rules` | 6 |
| `invoices` | 14 | `sprints` | 19 |
| `message_citations` | 3 | `task_checks` | 6 |
| `messages` | 16 | `tasks` | 138 |
| `missions` | 10 | `user_stories` | 58 |
| `note_chunks` | 2 | `notes` | 4 |

22 tables ; total **389** lignes (recalculé par l'assistant à partir de ces nombres : 389, identique au chiffre de l'auteur).

### Réglages du serveur de production
- Mot de passe de la base de production **réinitialisé vers 19 h**, car introuvable. Avant : aucune chaîne de connexion directe à la base dans les variables Vercel (`AI_CHAT_MODEL`, `ANTHROPIC_API_KEY`, `MISTRAL_API_KEY`, une clé publique, l'URL Supabase) ni dans les secrets GitHub (`SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_URL`, e-mail et mot de passe de `TEST_A` et `TEST_B`). Après : le portfolio public et la connexion au compte de démonstration « semblent fonctionner » (constat de l'auteur, **sans test systématique**).

### Hypothèses, toutes **non vérifiées**
- `match_chunks` est absente parce que sa définition contient un réglage `hnsw.iterative_scan` refusé à la création, d'où les trois erreurs suivantes.
- Les droits de `anon` plus larges viennent des 12 réglages de droits par défaut refusés ; le lien avec la case « Automatically expose new tables » décochée n'est **pas établi**.
- **Les deux corrections manuelles (recréer la fonction, réappliquer les retraits de droits) n'ont pas été testées.**

### Écarts avec le plan
1. Export et restauration avec `pg_dump` et `psql` 18.6, sans CLI Supabase ni Docker (le plan du 10 novembre laissait le choix entre le CLI et les clients PostgreSQL).
2. Découpage en deux fichiers (schéma, données) : aucune erreur de clé étrangère vers `auth.users`, ce que le plan attendait possible.
3. L'erreur « schéma `public` existant » est apparue (le plan envisageait un conflit de ce type, non vérifié).
4. Deux erreurs de droits que le plan ne prévoyait pas : paramètre `hnsw.iterative_scan` et droits par défaut.
5. Le test d'isolation et `rls_audit()` n'ont pas été lancés (non communiqués).
6. Mot de passe de la production réinitialisé en cours de route.
7. Le dossier d'export a été supprimé par `rm`, pas par un effacement sécurisé.

### Non couvert par ce test
Comptes `auth.users`, fichiers du stockage (bucket `portfolio`), déclencheurs éventuels sur les tables `auth`, test applicatif sur la base restaurée, comparaison du contenu (seulement des nombres de lignes).

## 8. À vérifier (non affirmé)
- Toutes les commandes `pg_dump` et la requête de comptage (de mémoire).
- Que la restauration d'un fichier `public.sql` unique passe avec `SET session_replication_role = replica` et sans `CREATE SCHEMA public` en conflit.
- Le contenu de l'export : des données personnelles de comptes de démonstration et des messages de visiteurs peuvent y figurer (comptage de lignes seulement, jamais de contenu).
- Que `pgvector` s'active sans autre action dans le projet temporaire et que l'index vectoriel se reconstruit.
- Le nom d'hôte du session pooler pour `eu-west-3`.
- La limite de projets Free actifs dans l'organisation.
- L'effet des réglages du projet temporaire (exposition automatique, RLS automatique) sur les droits restaurés.

## Sources (pages de Supabase lues par l'assistant les 10 et 12 novembre 2026 ; pages non datées)
- <https://supabase.com/docs/guides/self-hosting/restore-from-platform> (lue le 12 novembre : `pg_dump` brut déconseillé, `auth.users` dans l'export du CLI, extensions, `psql`)
- <https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore> (commandes, stockage, schéma `auth`, extensions)
- <https://supabase.com/docs/guides/platform/backups> (objets du stockage non inclus ; sauvegardes automatiques : plans payants ; export recommandé pour le plan gratuit)
- <https://supabase.com/pricing> (« Automatic backups : Not included » en Free ; « Limit of 2 active projects »)
- <https://supabase.com/docs/guides/platform/billing-on-supabase> (« Paused projects do not count towards your free project limit »)
