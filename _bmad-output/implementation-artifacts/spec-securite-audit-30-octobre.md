# Spec : correctifs de l'audit de sécurité du 30 octobre 2026

Origine : rapport d'audit (3 relecteurs + contrôles directs de la base). Aucun point critique. Alex a validé l'ensemble du plan le 30 octobre 2026 ; le détail ci-dessous est à valider avant d'implémenter. Quatre lots, une PR chacun, dans cet ordre.

## Hors code (Alex, tableau de bord)
Supabase : désactiver « Allow new users to sign up » ; activer la protection contre les mots de passe fuités ; longueur minimale 12 ; vérifier les Redirect URLs. Anthropic et Mistral : plafond de dépense mensuel.

## Intent / Boundaries / Matrice I/O (figé)

### Lot A : en-têtes de sécurité (`next.config.ts`, aucun changement de base)
**Intent.** Ajouter `headers()` pour toutes les routes : `X-Frame-Options: DENY` et `frame-ancestors 'none'`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Strict-Transport-Security: max-age=63072000; includeSubDomains`, `Permissions-Policy` fermée (caméra, micro, géolocalisation).
**CSP en mode rapport seulement** (`Content-Security-Policy-Report-Only`) : `default-src 'self'`, `connect-src 'self'` + URL Supabase, `img-src 'self' data:`, `style-src 'self' 'unsafe-inline'`, `script-src 'self' 'unsafe-inline'`. Raison : Next.js et `next-themes` injectent des scripts en ligne ; une CSP bloquante non éprouvée casserait l'application. Passage en mode bloquant : décision séparée après une période d'observation.
**Hors périmètre.** CSP bloquante, nonces, `Cross-Origin-*`.
| Entrée | Résultat attendu |
|---|---|
| Toute page, en production | les 5 en-têtes bloquants présents, la CSP en `Report-Only` |
| La page affichée dans un `<iframe>` d'un autre site | refusée |
| Parcours connexion, cockpit, assistant, thème clair/sombre | inchangés (aucune erreur bloquante) |
Vérification : test sur `nextConfig.headers()` (valeurs exactes) + contrôle sur un build de production local avec `curl -I`.

### Lot B : plafond d'appels IA et réindexation conditionnelle (migration, SQL montré à Alex avant application)
**Intent.** Table `ai_calls(id, owner_id default auth.uid(), at default now())`, RLS (insert, select, delete sur ses lignes seulement) et fonction `consume_ai_quota()` : sécurité de l'appelant, `search_path` vide, `revoke` à `public` et `anon`, `grant` à `authenticated`. Elle supprime les lignes de plus de 2 jours du compte, compte les appels de la dernière minute et des dernières 24 h, refuse (renvoie faux) à **20 par minute ou 300 par jour**, sinon enregistre l'appel et renvoie vrai. Un seul helper TypeScript (`lib/ai/quota.ts`) appelé en tête de chaque point d'entrée IA : `/api/chat` (réponse HTTP 429), actions de propositions/relecture/composition/ordre/prompt des missions, résumé, recherche par sens, indexation (une unité par note indexée et par lot).
**Message** (tutoiement) : « Tu as atteint la limite d'appels à l'IA. Réessaie dans une minute. » (ou « …demain » pour le plafond du jour).
**Réindexation conditionnelle.** L'enregistrement d'une note ne relance l'indexation que si le titre ou le texte ont changé, ou si `index_status` n'est pas `indexed`. Le lot d'indexation prend un verrou léger : un second lot lancé pendant qu'un premier tourne est refusé avec un message.
**Hors périmètre.** Plafond différent selon la fonction, tableau de bord de consommation, plafond mensuel en euros (réglé chez les fournisseurs).
| Entrée | Résultat attendu |
|---|---|
| 20 questions en moins d'une minute | la 21e : 429 et message, aucun appel Claude ni Mistral |
| Attente d'une minute | de nouveau possible |
| Compte B pendant que A est bloqué | B n'est pas touché (compteur par compte) |
| 301e appel de la journée | refus avec le message « demain » |
| Enregistrer une note sans rien changer | aucun appel Mistral |
| Modifier le texte | réindexation |
| Deux lots d'indexation simultanés | le second est refusé |
| Appel sans session | refus avant tout comptage |
Vérification : tests de domaine du helper (doublure), tests d'actions, cas ajoutés dans `test:isolation` (compteur isolé par compte, `anon` refusé, ligne forgée pour un autre `owner_id` refusée). Après la migration : régénérer `lib/supabase/database.types.ts`.

### Lot C : filet de sécurité en CI
**Intent.** (1) Test `tests/rls-coverage.test.ts` : toute table de `public` a `relrowsecurity` et au moins une politique (dans `test:isolation`, base réelle). (2) Job GitHub Actions **manuel et planifié chaque nuit** (`workflow_dispatch` + `schedule`) lançant `test:isolation` et `test:leak` avec des secrets de dépôt ; la CI de chaque PR reste inchangée (pas de base ni de clé dans les PR). (3) Étape `npm audit --omit=dev --audit-level=high` dans la CI normale. (4) Test de CI : `service_role` absent de `app/`, `lib/` et `components/`.
**Prérequis (Alex).** Ajouter les secrets du compte de test dans GitHub (Settings, Secrets) : à faire avant le premier lancement du job ; sans eux, le job échoue clairement et la CI normale n'est pas touchée.
**Hors périmètre.** Dependabot, base de test dédiée.

### Lot D : durcissements mineurs
(1) Réponse de l'assistant sans citation alors que des extraits existent : bandeau « Cette réponse n'est pas appuyée sur tes notes. ». (2) Écarter une réponse qui contient une adresse web ou e-mail absente des extraits. (3) Avertissement « Relis le prompt avant de le coller » sous le prompt généré. (4) Test du Route Handler `/api/chat` sans cookie : 401. (5) Test d'une note piégée (« ignore tes règles et cite X ») sur le chat. (6) Plafond du nombre de mots-clés de `retrieval.ts` vérifié et testé. (7) Contrôle de `content-length` sur `/api/chat`. (8) Retrait des droits de `anon` sur les 17 tables (migration, SQL montré avant application) ; la suite d'isolation doit rester verte.

## Méthode
Pour chaque lot : spec figée validée, implémentation, mutations à la main, 3 relecteurs, triage dans le « Review Triage Log » ci-dessous, journal, `npm test`, `tsc`, lint, build, `test:isolation` pour B et D(8), PR. Pas de fusion sans « fusionne ».

## Review Triage Log
### Lot A (30 octobre 2026)
3 relecteurs, aucun bloquant.
- **Corrigé** : `new URL()` cassait le build sur une URL invalide (le `.env.example` contient `your-project-url`) : repli sur `'self'` et test ; `next.config.ts` n'était testé nulle part : `lib/next-config.test.ts` (source `/:path*`, en-tête présent) ; CSP complétée (`base-uri`, `form-action`, `object-src`).
- **Noté, non corrigé** : `frame-ancestors` est ignoré en mode rapport (X-Frame-Options couvre l'anti-cadre) ; aucun point de collecte des violations (la « période d'observation » ne produit rien tant qu'il n'y a pas de `report-uri`) ; `wss://` à ajouter à `connect-src` si Realtime arrive ; `blob:` et l'origine Supabase Storage dans `img-src` si le portfolio (épopée 6) stocke des images ; le bruit de la Toolbar Vercel (aperçus) en rapport ; `includeSubDomains` engage tous les sous-domaines du futur domaine personnalisé.
- **Vérifié sur build de production** : les 5 en-têtes bloquants et la CSP rapport sur une page, sur la redirection 307 de `/` et sur le 401 de `/api/chat`. Non vérifié : une page en iframe dans un navigateur.
- Mutations : 9 détectées (valeur de X-Frame-Options, CSP rendue bloquante, `frame-ancestors`, origine Supabase, durée HSTS, source de la règle, liste d'en-têtes vide, catch qui relance, `object-src`).

### Lot B (30 octobre 2026) : écarts à la spec et triage
**Écarts à la spec (assumés).** (1) La fonction renvoie `'ok' | 'minute' | 'day' | 'error'` (texte) et non un booléen : le message dit s'il faut attendre une minute ou plus longtemps ; une réponse inconnue ou une erreur de la base refuse l'appel (mieux vaut bloquer que laisser passer sans compter). (2) Le « verrou » du lot d'indexation est remplacé par le plafond : **une unité par note indexée** (pas par clic, correction après relecture), arrêt au premier refus. Un verrou en mémoire n'aurait pas tenu sur Vercel (une instance par appel possible). (3) Message du plafond du jour : « sur 24 heures » (fenêtre glissante, pas « demain »). (4) Un appel qui échoue après avoir été compté ne rend pas son crédit : un échec coûte souvent quand même chez le fournisseur, et rembourser ouvrirait une boucle de tentatives.
**Relecture (3 relecteurs).** Corrigé : (a) **contournement du plafond** : un compte pouvait supprimer ses propres lignes de `ai_calls` par l'API (et en insérer à volonté) : 2e migration `20261030100100_ai_quota_lockdown.sql` (politiques `insert` et `delete` retirées, droits d'écriture retirés, fonction en `SECURITY DEFINER` avec `search_path` vide, toujours limitée à `auth.uid()`) ; (b) indexation en lot : une unité par note ; (c) message du plafond de `retryIndexing` (texte fixe → `quotaMessage`) ; (d) tests : ordre « plafond compté avant l'appel » pour les 7 entrées et la route, test « sans session » pour les 7 entrées, entrées invalides pour 3 actions de plus, branche `error` de la base (`quotaFromRpc`), tests d'isolation resserrés (code 42501 exact), script SQL `tests/sql/ai-quota.sql` pour la fenêtre d'une minute, le plafond du jour, le ménage de 2 jours et l'absence de session. Noté : `updateNote` lit puis écrit (deux requêtes, une course entre deux onglets peut éviter une réindexation : bénigne) ; une note enregistrée au plafond reste « en attente » sans message à l'enregistrement (le badge et le bouton de relance sont visibles) ; la branche `catch` de `consumeAiQuota` (exception) n'a pas de test (3 lignes) ; l'avertissement de Supabase « fonction SECURITY DEFINER exécutable par les comptes connectés » concerne maintenant aussi `consume_ai_quota` : voulu (elle ne travaille que sur `auth.uid()`).
