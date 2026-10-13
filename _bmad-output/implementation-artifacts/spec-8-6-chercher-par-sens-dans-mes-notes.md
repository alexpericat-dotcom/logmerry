---
title: 'Story 8.6 : Chercher par sens dans mes notes'
type: 'feature'
created: '2026-10-13'
status: 'done'
baseline_commit: '7e83f07c63ecb62be63b93a559b6818f62af9ddd'
route: 'oneshot'
review_loop_iteration: 0
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** je ne peux pas vérifier ce que l'assistant retrouvera dans mes notes avant de lui parler ; la seule recherche est par mots-clés.

**Approach:** un bloc « Chercher par sens » en haut de la page Notes : je tape une question (300 caractères au plus), une Server Action la vectorise avec Mistral, appelle `match_chunks` (seuil 0,76, provisoire, mesuré sur textes fictifs ; 8 extraits au plus) et affiche chaque extrait retrouvé avec le titre de sa note (lien vers la note) et son score au format « 0,79 », du plus proche au moins proche. Aucun extrait au-dessus du seuil : « Aucun passage trouvé. ». Échec de l'IA ou de la base : « Recherche impossible pour le moment. Réessaie. ». Question vide : aucun appel. Sans session : redirection vers `/auth/login`. La recherche par mots-clés ⌘K reste inchangée. Aucune migration ; seules mes notes sont concernées (RLS et filtre de la fonction). La question part chez Mistral : même mise en garde RGPD que pour l'indexation.

</frozen-after-approval>

## Implementation Notes

Fichiers : `app/(app)/notes/sense-actions.ts` (`searchBySense`), `components/sense-search.tsx`, bloc ajouté en haut de `app/(app)/notes/page.tsx`, `lib/domain/matching.ts` (seuil 0,76, 8 extraits, 300 caractères, `formatScore`), `normalizeQuery` à longueur réglable. Pas de migration. Vérifié avec le vrai Mistral et le compte fictif A (4 notes réalistes) : les 4 questions pertinentes ont leur bonne note en tête (0,78 à 0,83), les 3 questions sans rapport n'atteignent pas 0,76 (0,72 à 0,74), B ne reçoit rien. Marge entre pertinent et sans rapport : 0,02 à 0,04 : le seuil est à régler sur le jeu de test (story 8.14). Non couvert par un test automatique : l'action elle-même (session, enchaînement) ; l'essai sur la preview la couvre.

## Review Triage Log

| Constat | Verdict | Route | Preuve / décision |
|---|---|---|---|
| Le champ se vide après chaque recherche (React 19 réinitialise le formulaire) | medium | patch | la question est renvoyée dans l'état et sert de valeur du champ |
| Question vide : aucun retour | low | patch | champ obligatoire |
| Résultats non annoncés aux lecteurs d'écran | low | patch | « N passages trouvés. » dans la zone annoncée |
| Journal de l'échec sans code d'erreur | low | patch | code de l'erreur de la base ajouté (sans contenu) |
| « Aucun passage trouvé » ne dit pas que seules les notes indexées sont cherchées | low | patch | phrase ajoutée au texte d'introduction ; message gardé tel que demandé |
| Journal de la story manquant | low | patch | entrée ajoutée |
| Dimension du vecteur de la question non vérifiée | false | rejeté | `embedTexts` valide déjà les 1 024 valeurs (`parseEmbeddings`) et lève sinon |
| Pas de limite de débit sur l'appel payant | low | rejeté | un seul propriétaire ; limitation de débit déjà reportée à la V2 dans l'architecture |
| Titre « Note sans titre » si la note a disparu | low | rejeté | les extraits partent en cascade avec la note ; cas de course négligeable |
| Plusieurs extraits d'une même note en cartes séparées | low | rejeté | les critères demandent les extraits retrouvés ; regrouper ajouterait de la logique |
| Pas de test de l'action ni de la recherche des titres | low | rejeté | l'isolation de `notes` et de `match_chunks` est prouvée ; essai de bout en bout avec le vrai Mistral |

