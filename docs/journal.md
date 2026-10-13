# Journal de vibe coding — LogMerry

## 2026-10-13 — Story 1.1 : Voir LogMerry en ligne

- Landing en français, Next.js 16 épinglé, `vercel.json` (région Paris).
- Déploiement : le CLI Vercel est installé. La preview était **bloquée** : « Vercel couldn't find a Git account for the commit author ». Cause : les commits portaient l'e-mail local de la machine. Correction : `git config user.email` sur l'adresse liée à GitHub, nouveau commit, preview Ready.
- `vercel link` a ajouté `.env*` au `.gitignore` (ignorerait `.env.example`) : annulé.

## 2026-10-13 — Story 1.2 : Me connecter et me déconnecter

- Prompt : « Story 1.2 », via `bmad-build` ; spec dans `_bmad-output/implementation-artifacts/spec-1-2-me-connecter-et-me-deconnecter.md`.
- Constats du template : pages en anglais, lien « Sign up », messages bruts de Supabase, parcours « mot de passe oublié » inachevé (le lien revient avec un `code` que personne n'échange), `next` de `/auth/confirm` non contrôlé (redirection ouverte), garde du proxy ouvert si les variables d'environnement manquent.
- Décision du propriétaire : mauvais mot de passe → « E-mail ou mot de passe incorrect » (ne révèle pas si le compte existe).
- Corrections : formulaires en français avec erreurs liées aux champs, bouton afficher/masquer, inscription supprimée, `/auth/confirm` limité aux chemins internes, proxy sans contournement quand les variables manquent.
- Bug de build : `/protected` lisait les cookies hors `Suspense` (Cache Components) → contenu déplacé dans un composant sous `Suspense`. Types `.next` périmés après suppression des pages d'inscription → dossier de types régénéré.
- Tests : `node --test lib/auth.test.ts` (5 tests : `next`, messages d'erreur, validations).
- Revue par 3 sous-agents (aveugle, cas limites, trous de vérification) : 8 correctifs appliqués, le reste consigné dans la spec. Configuration Supabase à faire par le propriétaire en suivant `docs/supabase-auth-setup.md`.
- Blocage Supabase : l'offre gratuite refuse de modifier le modèle d'e-mail sans SMTP personnalisé (capture du tableau de bord). Je m'étais trompé en disant que c'était possible. Décision (option 1) : garder le modèle par défaut et échanger le `code` PKCE dans `/auth/confirm`. SMTP (Resend ou Brevo) à prévoir avant l'usage réel.
- Test sur la preview : message d'erreur générique au lieu de « E-mail ou mot de passe incorrect ». Diagnostic : aucune requête de connexion dans les journaux Supabase (`query_logs`), puis lecture du code de la preview (`vercel curl`) : la clé publique y était une suite de 46 puces « •••• ». La variable Vercel avait été remplie avec le texte masqué du tableau de bord. Correction : variable remplacée par la vraie clé (Preview et Production), build relancé. Leçon : une variable Vercel « masquée » ne doit jamais être copiée depuis l'écran ; la coller depuis `.env.local`.
- Les 5 tests manuels passent sur la preview (mauvais mot de passe, connexion, déconnexion, réinitialisation, inscription en 404). Story 1.2 terminée.

## 2026-10-13 — Story 1.3 : Voir mon cockpit vide dans la barre latérale

- Prompt : « Story 1.3 », via `bmad-build` ; spec `spec-1-3-voir-mon-cockpit-vide-dans-la-barre-laterale.md`.
- Décisions du propriétaire : entrées de barre sans page = affichées, inactives, mention « bientôt » ; palette et police de marque reportées à une story dédiée.
- Réalisé : zone privée `app/(app)/`, page `/aujourd-hui` (remplace `/protected`), barre latérale repliable (cookie), lien « Aller au contenu », un seul `h1`, revérification du jeton côté serveur.
- Écart repéré : le bouton de thème n'avait pas de nom accessible → `aria-label` ajouté.
- Revue par 3 sous-agents : 4 correctifs (erreur de déconnexion lisible barre repliée, test des pages et constante `HOME_PATH`, repère `aside`, références `/protected` de la doc), un point reporté (vérification propre à chaque page), le reste écarté avec preuve dans la spec.
- Contrôles manuels sur la preview : connexion et barre, repli mémorisé au rechargement, lien « Aller au contenu », thème clair/sombre, déconnexion puis `/aujourd-hui` renvoyé à la connexion : tous OK. Story 1.3 terminée.

## 2026-10-13 — Story 2.1 : Créer et lister mes notes

- Prompt : « Story 2.1 », via `bmad-build` ; spec `spec-2-1-creer-et-lister-mes-notes.md`.
- Première migration : table `notes` (RLS, 4 policies sur `owner_id`), SQL montré puis approuvé avant application via le MCP Supabase. Contrôles après application : RLS active, 4 policies présentes, aucun avertissement sur `notes`.
- Code : liste `/notes` (état vide, ordre récent → ancien), création `/notes/nouvelle`, validation du titre en fonction pure testée.
- Remarque : le CLI Supabase n'est pas installé ; la migration passe par le MCP, le fichier de `supabase/migrations/` porte la version enregistrée par Supabase.
- Revue par 3 sous-agents : 7 correctifs (session vérifiée avant validation, erreurs réseau gérées, titre compté en points de code, texte limité à 50 000 caractères et caractère nul retiré, écran d'erreur français avec « Réessayer », débordement des titres longs, découpe d'extrait sans casser les emoji), trois reports (test de l'action et RLS à deux comptes en 2.3, pagination en 2.4, contrainte de longueur côté base avec la migration de la 2.2).

- Liste des notes : l'heure (Paris) s'affiche maintenant avec la date, à la demande du propriétaire après l'essai de la preview.
- Essais manuels sur la preview : liste vide, création, titre vide refusé, ordre récent → ancien : OK. Contrôle en base (lecture seule) : les 2 notes de test ont bien `owner_id` = ton compte (rempli par `auth.uid()`). Story 2.1 terminée.

## 2026-10-13 — Story 2.2 : Modifier, classer et supprimer une note

- Prompt : « Story 2.2 », via `bmad-build` ; spec `spec-2-2-modifier-classer-supprimer-une-note.md`. Décision du propriétaire : confirmation de suppression en ligne (pas de fenêtre modale).
- Seconde migration : type de note (enum), `updated_at` avec déclencheur, limite de 50 000 caractères sur le texte (reportée depuis la revue de la 2.1). SQL montré puis approuvé avant application ; contrôles après application OK.
- Code : page `/notes/[id]` (modification + suppression), filtre par type, type choisi à la création, actions factorisées.
- Revue par 3 sous-agents : 6 correctifs dont un vrai bug (le message d'échec de suppression restait invisible tant que la confirmation était ouverte), note disparue distinguée d'une erreur, annulation bloquée pendant une suppression en cours ; reports : tests des actions et de la base avec la story 2.3, filtre conservé au retour sur la liste.
- Essais manuels sur la preview : modification, type et filtre, suppression avec annulation et confirmation, note introuvable : OK. Contrôle en base (lecture seule) : la note restante a le type `faq` et `updated_at` postérieur à `created_at`, donc le déclencheur fonctionne ; la suppression a bien retiré l'autre note. Story 2.2 terminée.

## 2026-10-13 — Story 2.3 : Deux comptes fictifs ne se voient pas

- Prompt : « Story 2.3 », via `bmad-build` (route courte) ; spec `spec-2-3-deux-comptes-fictifs-ne-se-voient-pas.md`.
- Comptes fictifs « démo A » et « démo B » (`demo-a@example.com`, `demo-b@example.com`) créés par SQL après accord explicite du propriétaire (la première tentative a été bloquée par le système : écriture de données dans `auth`) ; connexion des deux vérifiée avec l'API de connexion. Identifiants dans `.env.test.local`, ignoré par git.
- Bug rencontré : mon premier test de connexion a échoué à cause de `${!var}` (indirection bash absente de zsh), sans lien avec les comptes ; refait en Python.
- Script `npm run test:isolation` : 11 vérifications passées, dont B ne peut ni lire, ni modifier, ni supprimer la note de A, ni se faire attribuer ou attribuer une note ; déclencheur `updated_at`, contrainte de 50 000 caractères, titre vide et type inconnu vérifiés. Aucun reste de test en base après exécution.
- À rejouer après chaque migration touchant une table.
- Revue par un relecteur indépendant : 5 correctifs (test rendu symétrique avec une note de B, codes d'erreur RLS exigés, cas sans connexion durci, cause de l'échec de connexion, modèle `.env.test.local.example`), deux reports (nouvelles tables, branchement en CI). Résultat final : `npm run test:isolation` 13/13, aucun reste de test en base.

## 2026-10-13 — Story 2.4 : Rechercher dans mes notes avec ⌘K

- Prompt : « Story 2.4 », via `bmad-build` ; spec `spec-2-4-rechercher-dans-mes-notes-avec-cmd-k.md`. Décision du propriétaire : plein texte français avec début de mot ; accents non neutralisés (limite connue).
- Troisième migration : colonne `search` (tsvector généré), index GIN, fonction `search_notes` en `security invoker`, réservée aux comptes connectés. SQL montré puis approuvé avant application ; conseiller de sécurité : aucun nouvel avertissement.
- Code : normalisation de la requête testée, Server Action `searchNotes`, palette en `<dialog>` natif (⌘K / Ctrl+K, bouton « Rechercher », flèches, Entrée, Échap), sans nouvelle dépendance.
- Bug rencontré : le premier appel de la migration a échoué (identifiant du projet manquant), sans effet en base. Lint : `setState` dans un effet refusé, état « réponse correspondant à la saisie » déduit à la place.
- Vérifications : lint, tsc, build, `npm test` 23/23, `npm run test:isolation` 14/14 (A trouve sa note, B non, refus sans connexion).
- Revue par 3 sous-agents : 5 correctifs (clic sur le rembourrage fermait la palette, rejet réseau non géré, réponse en vol après fermeture, option active non défilée, sémantique SQL non testée : corps, début de mot, classement, mots vides, opérateurs, limite de 20), 9 constats écartés (dont accents : limite voulue ; `[:alnum:]` mesuré OK). `test:isolation` 15/15.
- Piège de la preview : la Vercel Toolbar capte ⌘K sur les déploiements preview (absente en production) ; essai via le bouton « Rechercher » puis toolbar fermée. Autre piège : l'URL d'une preview est fixée à un commit, il faut ouvrir celle du dernier push.
- Essais manuels sur la preview : bouton, ⌘K, recherche, ouverture d'une note, Échap : OK. Story 2.4 terminée.

## 2026-10-13 — Story 8.1 : Préparer le serveur pour l'IA (sprint 3)

- Prompt : « Story 8.1 », via `bmad-build` ; spec `spec-8-1-preparer-le-serveur-pour-l-ia.md`. Ordre suivi : celui du plan des sprints (le RAG d'abord, jalon du 30 octobre), pas celui des numéros d'epic ; branche `feat/sprint-3-preparer-ia` créée depuis la branche du sprint 2 (PR #2 pas encore fusionnée).
- Quatrième migration : extension `vector` (schéma `extensions`) et table `note_chunks` (RLS à 4 policies, `vector(1024)` nullable, `embedding_model` obligatoire, index HNSW cosinus, cascade depuis `notes`). SQL montré puis approuvé avant application ; conseiller de sécurité : aucun nouvel avertissement.
- Code : `lib/ai/config.ts` (`server-only`, lecture des 3 variables à l'appel, build possible sans clés) et `lib/domain/ai-config.ts` (validation pure testée : l'erreur nomme la variable, jamais sa valeur). Noms des variables dans `.env.example`.
- Clés Anthropic et Mistral créées par le propriétaire, mises dans `.env.local` (vérifié sans afficher les valeurs ; ignoré par git). Reste à les mettre dans Vercel (Production et Preview) avant la story 8.3.
- Contrôle manuel : un composant client qui importe `lib/ai/` fait échouer le build (« server-only »), retiré ensuite.
- Vérifications : lint, tsc, build, `npm test` 25/25, `npm run test:isolation` 16/16 (extraits : B ne voit, ne modifie, ne supprime ni ne crée rien chez A ; anonyme refusé ; cascade ; vecteur de mauvaise dimension refusé).
- Revue par 3 sous-agents : 1 défaut réel (high) trouvé par les trois : un compte pouvait rattacher un extrait à la note d'un autre (les contrôles de clé étrangère ignorent la RLS). Prouvé par un test rouge avant correction, puis corrigé par une cinquième migration (policies insert et update qui vérifient la propriété de la note) ; `test:isolation` 17/17. Autres : test de dimension précisé, `AI_CHAT_MODEL` sans valeur par défaut dans `.env.example` ; 1 report (recherche HNSW filtrée, story 8.5) ; 9 constats écartés (triage dans la spec).
- Incident : l'outil MCP `apply_migration` a refusé 4 appels d'affilée (« declined », sans fenêtre d'approbation visible) ; le SQL, déjà approuvé, a été collé à la main dans le SQL Editor de Supabase. Conséquence : cette migration n'est pas dans la liste de Supabase (`list_migrations`) ; son fichier porte la version 20261013160000 choisie par nous. Le script est rejouable.

## 2026-10-13 — Story 8.2 : Découper une note en extraits (sprint 3)

- Prompt : « Story 8.2 », via `bmad-build` (route courte : une fonction pure, rien d'irréversible) ; spec `spec-8-2-decouper-une-note-en-extraits.md`.
- Décisions : extraits d'environ 1 000 caractères avec chevauchement de 150, coupés de préférence à un paragraphe, une ligne, une fin de phrase ou un espace ; reprise calée sur un début de mot ; texte vide : zéro extrait ; le titre sera joint au texte vectorisé par la story 8.3.
- Code : `lib/domain/chunking.ts` et ses tests (taille, chevauchement, couverture, texte sans espace, emoji, note de 50 000 caractères). `npm test` 35/35, lint et tsc propres.
- Revue par un relecteur indépendant : 6 correctifs (commentaire sur les emoji, test d'emoji direct, borne basse du chevauchement, test de la coupe à la phrase, test chronométré retiré, note sur la détection naïve des phrases), 3 constats écartés (triage dans la spec).

## 2026-10-14 — Story 8.3 : Indexer une note à l'enregistrement (sprint 3)

- Prompt : « Story 8.3 », via `bmad-build` ; spec `spec-8-3-indexer-une-note-a-l-enregistrement.md`. Choix tranchés : réindexation à chaque sauvegarde ; en cas d'échec, anciens extraits supprimés (jamais de passage périmé) ; note sans texte : état « indexée », aucun appel IA.
- Cinquième migration : enum `index_status` et colonne `notes.index_status` (défaut « en attente »). SQL montré puis approuvé ; cette fois l'outil MCP l'a appliquée (version 20261013152420) ; conseiller de sécurité : rien de nouveau.
- Appel réel à Mistral vérifié d'abord avec un texte fictif (200, vecteurs de 1 024 valeurs, index dans l'ordre), sans `fetch` ni dépendance ajoutés au projet.
- Code : `lib/ai/embeddings.ts` (serveur seul, lots de 16, délai de 20 s), `lib/domain/embeddings.ts` (lots, validation de la réponse), `lib/domain/index-note.ts` (orchestration pure testable), branchement dans la sauvegarde, `retryIndexing`, pastille d'état dans la liste et sur la page, bouton de nouvel essai.
- Vérification de bout en bout avec les deux comptes fictifs et le vrai Mistral (script jetable) : 4 extraits indexés, remplacés par 1 puis 0, B ne voit rien, clé invalide : « échec » et extraits supprimés, journal sans clé ni contenu.
- Revue par 3 sous-agents : 4 correctifs (orchestration sans test : déplacée dans `lib/domain` avec 7 tests ; bouton aussi pour « en attente » ; échecs de remise en ordre journalisés ; erreur de lecture du « Réessayer » mal présentée), 1 report (`embedTexts` avec `fetch` simulé), le reste écarté (triage dans la spec). Vérifications : lint, tsc, build, `npm test` 45/45, `npm run test:isolation` 18/18.
- Essai sur la preview : premier essai en « échec » (variables d'IA absentes de Vercel : le journal serveur disait `Variable d'environnement manquante : ANTHROPIC_API_KEY`, sans clé ni contenu) ; note bien enregistrée, pastille « Échec d'indexation » et bouton « Réessayer » visibles, message d'échec propre. Constat : l'outil MCP Vercel est refusé (403), la CLI `vercel logs` a servi à lire les journaux. Variables ajoutées (Production et Preview), puis redéploiement obligatoire (une variable ne s'applique qu'aux nouveaux déploiements) ; « Réessayer » : « Indexée ». Contrôle en base (lecture seule) : chaque note a 1 extrait, `mistral-embed`, vecteur de 1 024 valeurs. Story 8.3 terminée.
- Piège : l'indexation exige les trois variables, y compris la clé Anthropic inutile pour vectoriser ; amélioration proposée (lire seulement la clé Mistral), à décider.

## 2026-10-14 — Story 8.4 : Indexer mes notes existantes (sprint 3)

- Prompt : « Story 8.4 », via `bmad-build` (route courte, sans migration) ; spec `spec-8-4-indexer-mes-notes-existantes.md`. Décision : le bouton vit dans Paramètres (comme prévu par les critères), page créée en première version et entrée activée dans la barre ; les paramètres de la story 4.1 s'y ajouteront.
- Règles : le bouton indexe mes notes « en attente » ou « en échec » (25 par clic, un compteur indique indexées, en échec, restantes) ; une note sans texte passe « indexée » sans appel IA ; une note avec texte est indexée même en brouillon ; relancer ne touche pas aux notes déjà indexées et remplace toujours les extraits (aucun doublon).
- Vérification avec le vrai Mistral et le compte fictif A (script jetable, même logique que l'action) : 3 notes indexées au 1er clic, 0 au 2e, extraits identiques, la note de B reste « en attente ». `npm test` 49/49, `npm run test:isolation` 18/18, lint, tsc, build.
- Revue par un relecteur indépendant : 3 correctifs (« en attente » avant « en échec », journal serveur des erreurs, message « déjà indexées »), 6 constats écartés (triage dans la spec).
- Essai sur la preview (compte du propriétaire) : page Paramètres, compteur et bouton : OK. Story 8.4 terminée ; sprint 3 (stories 8.1 à 8.4) terminé.
