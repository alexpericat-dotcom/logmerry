# Epic 1 Context: Fondations et accès

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Le propriétaire ouvre LogMerry à une adresse web, se connecte en sécurité et arrive sur un cockpit vide dans une zone privée. Cet epic pose le socle (projet en ligne, authentification, structure de navigation) dont dépendent tous les autres.

## Stories

- Story 1.1: Voir LogMerry en ligne
- Story 1.2: Me connecter et me déconnecter
- Story 1.3: Voir mon cockpit vide dans la barre latérale

## Requirements & Constraints

- Connexion e-mail + mot de passe ; inscription publique désactivée ; réinitialisation de mot de passe fonctionnelle.
- Toute page privée est protégée, avec vérification côté serveur.
- Aucune clé secrète dans le code, côté navigateur ou dans Git ; `.env.local` ignoré.
- Interface en français, code et commits en anglais, petits commits.
- Accessibilité de base : `lang="fr"`, un seul `h1` par page, lien « Aller au contenu », focus visible, contrastes 4,5:1.

## Technical Decisions

- Le dépôt vient du template Supabase (Next.js App Router, TypeScript, Tailwind 3, shadcn/ui, `@supabase/ssr`). Il est en Next.js 15.3.1 : monter en 16.x LTS et épingler les versions (Next, `@supabase/ssr`, `@supabase/supabase-js`).
- Hébergement Vercel, région des fonctions `cdg1` (Paris) ; un seul projet Supabase en région UE.
- Variables publiques : `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Aucune clé `service_role` dans l'application.
- Routes privées protégées par `proxy.ts` et revérifiées côté serveur avec `supabase.auth.getUser()` (jamais `getSession()` seul).
- Organisation : `app/` (routes), `components/` (UI seulement), `lib/domain|db|ai`, `supabase/migrations/`.
- Les migrations ne sont jamais appliquées automatiquement par le déploiement.

## UX & Interaction Patterns

- Barre latérale fixe et repliable ; page courante marquée par une barre et du gras, pas par la couleur seule.
- Thème clair/sombre avec `next-themes` ; jetons visuels de `DESIGN.md`.
- Tutoiement dans l'espace privé.
- Connexion : `autocomplete` corrects, bouton « Afficher le mot de passe », aucune énigme ; erreurs qui nomment le champ.

## Cross-Story Dependencies

- 1.2 et 1.3 s'appuient sur le projet déployé de 1.1.
- Epic 2 (notes) suppose la zone privée et la connexion.
