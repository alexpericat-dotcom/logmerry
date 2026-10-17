---
title: 'Story 8.17b : Tâches proposées avec les stories du backlog'
type: 'feature'
created: '2026-10-17'
status: 'review'
baseline_commit: '8895056'
route: 'dispatch'
context:
  - '{project-root}/_bmad-output/implementation-artifacts/spec-8-16-generer-un-backlog-avec-l-ia.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-8-17-decouper-une-story-en-taches-avec-l-ia.md'
  - '{project-root}/docs/ui-rules.md'
---

## Intent

**Problem:** la 8.16 propose des stories, la 8.17 propose des tâches story par story : pour un backlog de 8 stories, il faut garder chaque story, l'ouvrir, relancer l'IA pour ses tâches, huit fois. Ce critère était écrit dans la 8.17 (« une proposition de la 8.16 peut venir avec ses tâches ») mais n'a jamais été livré.

**Approach:** dans le panneau « Proposer des user stories avec l'IA », une case **« Avec leurs tâches »** (cochée par défaut). Si elle est cochée, le **même appel** à Claude renvoie pour chaque story proposée 0 à 6 tâches, dans l'ordre logique de réalisation. Chaque proposition affiche ses tâches (modifiables, supprimables) ; **« Garder » ajoute la story et ses tâches ensemble**, tout ou rien. Case décochée : comportement actuel de la 8.16, inchangé.

## Boundaries & Constraints

