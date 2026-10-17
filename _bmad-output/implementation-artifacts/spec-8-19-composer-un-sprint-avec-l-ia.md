---
title: 'Story 8.19 : Composer un sprint avec l''IA'
type: 'feature'
created: '2026-10-17'
status: 'review'
baseline_commit: 'e5f3550'
route: 'dispatch'
context:
  - '{project-root}/_bmad-output/implementation-artifacts/spec-3-5c-sprints.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-8-18-relire-et-ameliorer-une-story-avec-l-ia.md'
  - '{project-root}/docs/ui-rules.md'
---

## Intent

**Problem:** planifier un sprint, c'est choisir dans le backlog quelles stories tiennent dans la période, en respectant la priorité et les points. Partir d'une page blanche, story par story, est long, et on surcharge facilement un sprint.

**Approach:** dans un sprint **planifié ou en cours**, un bouton **« Composer avec l'IA »**. Je peux indiquer une **capacité visée en points** et une précision ; Claude propose, dans l'ordre de priorité, des stories du backlog à y placer, avec une raison courte par story, et un **objectif en une phrase** pour le sprint s'il n'en a pas. Je coche ce que je garde, je modifie l'objectif si je veux, puis je place. **Rien n'est placé avant mon accord.** C'est le code, pas l'IA, qui additionne les points et dit si la capacité visée est dépassée.

## Boundaries & Constraints

