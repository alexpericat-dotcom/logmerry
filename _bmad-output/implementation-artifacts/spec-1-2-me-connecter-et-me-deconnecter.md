---
title: 'Story 1.2 : Me connecter et me déconnecter'
type: 'feature'
created: '2026-10-13'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
baseline_commit: 'd61195d2b3364d178666453a06626ca2c1bb8c3d'
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** les pages d'authentification du template Supabase sont en anglais, laissent un lien « Sign up », affichent les messages bruts de Supabase, et le parcours « mot de passe oublié » ne peut pas aboutir : le lien de l'e-mail revient avec un `code` que `/auth/update-password` n'échange pas.

**Approach:** franciser et durcir connexion, déconnexion, mot de passe oublié et nouveau mot de passe ; supprimer l'inscription publique (pages et composant) ; faire passer le lien de réinitialisation par `/auth/confirm` (échange `token_hash` côté serveur) ; vérifier l'utilisateur côté serveur sur la zone privée. La configuration du tableau de bord Supabase est faite par le propriétaire (liste de contrôle fournie).

## Boundaries & Constraints

**Always:** textes en français, tutoiement ; champs avec `autocomplete` corrects (`username`/`email`, `current-password`, `new-password`) ; bouton « Afficher le mot de passe » ; erreurs liées au champ par `aria-describedby` ; aucune clé secrète ; `/auth/confirm` n'accepte qu'un `next` interne (chemin commençant par `/`, pas `//`).