**Always:**
- **Un seul appel** à Claude par génération (pas un appel par story) ; l'outil `propose_stories` reçoit un champ `tasks` (liste de titres) par story, demandé seulement si la case est cochée. Même modèle, même clé, mêmes 60 s, même mention de confidentialité qu'en 8.16. Sortie plus longue : `maxTokens` passe de 3 000 à 6 000 quand les tâches sont demandées.
- **Mêmes sources et mêmes protections que la 8.16 et la 8.17** : brief, titre de la mission, nom du client, titres du backlog, notes cochées liées au client (jamais d'un autre compte) ; contenu traité comme donnée ; aucun conseil fiscal ou juridique.
- **Vérification des tâches, tâche par tâche, avec les règles de la 8.17** : titre invalide (vide, 200 caractères au plus) écarté ; doublon dans la même story écarté (sans accents, casse, espaces ni ponctuation finale) ; **nombre de 10 ou plus (ou décimal) absent des sources écarté** (même source que les stories : brief, notes, titre de la mission, titres du backlog). Au plus 6 tâches par story. Une tâche écartée ne fait pas écarter la story ; les écarts sont comptés et dits (« 2 tâches écartées »). Une story écartée emporte ses tâches.
- **Rien d'enregistré avant « Garder »** : les tâches proposées n'existent qu'à l'écran, comme les stories.
- **Garder = tout ou rien** : une Server Action `addStoryWithTasks` ajoute la story (mêmes règles que `addStory`, dernière place du backlog, note source gardée) puis ses tâches en **une seule insertion** (`tasks`, positions consécutives). Si l'insertion des tâches échoue, la story est **supprimée** (compensation) et un message dit que rien n'a été ajouté ; si cette suppression échoue aussi, le message le dit et la story reste visible dans le backlog (rien n'est perdu ni caché).
- **Relecture** : sous chaque proposition, la liste de ses tâches ; chaque tâche se **modifie** (champ texte) et se **retire** (bouton « Retirer la tâche … ») avant de garder ; « Modifier » (formulaire de la story) garde les tâches restantes. Aucun ajout de tâche à la main dans le panneau (se fait ensuite dans la story).
- Une proposition **sans tâche** (liste vide ou toutes écartées) se garde comme une story seule.
- Interface : thèmes clair et sombre, 44 px sur téléphone, tutoiement, annonces (« Story et 4 tâches ajoutées »), erreurs en ligne, focus rendu au titre du panneau après « Garder » (déjà le cas en 8.16).
- Tests : règles pures (consigne, schéma, vérification des tâches par story, plafonds) ; **essais réels** avec données fictives (3 scénarios) notés dans `docs/ia-backlog-tests.md`, en mesurant la sortie du modèle **avant** tout filtre du code ; vérification dans Chrome.

**Never:** enregistrement automatique ; un appel par story ; tâches proposées quand la case est décochée ; migration (aucune colonne nouvelle : `tasks` et `user_stories.source_note_id` existent) ; relecture ou amélioration d'une story existante (8.18) ; sprint (8.19) ; ordre d'un backlog existant (8.20) ; nouvelle dépendance.

## I/O & Edge-Case Matrix

| Scénario | Entrée / État | Comportement attendu | Erreur |
|----------|--------------|---------------------|--------|
| Génération avec tâches | brief collé, case cochée | 1 à 8 stories, chacune avec 0 à 6 tâches ordonnées | brief et notes vides : message de la 8.16 |
| Génération sans tâches | case décochée | comportement de la 8.16, aucun champ `tasks` demandé | N/A |
| Garder avec tâches | « Garder » | story ajoutée à la fin du backlog avec ses tâches dans l'ordre ; la proposition disparaît ; annonce | échec des tâches : story retirée, message « rien n'a été ajouté », la proposition reste |
| Garder après avoir retiré / modifié des tâches | tâches éditées | seules les tâches restantes, avec mes textes, sont ajoutées | titre de tâche vide ou trop long : erreur en ligne nommant la tâche |
| Modifier puis garder | formulaire de la story | story et tâches restantes ajoutées ensemble | erreurs en ligne de la story |
| Rejeter | « Rejeter » | proposition et tâches oubliées, rien d'enregistré | N/A |
| Tâche avec un chiffre inventé | « Relancer 47 familles » absent des sources | cette tâche est écartée et comptée ; la story reste | N/A |
| Tâches en double dans une story | deux titres identiques à l'accent près | la seconde est écartée | N/A |
| Plus de 6 tâches renvoyées | réponse trop longue | les 6 premières, les autres comptées comme écartées | N/A |
| Réponse coupée (`max_tokens`) | sortie plus longue que prévu | message générique, je peux relancer ou décocher la case | « Proposition impossible pour le moment. Réessaie. » |
| Mission supprimée entre-temps | génération puis « Garder » | « Cette mission n'existe plus. », rien d'ajouté | message visible |
| Sans session | action appelée sans connexion | redirection vers `/auth/login` | N/A |
| Tâches forgées | liste de plus de 6 titres ou titres non textuels envoyés à `addStoryWithTasks` | refus avant toute écriture | message d'erreur |

## Code Map

- `lib/domain/story-proposals.ts` (+ test) -- `Proposal` reçoit `tasks: string[]` ; consigne complétée (`PROPOSAL_TASKS_ADDENDUM`) ; `verifyProposals` vérifie les tâches de chaque story avec `verifyTaskProposals` (réutilisé, plafond de 6)
- `lib/ai/story-proposals.ts` -- schéma de l'outil avec `tasks` quand `withTasks`, `maxTokens` 6 000
- `app/(app)/missions/proposal-actions.ts` -- `proposeStories(missionId, brief, noteIds, withTasks)`
- `app/(app)/missions/story-actions.ts` -- `addStoryWithTasks(missionId, taskTitles, prev, formData)` (réutilise la logique d'`addStory`, `validateTaskBatch` de `lib/domain/tasks.ts`, compensation)
- `components/story-proposals.tsx` -- case « Avec leurs tâches », tâches sous chaque proposition (édition, retrait), « Garder » et « Modifier » transmettent les tâches
- `tests/proposals-run.ts`, `docs/ia-backlog-tests.md`, `docs/journal.md`, `sprint-status.yaml` (8.17b), `epics.md` (déjà écrite)

## Tasks & Acceptance

- [x] Règles pures + tests (`lib/domain/story-proposals.ts` : consigne, vérification des tâches par story, plafonds)
- [x] Appel à Claude (schéma avec tâches) et `proposeStories(…, withTasks)`
- [x] `addStoryWithTasks` (une insertion de tâches, compensation)
- [x] Panneau : case, tâches modifiables et retirables, « Garder » et « Modifier » avec tâches, annonces
- [x] Essais réels (3 scénarios fictifs), vérification dans Chrome (clair, sombre, téléphone), journal, relecture indépendante

**Acceptance Criteria:**
- Given une mission et un brief, case « Avec leurs tâches » cochée, when je demande des propositions, then chaque story arrive avec ses tâches dans l'ordre logique, et **rien** n'est enregistré tant que je ne garde pas.
- Given une proposition avec 4 tâches dont j'en retire une et j'en modifie une, when je clique « Garder », then la story et ses 3 tâches (mes textes, mon ordre) sont ajoutées ensemble ; given un échec d'ajout des tâches, then la story n'est pas ajoutée et le message le dit.
- Given une tâche contenant un nombre de 10 ou plus absent du brief, des notes, du titre de la mission et du backlog, then cette tâche est écartée et comptée, la story reste.
- Given la case décochée, then aucune tâche n'est demandée ni affichée (comportement de la 8.16).
- Given 3 essais réels fictifs, then les résultats sont notés (tâches utilisables et ordonnées, aucun chiffre inventé gardé, sortie du modèle mesurée avant filtre).

## Décisions à valider

1. **Un seul appel**, case « Avec leurs tâches » **cochée par défaut** (décochable). Moins cher et plus cohérent qu'un appel par story ; la 8.17 reste pour découper une story existante.
2. **0 à 6 tâches par story** (la 8.17 en accepte 8 pour une seule story ; ici 6 pour tenir dans la limite de sortie). Plafond de sortie relevé à 6 000 jetons ; si les essais réels montrent des réponses coupées, on baisse à 4 tâches ou on décoche par défaut.
3. **Garder = tout ou rien** par compensation (supprimer la story si les tâches échouent), sans migration ni fonction SQL. Une fonction SQL transactionnelle serait plus propre mais ajoute une migration ; reportée (`deferred-work`) tant que ça tient.
4. **Édition dans le panneau** : modifier et retirer des tâches, pas en ajouter (l'ajout se fait dans la story, après). Plus simple et suffisant pour relire.
5. **Pas de migration, pas de nouvelle dépendance.** Coût : un appel plus long ; pas de plafond de générations (point déjà dans `deferred-work`).

## Implementation Notes

- Décisions validées par Alex le 17 octobre (« go »). Aucune migration, aucune dépendance.
- Écarts au Code Map : `verifyStoryTasks` est dans `lib/domain/story-proposals.ts` (et non un appel à `verifyTaskProposals`) pour éviter un import circulaire avec `task-proposals.ts` ; `addStory` et `addStoryWithTasks` partagent `insertStory` ; la sixième tâche est le plafond, la septième et au-delà sont comptées comme écartées ; la consigne demande de parler de « données de test », jamais de données réelles de clients (les premiers essais disaient « tester avec des données réelles »).
- Essais réels (tests/proposals-run.ts, scénarios 16 à 18, sortie brute mesurée avant filtre) : 18 sur 18, deux passages. Tâches par story 4 à 6, aucune écartée, ordre logique (cadrer, créer, tester, livrer), consigne cachée non suivie (ni dans les stories ni dans les tâches).
- Vérifié dans Chrome (compte fictif, données supprimées ensuite) : génération avec la case cochée (2 propositions avec 5 tâches chacune), tâche modifiée et tâche retirée puis « Garder » : la story et 4 tâches avec mon texte et mon ordre sont en base (positions 0 à 3), annonce « ajoutée au backlog avec 4 tâches », une proposition restante ; « Modifier » avec une tâche vide : « Tâche 2 : Saisis le titre de la tâche. » et la proposition reste ; téléphone 412 px sombre : aucun débordement, aucune cible sous 44 px. Non vérifié dans le navigateur : la compensation (échec d'ajout des tâches), le thème clair, la case décochée.
- Reste : relecture indépendante.