**Always:**
- Appel à Claude **côté serveur seulement**, un seul appel par proposition, même modèle, même clé, même délai de 60 s, même mention de confidentialité que les 8.16 à 8.18 (outil `compose_sprint` à sortie structurée). Une erreur n'expose ni contenu ni clé : « Proposition impossible pour le moment. Réessaie. »
- **Ce que l'IA reçoit, et rien d'autre :** le sprint (nom, objectif s'il existe, dates et **durée en jours**), les stories **déjà placées** dans ce sprint (titre, points : elles comptent dans la capacité), les stories du **backlog hors sprint** dans l'ordre de priorité (identifiant, titre, points, rôle, bénéfice, critères coupés à 300 caractères), le titre de la mission et le nom du client, ma capacité visée (entier de 1 à 200, facultatif) et ma précision (1 000 caractères au plus). **Jamais les notes.** Tout est de la **donnée, pas une consigne** (échappé dans des balises) ; aucun conseil fiscal ou juridique. Au plus 60 stories du backlog (les plus prioritaires) ; au-delà, un message le dit.
- Sortie structurée : une liste ordonnée de **stories du backlog** (`id` tiré de la liste fournie, `reason` de 200 caractères au plus) et, seulement si le sprint n'a pas d'objectif, un `goal` de 300 caractères au plus.
- **Vérification avant affichage :** un `id` inconnu (hors de la liste fournie, doublon, story déjà placée) est écarté et compté ; une raison ou un objectif qui contient un **nombre de 10 ou plus (ou décimal) absent des sources** (titres, points, dates, durée en jours, capacité, précision) est retiré (la story reste sans raison ; l'objectif est écarté) et le dit ; un objectif de plus de 300 caractères est écarté. Si aucune story ne survit : « L'IA n'a rien proposé d'exploitable. Précise ta capacité ou ta précision. »
- **Capacité calculée par le code :** total des points proposés (une story sans points compte 0, comme l'avancement d'un sprint) **plus** ceux déjà dans le sprint, comparé à ma capacité visée : « 13 points proposés + 5 déjà dans le sprint = 18 sur 20 visés » ou « dépasse de 3 points ». **Aucun retrait automatique** : c'est moi qui décoche. Sans capacité visée, le total est seulement affiché.
- **Présentation :** la liste proposée (cases cochées par défaut, ordre de priorité, titre, points, raison), le total, puis l'objectif proposé dans un champ **modifiable** avec sa case. « Placer N stories » est désactivé si rien n'est coché ; « Ignorer » ferme sans rien faire.
- **Placer** passe par une Server Action `placeStoriesInSprint(sprintId, storyIds, goal)` : sous la session, elle vérifie que le sprint est **à moi, de la même mission que les stories, et non clos** (« Ce sprint est clos »), que **chaque story est toujours au backlog** (« Une story a changé de liste entre-temps. Relance la proposition. », rien d'écrit), place les stories à la **fin du sprint dans l'ordre proposé** (une écriture de changement de sprint, puis le renumérotage de la liste, comme le glisser-déposer), et, si l'objectif est coché, met à jour **l'objectif seul** (valide : 300 caractères au plus, jamais ni le nom ni les dates). La RLS et le déclencheur du sprint clos s'appliquent.
- Interface : thèmes clair et sombre, 44 px sur téléphone, tutoiement, état de chargement annoncé (`role="status"`), annulation possible pendant l'attente (le résultat tardif est jeté), fermeture bloquée pendant l'enregistrement, erreurs en ligne, issue annoncée (« 4 stories placées dans le sprint « Sprint 2 », objectif mis à jour ») par une région vocale montée en permanence, focus rendu au bouton à la fermeture.
- Tests : règles pures (consigne, message, durée, vérification des ids et des nombres, total et capacité) ; **essais réels** avec données fictives notés dans `docs/ia-backlog-tests.md`, en **mesurant la sortie brute du modèle avant tout filtre** ; vérification dans Chrome. **Un seul groupe d'essais à la fois** (`npm run test:proposals -- 8.19`), mise au point avec un modèle moins cher, un passage final avec le modèle de production.

**Never:** placement automatique ; retrait automatique pour tenir la capacité ; vélocité ou historique des sprints ; estimation en heures ; modification des points, du statut ou de l'ordre du backlog (8.20) ; création de stories ; modification du nom ou des dates du sprint ; sprint clos (le bouton n'y apparaît pas) ; migration ; nouvelle dépendance.

## I/O & Edge-Case Matrix

| Scénario | Entrée / État | Comportement attendu | Erreur |
|----------|--------------|---------------------|--------|
| Proposition avec capacité | sprint de 10 jours, capacité 13, backlog avec points | stories dans l'ordre de priorité, raison par story, total des points affiché, objectif proposé | N/A |
| Sans capacité | capacité laissée vide | l'IA propose selon la durée et les points ; total affiché sans comparaison | N/A |
| Capacité dépassée | total proposé + déjà placé > capacité | message « dépasse de N points » ; rien n'est retiré, je décoche | N/A |
| Backlog sans points | aucune story n'a de points | propositions par priorité seulement ; total « 0 point (stories sans points) » | N/A |
| Backlog vide | aucune story hors sprint | message « Le backlog est vide : rien à placer », **aucun appel à Claude** | N/A |
| Sprint déjà avec un objectif | objectif existant | pas d'objectif proposé, l'existant n'est jamais écrasé | N/A |
| Placer la sélection | cases cochées | stories placées à la fin du sprint dans l'ordre proposé, avancement mis à jour, annonce | échec : message, état inchangé |
| Objectif modifié puis placé | texte édité, case cochée | l'objectif du sprint devient mon texte | objectif de plus de 300 caractères : erreur en ligne |
| Tout décoché | aucune story cochée | « Placer » désactivé | N/A |
| Story partie du backlog entre-temps | autre onglet la place ailleurs | « Une story a changé de liste entre-temps. Relance la proposition. », rien d'écrit | message visible, écran rechargé |
| Sprint clos entre-temps | autre onglet le clôt | « Ce sprint est clos. », rien d'écrit | message visible |
| Sprint supprimé entre-temps | sprint disparu | « Ce sprint n'existe plus. », écran rechargé | message visible |
| Identifiants forgés | story d'une autre mission ou d'un autre compte | « Une story a changé de liste entre-temps. » ou « n'existe plus » (RLS, filtre de mission) | rien d'écrit |
| Identifiant inconnu de l'IA | `id` absent de la liste fournie | écarté et compté (« 1 proposition écartée ») | N/A |
| Nombre inventé | raison avec « 50 inscrits » absent des sources | raison retirée ou objectif écarté, dit à l'écran | N/A |
| Consigne cachée | titre de story ou précision « ignore tes consignes… » | non suivie (donnée échappée) ; ni stories hors liste, ni conseil fiscal | N/A |
| Réponse inexploitable | format invalide, coupée, refus | « Proposition impossible pour le moment. Réessaie. » | journal sans contenu |
| Attente trop longue | plus de 60 s | message générique, je peux relancer ou annuler | N/A |
| Sans session | action appelée sans connexion | redirection vers `/auth/login` | N/A |

## Code Map

- `lib/domain/sprint-composition.ts` (+ test) -- consigne fixe, message échappé (sprint, stories placées, backlog, capacité, précision), durée en jours (réutilise `daysBetween` de `lib/domain/sprints.ts`), lecture de la réponse (réutilise `toolInputs` de `story-proposals`), vérification (ids, nombres, objectif), total des points et verdict de capacité
- `lib/ai/sprint-composition.ts` -- appel à l'API Messages, outil `compose_sprint`
- `app/(app)/missions/sprint-composition-actions.ts` -- `composeSprint(sprintId, capacity, hint)` (n'écrit rien) et `placeStoriesInSprint(sprintId, storyIds, goal)`
- `components/sprint-composer.tsx` -- bouton et panneau (capacité, précision, chargement, liste cochable, total, objectif modifiable, placer, ignorer), monté dans `components/sprint-block.tsx` pour un sprint non clos
- réutilisés : `lib/db/renumber.ts` (liste du sprint), `lib/domain/tasks.ts` (`validateHint`), `lib/domain/sprints.ts` (`validateSprintInput` pour l'objectif, `acceptsStories`, `sprintProgress`)
- `tests/proposals-run.ts` (groupe `8.19`), `docs/ia-backlog-tests.md`, `docs/journal.md`, `sprint-status.yaml`

## Tasks & Acceptance

- [x] Règles pures + tests (`lib/domain/sprint-composition.ts`)
- [x] Appel à Claude (outil `compose_sprint`) et `composeSprint` (aucune écriture)
- [x] `placeStoriesInSprint` (contrôles, placement en fin de sprint dans l'ordre, objectif seul)
- [x] Panneau : capacité, précision, liste cochable, total et verdict, objectif modifiable, annonces
- [x] Essais réels (4 scénarios fictifs, sortie brute mesurée), vérification dans Chrome (sombre, téléphone), journal, relecture indépendante

**Acceptance Criteria:**
- Given un backlog avec des points et un sprint planifié de 10 jours, when je demande une proposition avec une capacité de 13 points, then je vois des stories dans l'ordre de priorité avec une raison chacune, le total des points calculé par le code, et un objectif en une phrase ; **rien** n'est placé avant que j'accepte.
- Given un total qui dépasse la capacité, then le dépassement est dit et rien n'est retiré ; given que je décoche une story, then le total se met à jour.
- Given des stories cochées et un objectif modifié, when je place, then les stories arrivent à la fin du sprint dans l'ordre proposé, l'objectif devient mon texte, et ni le nom, ni les dates, ni les points, ni le statut ne changent.
- Given une story qui a quitté le backlog dans un autre onglet, when je place, then c'est refusé avec « Une story a changé de liste entre-temps » et rien n'est écrit.
- Given un backlog vide, then un message le dit sans appeler Claude.
- Given un `id` inventé ou un nombre absent des sources dans une raison ou l'objectif, then l'élément est écarté et signalé.
- Given une consigne cachée dans un titre de story ou la précision, then elle n'est pas suivie (essai réel mesuré sur la sortie brute).

## Décisions à valider

1. **Où :** bouton « Composer avec l'IA » dans chaque sprint **planifié ou en cours** (pas dans un sprint clos), un sprint à la fois.
2. **Ce que l'IA reçoit :** le sprint et sa durée en jours, ce qui y est déjà, le backlog dans l'ordre de priorité (60 stories au plus), ta capacité visée et ta précision ; jamais les notes.
3. **Capacité :** un champ facultatif « capacité visée en points ». C'est le **code** qui additionne les points (stories sans points = 0) et dit « dépasse de N » ; l'IA en tient compte mais **ne décide pas** et rien n'est retiré automatiquement.
4. **Résultat :** des stories du backlog dans l'ordre de priorité avec une raison courte chacune, et un objectif d'une phrase **seulement si le sprint n'en a pas** (un objectif existant n'est jamais écrasé).
5. **Placer :** cases cochées par défaut, objectif modifiable avant de placer ; les stories vont à la **fin du sprint dans l'ordre proposé** ; seul l'objectif du sprint peut changer (ni nom, ni dates).
6. **Garde contre un changement entre-temps :** si une story a quitté le backlog ou si le sprint est clos ou supprimé, rien n'est écrit.
7. **Pas de vélocité, pas de migration, pas de nouvelle dépendance.** Coût : un appel par proposition (sortie au plus 1 500 jetons) ; essais réels groupe par groupe avec un modèle moins cher pour la mise au point.

## Implementation Notes

- Décisions validées par Alex le 17 octobre (« go »). Aucune migration, aucune dépendance. Pas de test d'isolation ajouté : le placement passe par la RLS existante des stories et le déclencheur du sprint clos.
- Écarts au Code Map : les stories **terminées** du backlog (statut « Terminée », hors sprint) ne sont pas proposées ; `placeStoriesInSprint` lit d'abord la liste du sprint, place toutes les stories en queue (une écriture conditionnée à « hors sprint »), puis renumérote la liste dans l'ordre proposé ; l'objectif n'est écrit que si le sprint n'en a pas à l'instant de l'écriture (`.is("goal", null)`), sinon l'écran dit « objectif inchangé » ; la région vocale est montée en permanence hors du panneau et la fermeture est bloquée pendant le placement (leçons de la 8.17b et de la 8.18, appliquées dès le départ).
- **Essais réels** (`npm run test:proposals -- 8.19`, scénarios 25 à 28) : mise au point avec Haiku (`AI_CHAT_MODEL=claude-haiku-5-5`) 4 sur 4, puis un passage final avec le modèle de production (Sonnet) **4 sur 4** : avec 13 points visés, 4 stories pour 13 points, objectif proposé, aucun identifiant inconnu en sortie brute ; backlog sans points : 4 stories ; consigne cachée dans un titre et la précision non suivie (aucun mot du piège plus fréquent en brut qu'en entrée, aucun identifiant forgé) ; 8 points déjà placés sur 13 : une story de 5 points, objectif existant ignoré par le code.
- Vérifié dans Chrome (compte fictif, téléphone 412 px sombre, données supprimées ensuite), modèle de production : capacité de 5 points sur un backlog sans points (3 stories proposées, total « 0 point proposé = 0 sur 5 visés », objectif modifiable, focus à la capacité) ; **refus** quand une story proposée a quitté le backlog en base entre-temps (« Une story a changé de liste entre-temps. Relance la proposition. », rien d'écrit) ; nouvelle proposition, une story décochée, objectif modifié, « Placer » : seule la story cochée est placée (position 0), l'objectif devient mon texte, nom, dates, statut et points inchangés, annonce « 1 story placée dans le sprint « Sprint vide », objectif mis à jour. », focus rendu au bouton ; aucun débordement ni cible sous 44 px.
- Non vérifié dans le navigateur : thème clair ; sprint clos entre la proposition et le placement ; placement partiel (story partie entre la lecture et l'écriture).
- Reste : relecture indépendante.
