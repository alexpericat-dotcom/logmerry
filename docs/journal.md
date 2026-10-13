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
