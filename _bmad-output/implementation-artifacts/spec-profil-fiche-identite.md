---
title: 'Profil en fiche d''identité'
type: 'feature'
created: '2026-10-28'
status: 'done'
baseline_commit: '9722b0883c46e59e2f8e5b802778a5c34141130c'
route: 'oneshot'
review_loop_iteration: 0
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** `/profil` empile 13 formulaires (menu, boutons « Enregistrer » et « Confirmer » par champ) : l'écran est lourd et ne dit pas d'un coup d'œil où en est la situation.

**Approach:** une fiche en lecture (ligne « étiquette → valeur » avec pastille d'état Confirmé / Déclaré / À confirmer et résumé « N champs à confirmer ») ; un crayon par ligne la fait passer en formulaire, de retour en lecture après l'enregistrement ; « Confirmer » reste un bouton de la ligne « Déclaré ». Les trois textes libres et les seuils d'alerte sont repliés sous « Plus de champs ». Aucune migration, `saveProfile` inchangé.

</frozen-after-approval>

## Implementation Notes

- Fiche : `components/profile-field.tsx` (ligne lecture / formulaire, crayon, « Confirmer » conservé), `app/(app)/profil/page.tsx` (grille à deux colonnes, résumé, « Plus de champs » en `<details>` natif). `displayValue` est dans `lib/domain/profile.ts` (testé). `saveProfile` et la base n'ont pas changé.
- Le résultat de l'enregistrement est gardé localement : il s'efface à l'ouverture et à « Annuler ».
- Non fait : parcours dans Chrome (à faire par Alex).

## Review Triage Log

Passe unique (Blind Hunter).

| # | Constat | Verdict | Preuve / route |
|---|---------|---------|----------------|
| 1 | Deuxième enregistrement identique : le formulaire ne se referme pas (message identique) | medium | patch : fermeture depuis l'action, plus depuis le texte du message |
| 2 | Erreur ou « enregistré » périmé après « Annuler » | low | patch : résultat local effacé à l'ouverture et à l'annulation |
| 3 | « Tout est renseigné » faux avec des champs « Déclaré » | medium | patch : résumé séparant « à confirmer » et « déclarés » |
| 4 | « Confirmer » affiché pour « Autre » sans texte | low | patch : seulement si une valeur s'affiche ; `displayValue` rend `null` |
| 5 | Boutons « Confirmer » sans nom de champ | medium | patch : `aria-label` |
| 6 | Texte libre long ou à retours à la ligne | low | patch : `whitespace-pre-wrap break-words` |
| 7 | Une région `status` par ligne | low | rejeté : région vide masquée ; la regrouper changerait les annonces |
| 8 | Bordures de grille, `group` inutilisé, saut de mise en page à l'ouverture | low | `group` retiré ; le reste rejeté (cosmétique, à juger dans Chrome) |
| 9 | Pas de test de `displayValue` ; journal ; spec non suivie | low | patch (test, journal, spec) |
