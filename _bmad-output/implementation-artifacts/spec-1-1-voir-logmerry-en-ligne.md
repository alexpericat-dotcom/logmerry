---
title: 'Story 1.1 : Voir LogMerry en ligne'
type: 'feature'
created: '2026-10-13'
status: 'done'
route: 'oneshot'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** le dépôt affiche encore la page du template Supabase (anglais, tutoriel, bouton de déploiement) et ses versions ne sont pas épinglées (`latest`). Rien n'est configuré pour Vercel.

**Approach:** remplacer la page d'accueil par une page LogMerry en français, épingler Next.js 16 et les paquets Supabase aux versions installées, passer le site en `lang="fr"`, et préparer le déploiement Vercel (région Paris). Le déploiement lui-même (import du dépôt, variables, premier build) est fait par le propriétaire dans Vercel, avec une liste de contrôle fournie.

Décisions : `getClaims()` du template est conservé (équivalent moderne de `getUser()` du document d'architecture, qui vérifie la signature du jeton) ; l'inscription publique est traitée en story 1.2.

</frozen-after-approval>

## Implementation Notes

- Next.js 16.4.0 était déjà installé : versions épinglées (Next 16.4.0, `@supabase/ssr` 0.12.7, `@supabase/supabase-js` 2.117.3, `eslint-config-next` 16.4.0).
- `eslint.config.mjs` réécrit au format natif de `eslint-config-next` 16 (l'ancien `FlatCompat` plantait) ; deux erreurs de lint du template corrigées (`tailwind.config.ts`, `theme-switcher.tsx`).
- Page d'accueil remplacée (français, bouton « Se connecter ») ; `lang="fr"` ; template nettoyé (`hero`, `deploy-button`, logos supprimés ; l'en-tête de `app/protected/layout.tsx` affiche « LogMerry »). Le reste de l'anglais des pages d'authentification est traité en story 1.2.
- `vercel.json` (région `cdg1`) et section « Déployer sur Vercel » dans `README.md`. Le déploiement lui-même reste à faire par le propriétaire.
- `AGENTS.md` est généré par `next dev` (règles Next.js pour agents) : conservé.
- Vérifié : `npm run lint`, `tsc --noEmit`, `npm run build` passent ; la page `/` rendue contient `lang="fr"`, le titre « LogMerry » et « Se connecter ».
- Revue par sous-agents non lancée (non demandée) ; relecture manuelle du diff faite.

## Review Triage Log

- Aucune revue indépendante ; point à surveiller : `getClaims()` (template) au lieu de `getUser()` cité dans l'architecture, décision consignée dans l'Intent.

