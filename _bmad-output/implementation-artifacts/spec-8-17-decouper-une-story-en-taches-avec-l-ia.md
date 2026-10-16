---
title: 'Story 8.17 : Découper une story en tâches avec l''IA'
type: 'feature'
created: '2026-10-16'
status: 'draft'
baseline_commit: 'e6f7f2b'
route: 'dispatch'
context:
  - '{project-root}/_bmad-output/implementation-artifacts/spec-8-16-generer-un-backlog-avec-l-ia.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-3-5b-taches-d-une-user-story.md'
  - '{project-root}/docs/ui-rules.md'
---

## Intent

**Problem:** une user story est écrite, mais la découper en tâches concrètes, dans le bon ordre, est un travail de réflexion que je veux pouvoir déléguer (demande d'Alex : « je voudrais que l'IA déduise et organise également les tâches »).

**Approach:** dans une story dépliée, un bouton « Proposer des tâches avec l'IA » ouvre un panneau ; Claude déduit de la story (rôle, bénéfice, critères d'acceptation), de sa note d'origine si elle existe et d'une précision facultative que je saisis, une liste de 1 à 8 tâches **déjà dans un ordre logique de réalisation** ; je les relis (garder, modifier puis garder, rejeter, ou **tout garder d'un coup**) ; rien n'est ajouté sans mon accord, et les tâches gardées se placent à la suite des tâches existantes, dans l'ordre proposé, puis se réordonnent comme les autres.

*Même mécanique que la 8.16 (appel serveur, outil structuré, vérification, proposition éphémère) : le code de contrôle est réutilisé, pas recopié. Les tâches proposées en même temps que les stories du backlog (8.16) viendront dans une étape suivante, 8.17b.*

## Boundaries & Constraints

**Always:**
- Appel à Claude **côté serveur seulement** (même modèle, même clé, `fetch`, délai de 60 s que la 8.16) ; erreur générique « Proposition impossible pour le moment. Réessaie. », jamais de contenu ni de clé.
- **Ce que l'IA reçoit, et rien d'autre :** le titre de la mission et le nom du client ; la story (titre, rôle, bénéfice, critères d'acceptation, points) ; les **titres** des tâches déjà présentes (pour ne pas les redoubler) ; la note d'origine de la story si elle existe, est active et appartient à la fiche du client de la mission (lue sous RLS, 30 000 caractères au plus) ; ma précision facultative (1 000 caractères au plus). Jamais une note d'un autre compte ni d'une autre fiche.
- Tout ce qui est donné au modèle est de la **donnée, pas une consigne** : texte échappé dans des balises ; la consigne fixe interdit d'obéir à une instruction qui s'y trouverait.
- Sortie **structurée** (outil `propose_tasks`) : 1 à 8 titres, **dans l'ordre de réalisation** (ce dont les suivantes dépendent d'abord, le contrôle ou la livraison à la fin). Un titre = une action concrète à l'infinitif, 200 caractères au plus ; rien d'autre (pas de durée, pas de sous-tâche).
- **Vérification avant affichage** : titre vide ou trop long écarté ; doublon d'une tâche existante ou d'une autre proposition écarté (sans accents, casse, espaces ni ponctuation) ; titre qui contient un **nombre absent de la story, de la note, de la précision et des tâches existantes** (10 ou plus, ou décimal) écarté et signalé. Le nombre d'écartées est dit à l'écran.
- **Rien d'enregistré avant « Garder »** : la proposition n'existe qu'à l'écran ; fermer le panneau l'oublie.
- « Garder » et « Tout garder » passent par une action **`addTasks(storyId, titles)`** (même validation de titre, mêmes règles de propriété, dernière place, positions consécutives dans l'ordre proposé) ; une écriture partielle est dite et l'écran recharge l'état réel.
- Aucun conseil fiscal ou juridique (consigne) ; aucun chiffre inventé (vérification).
- **Mention de confidentialité** dans le panneau, identique à la 8.16 : « Le texte de la story, sa note d'origine et ta précision sont envoyés à Anthropic pour générer les propositions. N'y mets pas de données réelles de clients. »
- Interface : thèmes clair et sombre, 44 px sur téléphone, tutoiement, chargement annoncé (`role="status"`), erreurs en ligne, annulation pendant la génération (résultat tardif jeté), focus rendu au bouton à la fermeture, annonces « N tâches ajoutées ».
- Tests : règles pures (consigne, message, lecture de la réponse, vérification, plafonds), isolation (la note d'origine n'est lue que si elle est à moi et de la fiche), `addTasks` (positions, partiel), **5 essais réels** avec données fictives dans `docs/ia-backlog-tests.md`.

**Never:** enregistrement automatique ; historique des générations ; tâches générées avec le backlog (8.17b) ; relecture d'une story (8.18) ; sprint (8.19) ; ordre du backlog (8.20) ; durée, échéance ou sous-tâche ; nouvelle dépendance.

## I/O & Edge-Case Matrix

| Scénario | Entrée / État | Comportement attendu | Erreur |
|----------|--------------|---------------------|--------|
| Génération nominale | story avec critères, précision vide | 3 à 8 tâches ordonnées, affichées sans rien enregistrer | N/A |
| Story presque vide | titre seul, ni rôle ni critères ni précision | génération permise, résultat souvent court ; un message dit « Ajoute une précision pour de meilleures tâches » | N/A |
| Tâches déjà présentes | 4 tâches existantes | aucune proposition ne les redouble ; « 2 proposition(s) écartée(s) (déjà dans la liste) » | N/A |
| Précision trop longue | plus de 1 000 caractères | refusée avant tout appel | erreur en ligne |
| Note d'origine volumineuse | plus de 30 000 caractères | laissée de côté, dit à l'écran ; la génération continue sur le reste | N/A |
| Note d'origine supprimée ou archivée | story gardant un lien mort | ignorée, génération sur la story seule | N/A |
| Chiffre inventé | « Prévoir 35 relances » absent des sources | proposition écartée et signalée | N/A |
| Tout garder | 5 propositions | 5 tâches ajoutées à la suite, dans l'ordre, annonce « 5 tâches ajoutées » | échec partiel : état réel rechargé et dit |
| Modifier puis garder | titre modifié | passe par la même validation que l'ajout manuel | erreur de titre en ligne |
| Annuler | pendant la génération | panneau fermé, résultat tardif jeté ; le coût de l'appel est dit | N/A |
| Story supprimée entre-temps | garder visant une story disparue | « Cette user story n'existe plus. », écran rechargé | N/A |
| Story d'un autre compte | `addTasks` avec une story étrangère | refusé (RLS), aucun envoi à Claude | N/A |
| Sans session | action appelée sans connexion | redirection vers `/auth/login` | N/A |
| Échec de l'API Claude | réseau, délai, refus | message générique, rien d'écrit, panneau utilisable | erreur en ligne |

## Code Map

- `lib/domain/task-proposals.ts` (+ test) -- consigne, message (balises échappées : `<mission>`, `<story>`, `<taches_existantes>`, `<precision>`, `<note>`), lecture de l'appel d'outil, vérification ; réutilise `titleKey`, `inventedNumbers`, `limitNotes` de `story-proposals.ts` (à exporter si besoin)
- `lib/ai/task-proposals.ts` -- appel Claude (`propose_tasks`) ; partage la configuration et le délai avec `lib/ai/story-proposals.ts` (une fonction d'appel commune si le copier-coller dépasse quelques lignes)
- `lib/db/proposal-notes.ts` -- `notesForProposal` réutilisée pour la note d'origine
- `app/(app)/missions/task-proposal-actions.ts` -- `proposeTasks(storyId, hint)` (ne lit que sous session, ne crée rien) ; `app/(app)/missions/task-actions.ts` -- `addTasks(storyId, titles)`
- `components/task-proposals.tsx` -- panneau (précision, génération, annulation, cartes, « Tout garder ») ; branché dans `components/tasks.tsx`
- `tests/proposals-run.ts` -- scénarios tâches ; `docs/ia-backlog-tests.md`, `docs/journal.md`

## Tasks & Acceptance

- [ ] Règles pures + tests (consigne, message, lecture, vérification)
- [ ] Appel Claude et action `proposeTasks` (aucune écriture)
- [ ] Action `addTasks` (positions consécutives, partiel) + tests d'isolation
- [ ] Panneau « Proposer des tâches avec l'IA » dans la story dépliée
- [ ] 5 essais réels, journal, relecture indépendante

**Acceptance Criteria:**
- Given une story avec critères d'acceptation, when je demande des tâches, then j'obtiens 1 à 8 tâches ordonnées, aucune n'est enregistrée tant que je n'ai pas gardé.
- Given des tâches existantes, then aucune proposition ne les duplique, et le nombre d'écartées est dit.
- Given une proposition, when je clique « Garder » ou « Tout garder », then les tâches sont ajoutées à la suite, dans l'ordre proposé, et se réordonnent ensuite par glisser-déposer.
- Given une proposition avec un nombre absent des sources, then elle est écartée et signalée.
- Given une note d'origine d'un autre compte ou d'une autre fiche, then elle n'est jamais envoyée.
- Given un jeu de 5 essais réels (fictifs), then chaque liste est utilisable et ordonnée de façon logique (relecture humaine consignée).
- Given la suite `npm run test:isolation`, then elle passe.

## Décisions à valider

1. **Un bouton par story**, dans la story dépliée (pas au niveau du backlog entier).
2. **L'IA reçoit** la story, sa note d'origine si elle existe, les tâches déjà présentes et une **précision facultative** (« pense à l'envoi par SMS »), rien d'autre.
3. **Titres seuls, dans l'ordre logique de réalisation** : pas de durée ni de sous-tâche.
4. **Garder une par une, ou « Tout garder »** d'un coup (les tâches sont petites : relire chacune serait fastidieux).
5. **Pas de plafond quotidien** de générations (même choix que la 8.16, reporté dans `deferred-work.md`).
6. **Tâches avec le backlog (8.16)** : étape suivante, 8.17b.
