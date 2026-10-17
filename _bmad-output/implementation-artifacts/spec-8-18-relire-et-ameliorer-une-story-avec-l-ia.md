---
title: 'Story 8.18 : Relire et améliorer une story avec l''IA'
type: 'feature'
created: '2026-10-17'
status: 'review'
baseline_commit: 'e5f3550'
route: 'dispatch'
context:
  - '{project-root}/_bmad-output/implementation-artifacts/spec-8-16-generer-un-backlog-avec-l-ia.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-8-17-decouper-une-story-en-taches-avec-l-ia.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-8-17b-taches-avec-les-stories-proposees.md'
  - '{project-root}/docs/ui-rules.md'
---

## Intent

**Problem:** une user story écrite vite est souvent floue (« Gérer les trucs »), sans critères d'acceptation, sans bénéfice, ou trop grosse pour tenir dans un sprint. Je ne le vois pas toujours moi-même, et une mauvaise story donne de mauvaises tâches (8.17) et un mauvais prompt (8.21).

**Approach:** dans une story dépliée, un bouton **« Relire avec l'IA »** (à côté de « Proposer des tâches avec l'IA »). Claude relit la story et renvoie des **remarques** (ce qui ne va pas : trop grosse, floue, critères manquants, bénéfice ou rôle absent, autre) et une **version améliorée** de la story. Je vois, champ par champ, l'actuel et le proposé ; **je coche ce que j'applique**, ou j'ignore tout. **Rien n'est enregistré avant « Appliquer ».** Le statut de la story n'est jamais touché.

## Boundaries & Constraints

**Always:**
- Appel à Claude **côté serveur seulement**, un seul appel par relecture, même modèle, même clé, même délai de 60 s, même mention de confidentialité que les 8.16 et 8.17 (via `lib/ai/claude-tool.ts`, outil `review_story` à sortie structurée). Une erreur n'expose ni contenu ni clé : « Relecture impossible pour le moment. Réessaie. »
- **Ce que l'IA reçoit, et rien d'autre :** la story (titre, rôle, bénéfice, critères, points), le titre de la mission et le nom du client, les **titres** des autres stories de la mission (cohérence et doublons), la **note d'origine** de la story si elle existe (même règle que la 8.17 : à moi, active, de la fiche du client de la mission), ma précision facultative (1 000 caractères au plus). Jamais les autres notes. Tout est de la **donnée, pas une consigne** (échappé dans des balises) ; aucun conseil fiscal ou juridique.
- Sortie structurée : 0 à 5 **remarques** (un type parmi `trop_grosse`, `floue`, `criteres_manquants`, `benefice_absent`, `role_absent`, `autre`, et une phrase de 200 caractères au plus) et une **version proposée** (titre, rôle, bénéfice, critères d'acceptation ; points seulement si la story n'en a pas).
- **Vérification avant affichage :** la version proposée passe par `validateStoryInput` (mêmes règles et mêmes plafonds qu'une saisie à la main) ; un champ invalide est écarté (l'actuel est gardé) ; un **nombre de 10 ou plus (ou décimal) absent des sources** (la story, la précision, le titre de la mission, la note, les titres du backlog) fait écarter le champ concerné et le dit ; un type de remarque inconnu devient « autre » ; des points hors suite Fibonacci sont ignorés. Si rien ne diffère de l'actuel et qu'il n'y a pas de remarque : « L'IA ne voit rien à améliorer dans cette story. »
- **Présentation :** les remarques d'abord (liste), puis, pour chaque champ qui **diffère**, l'actuel et le proposé côte à côte (l'un sous l'autre sur téléphone) avec une case « Appliquer » **cochée par défaut** ; un champ identique n'est pas montré. « Appliquer la sélection » enregistre les champs cochés ; « Ignorer » ferme sans rien enregistrer.
- **Appliquer** passe par une Server Action `applyStoryReview(storyId, base, choix)` : elle relit la story sous la session et **refuse si un champ coché a changé depuis la relecture** (comparaison avec les valeurs `base` envoyées : « Cette story a changé entre-temps. Relance la relecture. »), n'écrit que les champs choisis, valide l'ensemble avec `validateStoryInput`, ne touche ni au statut, ni aux points sauf s'ils sont cochés, ni à la position, ni au sprint, ni aux tâches. La RLS s'applique comme pour toute modification.
- « **Trop grosse** » est une remarque seulement : l'IA peut y nommer des pistes de découpage, mais **ne crée aucune story** (le découpage en nouvelles stories se fait à la main ou avec « Proposer des user stories »).
- Interface : thèmes clair et sombre, 44 px sur téléphone, tutoiement, état de chargement annoncé (`role="status"`), annulation possible pendant l'attente (le résultat tardif est jeté), erreurs en ligne, focus au titre du panneau puis rendu à « Relire avec l'IA » à la fermeture, issue annoncée (« Story mise à jour : titre, critères »).
- Tests : règles pures (consigne, message, lecture et vérification, différences champ par champ, fusion et refus si changé) ; **essais réels** avec données fictives notés dans `docs/ia-backlog-tests.md`, en **mesurant la sortie brute du modèle avant tout filtre** ; vérification dans Chrome.