**Never:** lien ou page d'inscription ; clé `service_role` ; migration ou changement de schéma ; barre latérale et cockpit (story 1.3) ; modifier le tableau de bord Supabase depuis le code.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Connexion réussie | e-mail et mot de passe corrects | redirection vers `/protected` | N/A |
| Mauvais mot de passe | e-mail valide, mot de passe faux | reste sur la page, « E-mail ou mot de passe incorrect » sous le champ mot de passe (décision du propriétaire : ne révèle pas si le compte existe) | message traduit, jamais le texte brut de Supabase |
| Champ vide ou e-mail mal formé | champ requis vide | message nommant le champ | validation avant l'appel réseau |
| Mot de passe oublié | e-mail saisi | confirmation neutre (même message si le compte n'existe pas) | erreur réseau : message français |
| Lien de réinitialisation | `/auth/confirm?token_hash=…&type=recovery&next=/auth/update-password` | session ouverte, formulaire du nouveau mot de passe | lien expiré ou invalide : `/auth/error` en français |
| Déconnexion | clic sur « Se déconnecter » | session fermée, retour à `/auth/login` ; `/protected` renvoie ensuite à la connexion | N/A |
| Accès sans session | ouverture de `/protected` | redirection vers `/auth/login` | N/A |
| `next` externe | `next=https://evil.example` | redirection vers `/` | N/A |

</frozen-after-approval>

## Code Map

- `components/login-form.tsx` -- à traduire ; messages, `autocomplete`, afficher le mot de passe ; supprimer le lien « Sign up » ; `router.push("/protected")` à conserver
- `components/forgot-password-form.tsx` -- à traduire ; `redirectTo` à régler pour le parcours `/auth/confirm` ; message de succès neutre
- `components/update-password-form.tsx` -- à traduire ; `new-password`, longueur minimale
- `components/logout-button.tsx`, `components/auth-button.tsx` -- libellés « Se déconnecter », « Bonjour, … » ; plus de bouton « Sign up »
- `app/auth/confirm/route.ts` -- valider `next` (anti-redirection ouverte), erreur sans texte brut
- `app/auth/error/page.tsx` -- à traduire
- `app/auth/sign-up/`, `app/auth/sign-up-success/`, `components/sign-up-form.tsx` -- à supprimer
- `app/protected/page.tsx`, `app/protected/layout.tsx` -- retirer le tutoriel et le pied « Powered by Supabase » ; `getClaims()` conservé (décision de 1.1)
- `lib/supabase/proxy.ts` -- garde `/protected` déjà en place ; ne pas modifier le contournement `/auth`
- `components/tutorial/`, `components/env-var-warning.tsx` -- à supprimer si plus référencés

## Tasks & Acceptance

**Execution:**
- [x] `components/login-form.tsx` -- français, erreurs nommant le champ, afficher le mot de passe, sans lien d'inscription -- critères 1 et 4
- [x] `components/forgot-password-form.tsx`, `components/update-password-form.tsx` -- français, parcours de réinitialisation -- critère 2
- [x] `app/auth/confirm/route.ts` -- `next` interne seulement -- sécurité
- [x] `components/logout-button.tsx`, `components/auth-button.tsx`, `app/auth/error/page.tsx` -- français -- critère 3
- [x] `app/auth/sign-up*`, `components/sign-up-form.tsx` -- suppression -- critère 4
- [x] `app/protected/*` -- retirer le contenu du template -- zone privée propre
- [x] `docs/supabase-auth-setup.md` -- liste de contrôle propriétaire : inscriptions désactivées, modèle d'e-mail « Reset password » pointant vers `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/auth/update-password`, URL de redirection autorisées (production et preview), création du compte -- configuration hors code
- [x] `docs/journal.md` -- entrée de la story -- exigence de traçabilité

**Acceptance Criteria:**
- Given un compte existant, when je saisis e-mail et mot de passe corrects, then j'arrive sur `/protected`.
- Given un mauvais mot de passe, when je valide, then une erreur française s'affiche et nomme le champ.
- Given « Mot de passe oublié », when je suis le lien reçu, then je peux saisir un nouveau mot de passe et me connecter avec.
- Given que je me déconnecte, when j'ouvre `/protected`, then je suis renvoyé vers `/auth/login`.
- Given la page de connexion, then elle ne contient aucun lien vers l'inscription et `/auth/sign-up` renvoie 404.

## Implementation Notes

- Implémenté directement (pas de sous-agent : non demandé). `lib/auth.ts` regroupe `safeNext`, la traduction des erreurs Supabase et les validations ; `components/password-input.tsx` porte le bouton afficher/masquer.
- Lien de réinitialisation : `redirectTo` = `<site>/auth/confirm` et le modèle d'e-mail utilise `{{ .RedirectTo }}` (et non `{{ .SiteURL }}` comme écrit dans la tâche) pour que les previews fonctionnent ; voir `../../docs/supabase-auth-setup.md`.
- Écarts assumés : `hasEnvVars` supprimé (le proxy ne laisse plus passer sans contrôle quand les variables manquent) ; `allowImportingTsExtensions` ajouté à `tsconfig.json` pour le test `node --test` ; `/protected` rend son contenu sous `Suspense` (exigé par Cache Components).
- Vérifié : `npm run lint`, `npx tsc --noEmit`, `npm run build`, `node --test lib/auth.test.ts` (5/5) ; serveur local : `/auth/sign-up` 404, `/protected` sans session 307 vers `/auth/login`, `/auth/confirm?next=https://evil.example` sans jeton vers `/auth/error`.
- Non vérifié (demande le compte et la configuration Supabase du propriétaire) : connexion réussie, déconnexion avec session, e-mail de réinitialisation réel. Lignes de la matrice couvertes par test automatique : `next` externe, message de mauvais mot de passe, champs vides ou mal formés, lien expiré (message). Les autres lignes sont à vérifier à la main (section Verification).

## Spec Change Log

## Review Triage Log

| Finding | Verdict | Route | Evidence |
|---|---|---|---|
| `safeNext` laisse passer tab/retour ligne (`/\t/evil.example`) | medium | patch | Les navigateurs retirent tab et retour ligne d'une URL : `/\t/x` devient `//x`. Corrigé, deux cas ajoutés au test. |
| `/auth/confirm` accepte tout `type` OTP | medium | patch | Seul `recovery` est voulu. Corrigé : tout autre `type` mène à `/auth/error` (vérifié en local). |
| `verifyOtp` qui lève donne une 500 | low | patch | Correction directe : `try/catch`, `redirect` hors du `try`. |
| `signOut` en erreur ignoré, bouton sans état de chargement | medium | patch | Session possiblement ouverte alors que l'utilisateur est renvoyé vers la connexion. Corrigé : message et pas de navigation en cas d'échec. |
| Bouton de connexion réactivé pendant la navigation | low | patch | Correction directe. |
| Erreurs de champ non annoncées | low | patch | `role="alert"` ajouté (trois formulaires). |
| Message `weak_password` promet lettres et chiffres | low | patch | Texte aligné sur la règle réellement appliquée. |
| Test hors du chemin de vérification | medium | patch | Script `npm test` ajouté. |
| Docs : motif d'URL de preview ne couvre pas les adresses de déploiement | medium | patch | Motif élargi à `logmerry-*-new-team-adce.vercel.app`. |
| Journal : phrase « reste à faire » trompeuse | low | patch | Reformulée. |
| Jeton de réinitialisation consommé par un scanner d'e-mails (GET) | maybe-false | defer | Dépend du fournisseur de messagerie ; à vérifier au premier vrai e-mail. |
| Pas de test de la route `/auth/confirm` ni du proxy | medium | defer | Demande un client Supabase simulé ; vérifié à la main en local. |
| `/auth/update-password` affichée sans session | low | false | Le message « lien invalide » apparaît à l'envoi ; un utilisateur connecté peut légitimement changer son mot de passe. |
| Codes d'erreur Supabase non traduits (`email_not_confirmed`, réseau…) | low | false | Le message générique en français s'applique ; correctif = branches en plus. |
| Retrait de `hasEnvVars` : 500 si variables absentes | low | false | Voulu (échec fermé) ; variables définies en Production et Preview. |
| Spec cite `{{ .SiteURL }}`, code utilise `{{ .RedirectTo }}` | low | false | Écart consigné dans Implementation Notes ; corriger la spec est exclu. |
| `allowImportingTsExtensions` global, regex e-mail, IDN, `aria-invalid` e-mail, `h1` dupliqué, « Bonjour, » vide, URL en dur dans la doc | low | false | Cosmétique ou sans effet constaté ; correctifs plus lourds que le défaut. |

## Verification

**Commands:**
- `npm run lint && npx tsc --noEmit && npm run build && npm test` -- expected: succès
- `grep -ri "sign.up\|Sign in\|Login" app components` -- expected: aucune occurrence visible utilisateur

**Manual checks (if no CLI):**
- Sur la preview Vercel, connexion, mauvais mot de passe, déconnexion, réinitialisation par e-mail réel, `/auth/sign-up` en 404.
