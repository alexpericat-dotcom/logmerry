---
title: 'Story 1.3 : Voir mon cockpit vide dans la barre latérale'
type: 'feature'
created: '2026-10-13'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
baseline_commit: 'f02a28919d54e905bb0c529d00d4b183ddf28d5e'
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** après connexion, `/protected` n'affiche qu'un texte provisoire : pas de barre latérale, pas de page « Aujourd'hui », pas de lien d'évitement, titre de page générique.

**Approach:** créer la zone privée `app/(app)/` (architecture) avec une barre latérale fixe et repliable (Cockpit, Notes, Clients, Missions, Factures, Échéances, Paramètres, Réalisations, À faire), la page « Aujourd'hui » vide sur `/aujourd-hui` (remplace `/protected`), le thème clair/sombre, un seul `h1`, le lien « Aller au contenu » et la revérification du jeton côté serveur.

## Boundaries & Constraints

**Always:** textes en français, tutoiement ; page courante = `aria-current="page"` + barre de 3 px + gras (jamais la couleur seule) ; bouton de repli avec `aria-expanded`, état mémorisé dans un cookie ; entrées repliées avec `aria-label` et infobulle ; cibles ≥ 24 px ; focus visible ; repères `nav` et `main#main` (`tabindex="-1"`) ; `<title>` « Aujourd'hui · LogMerry » ; contenu rendu seulement si `getClaims()` valide, sinon redirection vers `/auth/login`.

**Décisions du propriétaire :** les entrées dont la page n'existe pas encore sont affichées mais inactives, avec la mention « bientôt » (`aria-disabled`, sans navigation, pas de page 404) ; la palette et la police de marque sont reportées à une story dédiée (le thème neutre du template reste).

**Never:** logique de tâches, jauge, bandeau dégradé, panneau assistant, `⌘K` ; table, migration ou donnée ; panneau `Sheet` pour téléphone (reporté) ; nouvelle dépendance.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Connecté, ouverture | session valide, `/aujourd-hui` | barre latérale, `h1` « Aujourd'hui », message de page vide | N/A |
| Sans session | ouverture de `/aujourd-hui` | redirection vers `/auth/login` | N/A |
| Après connexion ou réinitialisation | succès | arrivée sur `/aujourd-hui` | N/A |
| Repli | clic sur le bouton de repli | icônes seules, `aria-expanded="false"`, état conservé au rechargement | cookie absent : barre dépliée |
| Page courante | `/aujourd-hui` | entrée Cockpit marquée (`aria-current`, barre, gras) | N/A |
| Clavier | première tabulation | « Aller au contenu » visible, mène à `main` | N/A |
| Thème | bascule clair/sombre | thème appliqué, barre lisible dans les deux | N/A |

</frozen-after-approval>

## Code Map

