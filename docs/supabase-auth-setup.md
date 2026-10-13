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

## 4. E-mail de réinitialisation

Rien à modifier. Le modèle par défaut de Supabase reste en anglais (le modifier exige un SMTP personnalisé). Son lien te renvoie vers `/auth/confirm?next=/auth/update-password&code=…`, que l'application échange contre une session. Le lien doit être ouvert **dans le même navigateur** que celui où tu as demandé la réinitialisation (protection PKCE).

Limite connue : sans SMTP personnalisé, Supabase n'envoie qu'aux adresses des membres de ton organisation et très peu d'e-mails par heure. Utilise donc l'e-mail de ton compte Supabase pour ton compte LogMerry. Un SMTP (Resend, Brevo) sera nécessaire avant l'usage réel.

## 5. Vérifier

1. Connexion avec un mauvais mot de passe : « E-mail ou mot de passe incorrect. » sous le champ mot de passe.
2. Connexion correcte : arrivée sur `/protected`.
3. « Se déconnecter », puis ouvrir `/protected` : retour à `/auth/login`.
4. « Mot de passe oublié » : e-mail reçu, lien ouvre « Nouveau mot de passe », la connexion fonctionne avec le nouveau.
5. `/auth/sign-up` : page introuvable (404).

## 6. (Recommandé) Longueur minimale côté Supabase

Authentication → **Sign In / Providers** → ligne **Email** (à déplier) → **Minimum password length** : **12** → Save. (Le menu « Policies » concerne les règles de la base, pas les mots de passe.) Le formulaire l'exige déjà ; ce réglage le fait respecter côté serveur.
