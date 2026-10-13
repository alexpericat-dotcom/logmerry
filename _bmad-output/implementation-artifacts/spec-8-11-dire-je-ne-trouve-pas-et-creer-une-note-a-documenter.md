---
title: 'Story 8.11 : Dire « je ne trouve pas » et créer une note à documenter'
type: 'feature'
created: '2026-10-13'
status: 'in-review'
baseline_commit: '3dec5762cb3dd231e8cd12f3d406b95d1b995018'
route: 'oneshot'
review_loop_iteration: 0
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** quand l'assistant ne trouve rien, le message est improvisé et il n'y a aucun moyen de garder la trace du sujet à documenter.

**Approach:** sans extrait assez proche, l'assistant répond le message exact de la conception « Je n'ai trouvé aucune procédure documentée correspondant à cette requête. » **sans appeler le modèle** (déjà le cas, seul le texte change) ; sous ce message, un bouton « Créer une note à documenter plus tard » crée, par une Server Action (session vérifiée), une note **brouillon** vide titrée « À documenter : {question} » (200 caractères au plus), de type « Note », sans texte donc sans extrait (elle ne peut être citée ni n'appelle l'IA ; son état est « indexée » comme toute note sans texte). Le panneau confirme « Note à documenter créée » avec un lien « Ouvrir la note » et la conversation reste ouverte ; le bouton disparaît pour ce message. La liste des notes gagne un filtre « Brouillons » (`?statut=brouillon`) où la retrouver ; l'écran « À faire » et le comptage du Cockpit viennent plus tard (stories 5.6 et 5.3). Le bouton s'affiche aussi sous un refus relu dans l'historique (reconnu au texte du message ; la question est le message précédent).

</frozen-after-approval>

## Implementation Notes

**Extension décidée après l'essai du propriétaire sur la preview :** le bouton « Créer une note à documenter plus tard » est aussi proposé sous toute réponse de l'assistant **sans source** (par exemple « Tes notes ne décrivent aucune procédure… » rédigé par Claude quand des extraits proches mais non pertinents lui ont été envoyés), pas seulement sous le message fixe (`offersDraftNote`, testé). La consigne impose « citations » vide quand les extraits ne répondent pas, donc « sans source » signifie « les notes ne répondent pas ».

Fichiers : `lib/domain/chat-flow.ts` (message exact de la conception, `isRefusal`), `lib/domain/notes.ts` (`draftTitle`, `parseStatusFilter`), `lib/db/notes.ts` (`listNotes` filtré par statut), `app/(app)/notes/actions.ts` (`createDraftFromQuestion`), `app/(app)/notes/page.tsx` (filtre « Brouillons »), `components/assistant-draft-button.tsx`, `components/assistant-panel.tsx`. Pas de migration. Changement visible : le message de refus est maintenant celui de la conception, « Je n'ai trouvé aucune procédure documentée correspondant à cette requête. » (avant : « …aucune note correspondant à cette question. »). Vérifié avec les vrais services : refus sans appel à Claude, brouillon créé (statut brouillon, aucun extrait), présent dans le filtre, jamais cité, retrouvé par ⌘K, invisible pour B.

