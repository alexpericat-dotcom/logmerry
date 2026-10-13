---
title: 'Story 8.4 : Indexer mes notes existantes'
type: 'feature'
created: '2026-10-13'
status: 'done'
baseline_commit: 'd3622bd4ede2e788d9ada16d45f737f907ef3291'
route: 'oneshot'
review_loop_iteration: 0
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** les notes écrites avant l'IA restent « en attente » ; l'assistant ne peut pas les retrouver et il n'existe aucun moyen de les indexer sans les rouvrir une à une.

**Approach:** la page Paramètres (première version, activée dans la barre ; les paramètres de la story 4.1 s'y ajouteront) affiche l'état d'indexation de mes notes et un bouton « Indexer mes notes ». Il indexe, avec la même fonction qu'à l'enregistrement, mes notes qui ne sont pas encore « indexées » (en attente ou en échec), 25 au plus par clic pour rester sous la limite de durée, puis affiche un compteur (indexées, en échec, restantes). Relancer ne touche pas aux notes déjà indexées et remplace toujours les extraits (aucun doublon). Une note sans texte passe à « indexée » sans appel IA ; une note avec texte est indexée quel que soit son statut brouillon ou actif. Seules mes notes sont lues (RLS).

</frozen-after-approval>

## Implementation Notes

Fichiers : `app/(app)/parametres/` (page et action `indexAllNotes`), `components/index-all-notes.tsx`, `lib/domain/index-batch.ts` (tri pur, 25 par clic), `countIndexStatuses` dans `lib/db/notes.ts`, entrée « Paramètres » activée dans `lib/nav.ts`. Pas de migration. Vérifié avec le vrai Mistral et le compte fictif A (script jetable) : un premier clic indexe 3 notes (texte, brouillon avec texte, vide sans appel IA), un second ne fait rien, la note de B n'est pas touchée. Non couvert par un test automatique : l'action elle-même (session, enchaînement) ; l'essai sur la preview la couvre.

## Review Triage Log

| Constat | Verdict | Route | Preuve / décision |
|---|---|---|---|
| Notes « en échec » prises avant les « en attente » : un échec persistant bloque la file | medium | patch | tri par état (« en attente » d'abord, ordre de l'enum) puis par date |
| Erreurs avalées sans journal serveur | medium | patch | journal de la nature de l'échec (sans contenu ni clé) |
| « 0 indexée, 0 en échec » quand tout est déjà indexé | low | patch | message « Toutes tes notes sont déjà indexées. » |
| Charge tous les textes à indexer pour n'en garder que 25 | low | rejeté | quelques dizaines de notes au MVP ; note `ponytail:` dans le code |
| Durée : 25 notes à la suite | low | rejeté | environ une seconde par note, limite de 300 s ; une coupure laisse « en attente » ou « en échec », relançable |
| Clics simultanés ou note en cours d'indexation à l'enregistrement | low | rejeté | un seul propriétaire ; la contrainte unique protège les extraits ; limite déjà acceptée en 8.3 |
| `countIndexStatuses` lit toutes les lignes pour compter | low | rejeté | volume faible ; l'état est un enum |
| Pas de confirmation avant l'envoi à un tiers | low | rejeté | avertissement affiché sur la page ; mention RGPD = point ouvert du CLAUDE.md |
| Tests de l'action, de l'isolation de la page | low | rejeté | l'isolation de `notes` est déjà prouvée (même requête sous RLS) ; essai sur la preview |
| Entrée de journal manquante | low | patch | ajoutée dans `docs/journal.md` |

