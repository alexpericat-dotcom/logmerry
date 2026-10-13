# Configuration de l'authentification Supabase (story 1.2)

À faire une fois, dans le tableau de bord Supabase du projet LogMerry (Authentication). Ces réglages ne sont pas dans le code.

## 1. Désactiver l'inscription publique

Authentication → Sign In / Providers → **désactiver « Allow new users to sign up »**. Le code n'a plus de page d'inscription ; ce réglage ferme aussi l'API.

## 2. Créer ton compte

Authentication → Users → **Add user** → e-mail + mot de passe d'au moins 12 caractères, avec **Auto Confirm User** coché.

## 3. Adresses de redirection autorisées

Authentication → URL Configuration.

- **Site URL** : `https://logmerry.vercel.app`
- **Redirect URLs** (une par ligne) :
  - `https://logmerry.vercel.app/**`
  - `https://logmerry-*-new-team-adce.vercel.app/**` (previews : adresses de branche et de déploiement)
  - `http://localhost:3000/**`

## 4. Modèle d'e-mail « Reset password »

Authentication → Email Templates → **Reset Password**. Remplacer le lien par :

```html
<h2>Nouveau mot de passe</h2>
<p><a href="{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=recovery&next=/auth/update-password">Choisir un nouveau mot de passe</a></p>
```

`{{ .RedirectTo }}` vaut `<adresse du site>/auth/confirm` (le formulaire « Mot de passe oublié » le fournit). Le lien passe par `/auth/confirm`, qui échange `token_hash` côté serveur puis ouvre `/auth/update-password`.

## 5. Vérifier

1. Connexion avec un mauvais mot de passe : « E-mail ou mot de passe incorrect. » sous le champ mot de passe.
2. Connexion correcte : arrivée sur `/protected`.
3. « Se déconnecter », puis ouvrir `/protected` : retour à `/auth/login`.
4. « Mot de passe oublié » : e-mail reçu, lien ouvre « Nouveau mot de passe », la connexion fonctionne avec le nouveau.
5. `/auth/sign-up` : page introuvable (404).

## 6. (Recommandé) Longueur minimale côté Supabase

Authentication → Policies → longueur minimale du mot de passe : **12**. Le formulaire l'exige déjà ; ce réglage le fait respecter côté serveur.