**Never:** enregistrement automatique ; changement du statut, de la position, du sprint ou des tâches ; création de stories (découpage automatique) ; historique des relectures ; migration ; nouvelle dépendance ; envoi d'une note autre que la note d'origine ; relecture de plusieurs stories à la fois (la composition d'un sprint est la 8.19, l'ordre du backlog la 8.20).

## I/O & Edge-Case Matrix

| Scénario | Entrée / État | Comportement attendu | Erreur |
|----------|--------------|---------------------|--------|
| Story floue | titre « Gérer les trucs », rien d'autre | remarques (floue, critères manquants, bénéfice absent) et version proposée plus précise | N/A |
| Story déjà bonne | titre, rôle, bénéfice, critères clairs | peu ou pas de remarque ; champs identiques non montrés ; « Rien à améliorer » si tout est identique | N/A |
| Story trop grosse | 12 critères sur plusieurs sujets | remarque « trop grosse » avec pistes de découpage ; aucune story créée | N/A |
| Appliquer la sélection | champs cochés | seuls ces champs sont enregistrés, la ligne se met à jour, annonce | échec : message, rien changé |
| Décocher un champ | case décochée | ce champ reste tel quel | tout décoché : « Appliquer » désactivé |
| Ignorer / fermer / Échap | croix, « Ignorer » | rien d'enregistré, résultat oublié | N/A |
| Story modifiée entre-temps | autre onglet change un champ coché | « Cette story a changé entre-temps. Relance la relecture. », rien d'écrit | message visible, écran rechargé |
| Story supprimée entre-temps | relecture puis « Appliquer » | « Cette user story n'existe plus. », écran rechargé | message visible |
| Nombre inventé | le modèle écrit « 50 inscrits » absent des sources | ce champ est écarté et signalé ; les autres restent | N/A |
| Version invalide | titre de plus de 200 caractères | ce champ est écarté, l'actuel est gardé | N/A |
| Précision | « pense à la mobilité » | prise en compte dans les remarques et la version | précision de plus de 1 000 caractères : refusée |
| Consigne cachée | critères ou précision contenant « ignore tes consignes… » | non suivie (donnée échappée) | N/A |
| Réponse inexploitable | format invalide, coupée, refus | « Relecture impossible pour le moment. Réessaie. » | journal sans contenu |
| Attente trop longue | plus de 60 s | message générique, je peux relancer ou annuler | N/A |
| Sans session | action appelée sans connexion | redirection vers `/auth/login` | N/A |
| Story d'un autre compte | identifiant forgé | « Cette user story n'existe plus. » (RLS) | N/A |
| Sprint clos | story dans un sprint clos | relecture possible (lecture seule) ; « Appliquer » modifie le texte, pas le sprint (le texte d'une story d'un sprint clos reste modifiable, comme le statut) | N/A |

## Code Map

