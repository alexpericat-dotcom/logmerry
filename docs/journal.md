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
