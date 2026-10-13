---
title: 'Story 8.2 : Découper une note en extraits'
type: 'feature'
created: '2026-10-13'
status: 'done'
baseline_commit: '953324f1e4b19d1ac7c6fd3ddca5d9ed3c84efa6'
route: 'oneshot'
review_loop_iteration: 0
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** pour que l'assistant retrouve le bon passage, une note longue doit être découpée en extraits courts avant d'être vectorisée ; rien ne le fait aujourd'hui.

**Approach:** une fonction pure `chunkNote(body)` dans `lib/domain/chunking.ts` produit des extraits d'environ 1 000 caractères avec un chevauchement d'environ 150, coupés de préférence à un saut de paragraphe, de ligne, une fin de phrase ou un espace. Un texte vide ou d'espaces donne zéro extrait, quel que soit le statut de la note. Le titre n'entre pas dans les extraits (la story 8.3 le joindra au texte envoyé pour vectorisation). Fonction sans accès réseau ni base, couverte par des tests (propriétés : taille, chevauchement, couverture, texte sans espace, emoji non coupés).

</frozen-after-approval>

## Implementation Notes

Fichiers : `lib/domain/chunking.ts` (`chunkNote`, constantes `CHUNK_MAX` = 1 000 et `CHUNK_OVERLAP` = 150) et `lib/domain/chunking.test.ts`. Décisions : coupe au plus près de la limite parmi paragraphe, ligne, fin de phrase, espace (jamais sous la moitié de la taille maximale) ; reprise calée sur un début de mot ; texte vide ou d'espaces : aucun extrait, quel que soit le statut ; le titre n'entre pas dans les extraits.

## Review Triage Log

| Constat | Verdict | Route | Preuve / décision |
|---|---|---|---|
| Le commentaire sur les emoji promettait plus que le code | low | patch | commentaire corrigé (paire de substitution : jamais coupée ; suites d'emoji et accents combinés : peuvent l'être) |
| Test d'emoji indirect | low | patch | test direct : aucune moitié de paire de substitution dans un extrait |
| Chevauchement testé seulement par le haut | medium | patch | borne basse ajoutée (au moins 130 caractères sur du texte en mots) |
| Préférence phrase puis espace non testée | low | patch | test ajouté |
| Test chronométré (1 s), fragile | low | patch | assertion de durée retirée, le test vérifie la fin et le nombre d'extraits |
| Détection de phrase naïve (abréviations, titres, code) | low | patch | note `ponytail:` dans le code ; pas de logique en plus |
| Segmentation par graphèmes (`Intl.Segmenter`) | low | rejeté | mêlerait emoji composés et accents à un découpage de 1 000 caractères : sans effet sur la recherche |
| Import `./chunking.ts` peut-être non câblé | false | rejeté | `npm test`, `tsc` et lint passent ; les 35 tests tournent |
| Pas de plafond de taille dans la fonction | low | rejeté | la base limite le texte à 50 000 caractères ; le test de cette taille se termine |