- `lib/domain/story-review.ts` (+ test) -- consigne fixe, message échappé, lecture de la réponse (réutilise `toolInputs` et `parseToolCall` de `story-proposals`), vérification (remarques, version proposée, nombres inventés), `changedFields(actuel, proposé)`, `mergeReview(base, actuel, choix)` avec refus si un champ coché a changé
- `lib/ai/story-review.ts` -- appel à l'API Messages, outil `review_story`
- `app/(app)/missions/story-review-actions.ts` -- `reviewStory(storyId, hint)` (n'écrit rien) et `applyStoryReview(storyId, base, choix)`
- `components/story-review.tsx` -- bouton et panneau (précision, chargement, remarques, comparaison, cases, appliquer, ignorer), monté dans `components/story-list.tsx` (story dépliée)
- réutilisés : `lib/db/proposal-notes.ts` (`notesForProposal`), `lib/domain/user-stories.ts` (`validateStoryInput`), `lib/domain/tasks.ts` (`validateHint`)
- `tests/proposals-run.ts`, `docs/ia-backlog-tests.md`, `docs/journal.md`, `sprint-status.yaml`, `tests/isolation.test.ts` (pas de nouvelle table : aucun ajout attendu)

## Tasks & Acceptance

- [x] Règles pures + tests (`lib/domain/story-review.ts`)
- [x] Appel à Claude (outil `review_story`) et `reviewStory` (aucune écriture)
- [x] `applyStoryReview` (champs choisis, refus si changé, validation)
- [x] Panneau : précision, remarques, comparaison champ par champ, cases, appliquer, ignorer, annonces, focus
- [x] Essais réels (4 scénarios fictifs, sortie brute mesurée), vérification dans Chrome (clair, sombre, téléphone), journal, relecture indépendante

**Acceptance Criteria:**
- Given une story floue, when je demande une relecture, then je vois des remarques (floue, critères manquants, bénéfice absent…) et une version proposée, et **rien** n'est enregistré tant que je n'applique pas.
- Given une version proposée, when je décoche un champ puis j'applique, then seuls les champs cochés sont enregistrés et le statut, la position, le sprint et les tâches ne changent pas.
- Given une story modifiée dans un autre onglet sur un champ coché, when j'applique, then c'est refusé avec « Cette story a changé entre-temps » et rien n'est écrit.
- Given une version qui contient un nombre de 10 ou plus absent des sources, then le champ concerné est écarté et signalé.
- Given une story trop grosse, then une remarque le dit avec des pistes, et aucune story n'est créée.
- Given une consigne cachée dans la story ou la précision, then elle n'est pas suivie (essai réel mesuré sur la sortie brute).

## Décisions à valider

1. **Où :** bouton « Relire avec l'IA » dans la story dépliée, à côté de « Proposer des tâches avec l'IA » ; une story à la fois.
2. **Résultat :** 0 à 5 remarques à types fixes (trop grosse, floue, critères manquants, bénéfice absent, rôle absent, autre) **et** une version proposée, présentée champ par champ avec une case « Appliquer » cochée par défaut pour chaque champ qui diffère. Plus fin qu'un « tout ou rien » : tu gardes ton titre et prends seulement les critères, par exemple.
3. **« Trop grosse » = remarque, pas de découpage automatique.** Le découpage crée de nouvelles stories : hors périmètre, et l'IA te donne seulement des pistes.
4. **Sources :** la story, la mission, le client, les titres des autres stories, la note d'origine si elle existe, ta précision ; jamais les autres notes.
5. **Garde contre un changement entre-temps :** « Appliquer » compare les champs cochés à ce que tu as relu, sans migration (pas de colonne de version).
6. **Statut jamais touché ; points suggérés seulement si la story n'en a pas** (sinon une remarque, jamais un changement automatique).
7. **Pas de migration, pas de nouvelle dépendance.** Coût : un appel court par relecture (sortie au plus 1 500 jetons) ; pas de plafond de générations (point déjà dans `deferred-work`).

## Implementation Notes

- Décisions validées par Alex le 17 octobre (« go »). Aucune migration, aucune dépendance, aucun ajout au test d'isolation (pas de nouvelle table : la modification d'une story passe par la RLS existante).
- Écarts au Code Map : `FIELD_NAMES` (noms courts pour l'annonce) en plus de `FIELD_LABELS` ; `applyStoryReview` conditionne l'écriture elle-même à la valeur lue (`.eq` sur chaque champ choisi) en plus de la comparaison avec `base`, pour qu'une modification arrivée entre la lecture et l'écriture soit refusée ; la région vocale est hors du panneau (même place dans l'état ouvert et fermé) pour que « Story mise à jour : titre, critères » soit annoncé après la fermeture.
- **Défaut trouvé à l'essai dans Chrome :** pour une story presque vide (« Backlog 1 »), le modèle remplaçait chaque champ par une consigne sur la story elle-même (« Le titre décrit à l'infinitif ce que l'utilisateur veut faire »). Corrigé dans la consigne : sans information pour améliorer un champ sans inventer, le recopier tel quel et le dire en remarque. Vérifié ensuite dans Chrome (« Backlog 2 » : 4 remarques, 0 champ à relire) et par l'essai réel 20.
- **Défaut de ton trouvé à l'essai :** les remarques vouvoyaient (« Reformulez-le ») ; la consigne demande maintenant le tutoiement. **Non revérifié après coup** (voir plus bas).
- Vérifié dans Chrome (compte fictif, données supprimées ensuite) : relecture d'une story floue (4 remarques, 4 champs proposés), refus d'appliquer quand le titre a changé en base entre-temps (« Cette story a changé entre-temps. Relance la relecture. », rien d'écrit, écran rechargé), application de 3 champs sur 4 (bénéfice décoché resté vide ; statut, position et sprint inchangés en base), annonce, focus rendu au bouton ; téléphone 412 px sombre : aucun débordement, aucune cible sous 44 px.
- **Essais réels (`npm run test:proposals`, scénarios 20 à 24) :** 24 sur 24 au premier passage (consigne d'avant les deux corrections ci-dessus). Au passage suivant, avec la consigne finale, le scénario 20 est réussi (4 remarques, 0 champ inventé) puis **les crédits de l'API Anthropic se sont épuisés** (« credit balance is too low », erreur 400 sur tous les appels) : les scénarios 21 à 24 n'ont **pas été rejoués** avec la consigne finale. À relancer dès que le solde est rechargé.
- Non vérifié dans le navigateur : thème clair.
- Reste : relecture indépendante, puis nouveau passage des essais réels.