- `app/protected/` -- layout et page provisoires, à remplacer par `app/(app)/` (`layout.tsx`, `aujourd-hui/page.tsx`)
- `components/login-form.tsx`, `components/update-password-form.tsx` -- `router.push("/protected")` à changer en `/aujourd-hui`
- `app/auth/confirm/route.ts` -- `next` par défaut `/` : sans changement ; `/auth/update-password` reste la cible
- `components/auth-button.tsx`, `components/logout-button.tsx` -- à réutiliser dans le pied de la barre (e-mail, « Se déconnecter »)
- `components/theme-switcher.tsx` -- à réutiliser dans le pied de la barre
- `lib/supabase/proxy.ts` -- protège déjà tout sauf `/` et `/auth` ; ne pas modifier
- `app/globals.css`, `tailwind.config.ts` -- variables shadcn neutres ; ne pas modifier (palette de marque reportée)
- `components/ui/` -- `button`, `card`, `dropdown-menu` disponibles ; pas de `Sheet`, `Tooltip` (utiliser l'attribut `title` + `aria-label`)

## Tasks & Acceptance

**Execution:**
- [x] `lib/nav.ts` -- liste des 9 entrées (libellé, chemin, icône lucide, disponible oui/non) et `isCurrent(pathname, href)` -- source unique
- [x] `lib/nav.test.ts` -- `isCurrent` et nombre d'entrées -- `npm test`
- [x] `components/app-sidebar.tsx` -- barre fixe, repli, cookie, marqueur de page courante, pied (e-mail, déconnexion, thème) -- AC 1 et 2 ; entrées indisponibles inactives avec « bientôt »
- [x] `app/(app)/layout.tsx` -- lien d'évitement, barre, `main#main`, revérification du jeton sous `Suspense` -- AC 3 et 4
- [x] `app/(app)/aujourd-hui/page.tsx` -- `h1` « Aujourd'hui », message de page vide, `metadata.title` -- AC 1
- [x] `app/protected/` -- suppression ; `login-form.tsx`, `update-password-form.tsx` -- redirection vers `/aujourd-hui`
- [x] `docs/journal.md` -- entrée de la story

**Acceptance Criteria:**
- Given que je suis connecté, when j'ouvre `/aujourd-hui`, then je vois la barre latérale avec ses 9 entrées et la page « Aujourd'hui » avec un message de page vide.
- Given la barre, when je la replie, then elle passe en icônes, la page courante reste marquée par une barre et du gras, et l'état survit au rechargement.
- Given le clavier, when j'appuie sur Tab, then « Aller au contenu » apparaît en premier ; la page n'a qu'un seul `h1`.
- Given que je ne suis pas connecté, when j'ouvre `/aujourd-hui`, then je suis renvoyé vers `/auth/login`.

## Implementation Notes

- Implémenté directement (pas de sous-agent : non demandé). `lib/nav.ts` est la source unique des 9 entrées (sans icônes, pour rester testable avec `node --test`) ; `components/app-sidebar.tsx` associe les icônes lucide.
- Repli : cookie `sidebar` lu côté serveur dans `app/(app)/layout.tsx` (pas de flash au chargement) et écrit par le bouton. Sous 768 px la barre reste en icônes (classes `sr-only md:not-sr-only`, texte conservé pour les lecteurs d'écran).
- `/protected` supprimé ; `components/auth-button.tsx` supprimé (plus utilisé : l'e-mail et la déconnexion sont dans le pied de la barre). `LogoutButton` accepte `compact`. Ajout d'un `aria-label` « Changer de thème » sur le bouton de thème (il n'avait pas de nom accessible). `npm test` couvre maintenant `lib/**/*.test.ts` (8 tests).
- Vérifié : lint, `tsc`, build, `npm test` 8/8 ; en local sans session, `/aujourd-hui`, `/protected` et `/notes` renvoient 307 vers `/auth/login`.
- Non vérifié (demande une session) : rendu de la barre, repli et cookie, lien d'évitement, bascule du thème. À contrôler sur la preview.

## Spec Change Log

## Review Triage Log

| Finding | Verdict | Route | Evidence |
|---|---|---|---|
| Erreur de déconnexion rognée dans la barre repliée (56 px) | medium | patch | Message en `sr-only` quand la barre est compacte ; bouton en rouge et `title` portent l'erreur. |
| Rien ne garantit que chaque entrée active a sa page ni que la destination après connexion existe | medium | patch | Constante `HOME_PATH` utilisée par les deux formulaires ; test qui vérifie la présence de `page.tsx` (9 tests). |
| Bloc latéral sans repère (`div`) | low | patch | Remplacé par `<aside aria-label="Barre latérale">` ; libellé du bouton de repli précisé. |
| Références `/protected` restantes | low | patch | `docs/supabase-auth-setup.md` mis à jour. |
| Une page sous `(app)` pourrait s'exécuter avant la redirection du layout | maybe-false | defer | Chaque future page doit s'appuyer sur la RLS et sa propre vérification ; à rappeler en story 2.1. |
| Entrées « bientôt » non focalisables, `aria-disabled` sur un `span` | low | false | Décision du propriétaire (inactives) ; le texte « (bientôt) » est lu dans la liste ; les rendre focalisables ajouterait des arrêts sans action. |
| Bouton de repli masqué sous 768 px, libellé fixe, cookie sans `Secure`, marque non cliquable, pas de repli visuel de chargement, e-mail absent, taille de cible | low | false | Barre toujours en icônes sous 768 px, donc rien à replier ; préférence d'interface sans donnée sensible ; reste cosmétique ou à contrôler sur la preview. |
| Gras invisible barre repliée | low | false | La barre de 3 px est l'indicateur non coloré ; le gras ne s'applique qu'au texte. |
| Redirection du layout sous `Suspense` livrée côté client | low | false | Le proxy renvoie déjà un 307 avant ; le layout est une seconde vérification. |

## Design Notes

Message de page vide (décision de rédaction, tutoiement) : « Rien à faire pour aujourd'hui. Tes tâches apparaîtront ici dès que tu auras saisi tes échéances, tes factures et tes devis. » Pas de « Bravo » : il est réservé à une journée de tâches terminées (EXPERIENCE.md, Voice and Tone).

Étroit : en dessous de 768 px la barre reste en icônes (pas de `Sheet`) ; le panneau de téléphone est reporté.

## Verification

**Commands:**
- `npm run lint && npx tsc --noEmit && npm run build && npm test` -- expected: succès

**Manual checks (if no CLI):**
- Sur la preview : connexion, arrivée sur `/aujourd-hui`, repli et rechargement, Tab depuis le haut de page, bascule du thème, déconnexion puis `/aujourd-hui` renvoie à la connexion ; `/protected` renvoie 404.
