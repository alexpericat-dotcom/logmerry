---
title: 'Story 8.9 : Citations vérifiées et sources cliquables'
type: 'feature'
created: '2026-10-13'
status: 'in-review'
baseline_commit: '795b1202d9fa7513537b6980933daf3265ae027e'
route: 'oneshot'
review_loop_iteration: 0
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** l'assistant répond mais ne dit pas sur quelles notes il s'appuie ; rien n'empêche une citation inventée ni un chiffre qui ne figure dans aucune note.

**Approach:** la route vérifie la réponse de Claude avant de l'envoyer : toute citation dont l'identifiant n'a pas été envoyé au modèle, ou tout nombre de 10 ou plus (ou décimal) qui ne figure ni dans les extraits envoyés ni dans la question, fait **rejeter la réponse** (jamais affichée ; le panneau montre l'erreur et « Réessayer »). Les sources valides sont les extraits envoyés et cités, avec leur texte **relu en base** (jamais celui écrit par le modèle) ; le panneau les affiche sous la réponse en liste « Sources » numérotée, chacune avec le titre de sa note, « Ouvrir » (lien vers la note) et « Copier le texte » (copie l'extrait relu en base, confirmation « Texte copié. » annoncée). Réponse sans citation (le modèle dit que les notes ne répondent pas) : aucune source. Hors périmètre : repères « [1] » dans le texte, surlignage de l'extrait dans la note (la note s'ouvre simplement), « source supprimée » après suppression (story 8.10), résultats de calcul (story 8.12 : seul le contrôle des nombres est fait ici).

</frozen-after-approval>

## Implementation Notes

Fichiers : `lib/domain/citations.ts` (`verifyCitations`, `inventedNumbers`, `AnswerRejected`) et son test, `lib/domain/chat-flow.ts` (la route y vérifie la réponse avant de la rendre, sources = extraits cités lus en base), `components/assistant-sources.tsx` (liste « Sources », « Ouvrir », « Copier le texte », « Voir l'extrait »), `assistant-panel.tsx` et `assistant-provider.tsx` (affichage, « Réponse prête, N sources. »), consigne « texte simple, sans Markdown » dans `lib/domain/prompt.ts`. Pas de migration. Vérifié avec le vrai Mistral et le vrai Claude : réponses normales acceptées avec la bonne source (étapes de relance, quittances, tarif du client Alpha) ; questions sans réponse dans les notes (coût d'une relance, TVA) : réponse sans source ni conseil ; hors sujet : message fixe. Limites connues : le contrôle des nombres est une heuristique (nombres de 10 ou plus et décimaux, comparés à tous les extraits envoyés et à la question, pas aux seuls extraits cités : un test réel a montré qu'une réponse « mes notes ne répondent pas » reprend légitimement des chiffres qu'elle ne cite pas) ; rien ne vérifie qu'une affirmation sans chiffre est vraiment appuyée par l'extrait cité ; « Ouvrir » ouvre la note sans surligner l'extrait.

