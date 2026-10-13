---
title: 'Story 1.4 : Appliquer le thème LogMerry'
type: 'feature'
created: '2026-10-13'
status: 'in-review'
baseline_commit: 'fdc3365a77956d1d9b315e541f87458e7e0a3ba5'
route: 'oneshot'
review_loop_iteration: 0
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** la conception visuelle (`DESIGN.md`, statut final) n'est appliquée nulle part : l'application tourne sur les gris et la police Geist du gabarit, et aucune story du plan ne portait l'exigence UX-DR2 ; tout écran construit ensuite le serait sur de mauvais jetons.

**Approach:** remplacer les variables de couleur de `app/globals.css` par les jetons de `DESIGN.md` en clair et en sombre (fond Chalk ou Forest, texte, carte Dawn, primaire Kyuri ou Sneezeweeds, accent, bordure, anneau de focus, erreur, plus les jetons `success`, `warning` et `marker` et les cinq dégradés), exposer les nouveaux jetons à Tailwind, passer la police à **Plus Jakarta Sans**, arrondir les pastilles (`rounded.full`), doubler d'une icône chaque état d'indexation (règle « icône + texte »), donner au panneau de l'assistant le fond `popover`, et ajouter à la page de connexion le panneau décoratif en dégradé (scène B : dégradé 3 en clair, dégradé 4 en sombre, `aria-hidden`, sans texte). Un test automatique lit les valeurs de `globals.css` et vérifie les contrastes des couples de jetons utilisés (texte 4,5:1 au moins, non-texte 3:1) dans les deux thèmes. Les valeurs sont celles de `DESIGN.md` converties en HSL (une décimale) pour garder les modificateurs d'opacité de Tailwind ; l'arrondi est couvert par le test. Hors périmètre : scènes A (portfolio) et C (bandeau du Cockpit), qui viennent avec leurs pages ; composants propres à LogMerry non encore construits (`task-row`, jauge, etc.).

</frozen-after-approval>

## Implementation Notes

Fichiers : `app/globals.css` (jetons clair et sombre convertis en HSL, valeur d'origine en commentaire ; jetons `success`, `warning`, `warning-icon`, `marker` ; cinq dégradés ; `--gradient-login`), `tailwind.config.ts` (couleurs d'état et dégradé de connexion), `app/layout.tsx` (Plus Jakarta Sans), `components/ui/badge.tsx` (pastilles arrondies, variantes `success` et `warning`), `components/index-status.tsx` (icône et couleur d'état : indexée = succès, en attente = avertissement, échec = erreur), `components/assistant-panel.tsx` (fond `popover`), `app/auth/login/page.tsx` (panneau décoratif en dégradé, `aria-hidden`, visible dès 1 024 px), `lib/theme.test.ts` (conformité à `DESIGN.md`, contrastes, couleurs en dur). Vérifié avec Chrome piloté (connexion avec le compte fictif A, captures clair et sombre de la connexion, de la liste des notes avec des pastilles dans chaque état et du panneau de l'assistant) ; fond calculé du panneau : Dawn en clair, `#2E4310` en sombre, comme les cartes. Hors périmètre, avec leurs pages : scènes A (portfolio) et C (bandeau du Cockpit), composants propres (`task-row`, jauge…). Les dégradés 1, 2, 4 et 5 existent comme variables mais ne sont pas encore utilisés ; le contraste du texte sur dégradé sera à tester quand ils le seront.

