---
title: 'Story 8.20 : Ordonner le backlog avec l''IA'
type: 'feature'
created: '2026-10-18'
status: 'review'
baseline_commit: 'daae1c5'
route: 'dispatch'
context:
  - '{project-root}/_bmad-output/implementation-artifacts/spec-3-5a-backlog-et-user-stories.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-3-5c-sprints.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-8-19-composer-un-sprint-avec-l-ia.md'
  - '{project-root}/docs/ui-rules.md'
---

## Intent

**Problem:** l'ordre du backlog est la priorité : ce qui est en haut sera fait en premier. Quand les stories arrivent en vrac (propositions de l'IA gardées, ajouts au fil de l'eau), l'ordre ne reflète plus les dépendances : on peut se retrouver à planifier un export avant d'avoir la saisie.

**Approach:** dans le backlog d'une mission, un bouton **« Proposer un ordre logique »**. Claude propose un nouvel ordre pour les stories ouvertes du backlog (les dépendances d'abord, le socle avant le confort) avec **une phrase de raison pour chaque story déplacée**. Je vois l'ancienne et la nouvelle place de chaque story, puis **j'applique l'ordre ou j'ignore**. **Rien n'est réordonné avant mon accord.** Pour ajuster, je fais ensuite un glisser-déposer comme d'habitude.

## Boundaries & Constraints

**Always:**
- Appel à Claude **côté serveur seulement**, un seul appel par proposition, même modèle, même clé, même délai de 60 s, même mention de confidentialité que les 8.16 à 8.19 (outil `order_backlog` à sortie structurée), y compris le titre de la mission et le nom du client. Une erreur n'expose ni contenu ni clé : « Proposition impossible pour le moment. Réessaie. »
- **Périmètre :** seules les stories du **backlog hors sprint et non terminées** sont ordonnées. Les stories placées dans un sprint et les stories terminées du backlog **ne bougent pas** : l'ordre proposé n'occupe que les places des stories ordonnées (les terminées gardent leur place). Au plus **60 stories** envoyées (les 60 premières du backlog ouvert) ; les suivantes gardent leur place et un message le dit. Moins de 2 stories ouvertes : « Il faut au moins 2 stories ouvertes pour proposer un ordre. », **aucun appel à Claude**.
- **Ce que l'IA reçoit, et rien d'autre :** le titre de la mission et le nom du client, les stories à ordonner (identifiant, titre, points, rôle, bénéfice, critères coupés à 300 caractères) dans leur ordre actuel, les **titres** des stories déjà dans des sprints (pour comprendre ce qui est déjà planifié), et ma précision facultative (1 000 caractères au plus). **Jamais les notes.** Tout est de la **donnée, pas une consigne** (échappé dans des balises) ; aucun conseil fiscal ou juridique.
- Sortie structurée : une liste ordonnée de `id` (tirés de la liste fournie) et, pour chaque story qu'elle déplace, une `reason` d'une phrase de 200 caractères au plus.
- **Vérification avant affichage :** un `id` inconnu ou répété est écarté et compté ; **une story omise par l'IA est remise à la suite, dans son ordre actuel, et le dit** (« 2 stories non classées par l'IA sont à la fin ») ; une raison qui contient un **nombre de 10 ou plus (ou décimal) absent des sources** (titres, points, critères, précision) est retirée (la story reste déplacée, sans raison) et comptée. Si l'ordre proposé est **identique** à l'ordre actuel : « L'ordre actuel te semble déjà logique à l'IA. » sans bouton d'application.
- **Présentation :** la liste dans l'ordre proposé, chaque story avec sa **place actuelle → nouvelle place** (« 5 → 2 », « inchangée »), sa raison si elle est déplacée ; les stories fixes (terminées, hors périmètre) ne sont pas listées. Boutons « Appliquer cet ordre » et « Ignorer ».
- **Appliquer** passe par une Server Action `applyBacklogOrder(missionId, baseIds, newIds)` : sous la session, elle relit le backlog hors sprint et **refuse si une story est apparue, a disparu, a changé de liste, est devenue terminée, ou si l'ordre a changé depuis la proposition** (« Le backlog a changé entre-temps. Relance la proposition. », rien d'écrit) ; sinon elle calcule l'ordre complet (les places des stories ordonnées reçoivent le nouvel ordre, les autres stories ne bougent pas) et le renumérote comme le glisser-déposer. Elle n'écrit que des positions : ni titre, ni points, ni statut, ni sprint.
- « **Modifier** » se fait après coup, par le glisser-déposer existant : les déplacements proposés dépendent les uns des autres, on ne les accepte donc pas un par un.
- Interface : thèmes clair et sombre, 44 px sur téléphone, tutoiement, état de chargement annoncé (`role="status"`), annulation possible pendant l'attente (le résultat tardif est jeté), fermeture bloquée pendant l'application, erreurs en ligne, boutons qui se désactivent en `aria-disabled` (le focus reste), issue annoncée par une région vocale montée en permanence (« Backlog réordonné : 4 stories déplacées »), focus rendu au bouton à la fermeture. Un échec d'application efface la proposition périmée.
- Tests : règles pures (consigne, message, vérification des identifiants, des nombres et des omissions, calcul de l'ordre complet par places, comparaison à l'ordre actuel) ; **essais réels** avec données fictives notés dans `docs/ia-backlog-tests.md`, en **mesurant la sortie brute du modèle avant tout filtre** ; vérification dans Chrome. **Un seul groupe d'essais à la fois** (`npm run test:proposals -- 8.20`), mise au point avec Haiku, un passage final avec Sonnet.

**Never:** réordonnancement automatique ; modification du contenu, des points, du statut ou du sprint d'une story ; déplacement d'une story vers ou hors d'un sprint ; réordonnancement des stories d'un sprint ; création ou suppression de stories ; vélocité ; migration ; nouvelle dépendance.

## I/O & Edge-Case Matrix

| Scénario | Entrée / État | Comportement attendu | Erreur |
|----------|--------------|---------------------|--------|
| Backlog en vrac | « Exporter les paiements » avant « Saisir les inscriptions » | l'IA remonte la saisie, avec une raison par story déplacée ; « 5 → 2 » affichés | N/A |
| Ordre déjà logique | backlog bien ordonné | « L'ordre actuel te semble déjà logique à l'IA. », pas de bouton d'application | N/A |
| Moins de 2 stories ouvertes | 0 ou 1 story ouverte | message, **aucun appel à Claude** | N/A |
| Stories terminées dans le backlog | une story « Terminée » au milieu | elle garde sa place ; seules les ouvertes se réordonnent dans les autres places | N/A |
| Stories dans un sprint | stories placées dans un sprint | elles ne sont ni réordonnées ni déplacées ; leurs titres informent l'IA | N/A |
| Appliquer | « Appliquer cet ordre » | positions enregistrées, l'écran se met à jour, annonce | échec : message, ordre inchangé |
| Ignorer / fermer / Échap | croix, « Ignorer » | rien d'enregistré, proposition oubliée | N/A |
| Story ajoutée ou supprimée pendant la proposition | autre onglet | « Le backlog a changé entre-temps. Relance la proposition. », rien d'écrit, proposition effacée | message visible, écran rechargé |
| Ordre changé à la main pendant la proposition | glisser-déposer dans un autre onglet | même refus | message visible |
| Story placée dans un sprint ou terminée entre-temps | autre onglet | même refus | message visible |
| Identifiants forgés | liste incomplète, dupliquée, d'une autre mission ou d'un autre compte | refus (« a changé entre-temps » ou « n'existe plus »), rien d'écrit | N/A |
| Story omise par l'IA | l'IA oublie 2 identifiants | elles sont remises à la suite dans leur ordre actuel, dit à l'écran | N/A |
| Identifiant inconnu ou répété de l'IA | `id` absent de la liste | écarté et compté | N/A |
| Nombre inventé | raison avec « 50 inscrits » absent des sources | raison retirée, dit à l'écran | N/A |
| Consigne cachée | titre, critère ou précision « ignore tes consignes… » | non suivie ; aucun identifiant hors liste, aucun conseil fiscal | N/A |
| Plus de 60 stories ouvertes | gros backlog | les 60 premières sont ordonnées, les suivantes gardent leur place, dit à l'écran | N/A |
| Réponse inexploitable | format invalide, coupée, refus | « Proposition impossible pour le moment. Réessaie. » | journal sans contenu |
| Attente trop longue | plus de 60 s | message générique, je peux relancer ou annuler | N/A |
| Sans session | action appelée sans connexion | redirection vers `/auth/login` | N/A |

## Code Map

- `lib/domain/backlog-order.ts` (+ test) -- consigne fixe, message échappé, lecture de la réponse (réutilise `toolInputs`), vérification (ids, omissions, nombres), `applyOrderToSlots(listeComplète, idsOrdonnés, nouvelOrdre)`, comparaison à l'ordre actuel, places avant et après
- `lib/ai/backlog-order.ts` -- appel à l'API Messages, outil `order_backlog`
- `app/(app)/missions/backlog-order-actions.ts` -- `proposeBacklogOrder(missionId, hint)` (n'écrit rien) et `applyBacklogOrder(missionId, baseIds, newIds)` (relit, refuse si changé, renumérote)
- `components/backlog-order.tsx` -- bouton et panneau (précision, chargement, liste « avant → après » avec raisons, appliquer, ignorer), monté dans `components/backlog.tsx` près de « Proposer des user stories avec l'IA »
- réutilisés : `lib/db/renumber.ts`, `lib/domain/tasks.ts` (`validateHint`), `lib/domain/user-stories.ts` (`parseReorderIds`, `isPermutation`)
- `tests/proposals-run.ts` (groupe `8.20`), `docs/ia-backlog-tests.md`, `docs/journal.md`, `sprint-status.yaml`

## Tasks & Acceptance

- [x] Règles pures + tests (`lib/domain/backlog-order.ts`)
- [x] Appel à Claude (outil `order_backlog`) et `proposeBacklogOrder` (aucune écriture)
- [x] `applyBacklogOrder` (relecture, refus si changé, ordre par places, renumérotation)
- [x] Panneau : précision, liste avant → après avec raisons, appliquer, ignorer, annonces
- [x] Essais réels (4 scénarios fictifs, sortie brute mesurée), vérification dans Chrome (sombre, téléphone), journal, relecture indépendante

**Acceptance Criteria:**
- Given un backlog de plusieurs stories dans un ordre illogique, when je clique sur « Proposer un ordre logique », then je vois un nouvel ordre avec, pour chaque story déplacée, sa place actuelle → nouvelle et une raison, et **rien** n'est réordonné avant « Appliquer ».
- Given l'ordre appliqué, then seules les positions des stories ordonnées changent : les stories terminées et celles des sprints gardent leur place, et ni le contenu, ni les points, ni le statut, ni le sprint ne changent.
- Given une story ajoutée, supprimée, terminée, placée dans un sprint, ou un ordre modifié dans un autre onglet pendant la proposition, when j'applique, then c'est refusé avec « Le backlog a changé entre-temps » et rien n'est écrit.
- Given moins de 2 stories ouvertes, then un message le dit sans appeler Claude.
- Given un ordre proposé identique à l'actuel, then un message le dit et il n'y a pas de bouton d'application.
- Given un identifiant inventé, une story omise ou un nombre absent des sources, then l'élément est écarté, remis à la suite ou retiré, et signalé.
- Given une consigne cachée dans un titre, un critère ou la précision, then elle n'est pas suivie (essai réel mesuré sur la sortie brute).

## Décisions à valider

1. **Où :** un bouton « Proposer un ordre logique » dans la section Backlog, à côté de « Proposer des user stories avec l'IA » ; visible dès qu'il y a au moins 2 stories ouvertes dans le backlog.
2. **Périmètre :** seules les stories **hors sprint et non terminées** sont réordonnées ; les stories d'un sprint et les terminées **gardent leur place** (l'IA ne remplit que les places des stories ordonnées). Au plus 60 stories envoyées.
3. **Résultat :** un ordre complet, avec pour chaque story déplacée sa place actuelle → nouvelle place et une phrase de raison ; les stories qui ne bougent pas sont marquées « inchangée ».
4. **Appliquer tout ou ignorer** (pas de choix story par story : les déplacements dépendent les uns des autres). Pour ajuster, tu fais ensuite un **glisser-déposer** comme aujourd'hui. Ton critère « je modifie » est donc couvert après coup, pas dans la proposition.
5. **Garde contre un changement entre-temps :** « Appliquer » compare le backlog à ce que tu as relu (ajout, suppression, story terminée ou placée dans un sprint, ordre modifié ailleurs) et refuse, sans migration.
6. **Story omise par l'IA :** remise à la suite dans son ordre actuel, et dit à l'écran (l'IA ne peut pas faire disparaître une story).
7. **Pas de migration, pas de nouvelle dépendance.** Coût : un appel par proposition (sortie au plus 2 500 jetons) ; essais réels groupe par groupe, mise au point avec Haiku et un seul passage final avec Sonnet.

## Implementation Notes

- Décisions validées par Alex le 18 octobre (« go »). Aucune migration, aucune dépendance. Pas de test d'isolation ajouté : l'application n'écrit que des positions de stories par la RLS existante.
- Écarts au Code Map : `applyBacklogOrder(missionId, baseIds, sentIds, newOrder)` reçoit aussi la liste des stories ordonnées (`sentIds`, sous-ensemble du backlog) en plus du backlog de base ; le bouton n'apparaît que s'il y a au moins 2 stories ouvertes et pas pendant l'ajout à la main ; `moves` donne les places avant et après ; la consigne exige une raison pour toute story dont la place change, même par effet de bord (voir plus bas).
- **Défaut trouvé à la lecture des essais :** au premier passage avec Sonnet, 4 stories sur 6 étaient déplacées mais seules 2 avaient une raison (les stories qui ne bougeaient que parce qu'une autre passait devant n'en recevaient pas), contre le critère « une phrase de raison par story déplacée ». L'essai 29 mesure maintenant, sur la sortie brute et place par place, les stories déplacées sans raison ; la consigne précise que toute place changée, même par effet de bord, reçoit sa raison. Passage suivant : 6 stories déplacées, 0 sans raison.
- **Essais réels** (`npm run test:proposals -- 8.20`, scénarios 29 à 32) : mise au point avec Haiku 4 sur 4, puis passage final avec le modèle de production 4 sur 4 : backlog en vrac (saisie avant suivi avant relances, saisie avant export, 0 identifiant inconnu en brut, toutes les stories déplacées avec raison) ; backlog déjà logique : 0 place changée ; consigne cachée dans un titre et la précision : ni « piraté », ni l'identifiant forgé en sortie brute, « tva » et « 4500 » jamais plus qu'en entrée ; le minimum de 2 stories.
- Vérifié dans Chrome (compte fictif, téléphone 412 px sombre, données supprimées ensuite), modèle de production : backlog de 5 stories dont une terminée en 3ᵉ place ; panneau (focus à la précision, bouton en `aria-disabled` pendant l'attente), proposition de 4 stories ordonnées avec « 4 → 1 » et raisons (la terminée n'est pas listée) ; « Appliquer » : ordre final saisie, suivi, **terminée à sa place (3ᵉ)**, relances, export ; annonce « Backlog réordonné : 4 stories déplacées. », focus rendu au bouton ; **refus** quand l'ordre a été modifié en base entre la proposition et l'application (« Le backlog a changé entre-temps. Relance la proposition. », rien d'écrit, proposition effacée) ; aucun débordement ni cible sous 44 px.
- Non vérifié dans le navigateur : thème clair ; plus de 60 stories ; story omise par l'IA ; story placée dans un sprint ou terminée pendant la proposition (couvert par la comparaison du backlog, vérifiée par la lecture du code).
- Reste : présentation à Alex.

## Triage de la relecture indépendante (3 relecteurs, 2026-10-18)

Aucune faille de cloisonnement ni de fuite (RLS, positions seules écrites, échappement, notes jamais envoyées, aucune clé ni contenu dans les journaux) ; les sept décisions d'Alex sont respectées (ni migration ni dépendance) ; rien n'est réordonné avant « Appliquer » ; les stories terminées et en sprint gardent leur place. **Corrigés :**
- **Réponse vide de l'IA présentée comme « ordre déjà logique »** (aucun identifiant exploitable : tout remis à la suite, donc ordre identique) : l'IA n'a rien classé → « L'IA n'a rien classé d'exploitable. Réessaie. » ; le message « déjà logique » ne s'affiche que si aucune story n'a été omise.
- **Rangs refusés à tort** : au-delà de 10 stories, « descend à la place 11 » était retiré comme chiffre inventé (la story déplacée restait sans raison). Les rangs de 1 au nombre de stories envoyées sont des sources autorisées (et pas plus : « 50 inscrits » reste refusé pour 3 stories).
- **Places affichées** : elles étaient comptées parmi les seules stories ordonnées (« 4 → 1 » pour une story visible en 5ᵉ position quand une terminée est dans la liste). Elles suivent maintenant la liste telle qu'on la voit, terminées comprises (vérifié dans Chrome : « 5 → 1 », « 1 → 5 »).
- **Garde de péremption extraite et testée** (`backlogUnchanged`) : story ajoutée, retirée, permutée, ordonnée devenue terminée, terminée hors envoi (sans effet), `sent` forgé. **Plafond de 60 extrait et testé** (`pickOrderable`) : les 60 premières ouvertes, les suivantes et les terminées gardent leur place.
- **Départage stable** : `id` en dernier critère de tri du backlog (page et lecture de l'action), pour qu'une égalité de position et de création ne fasse pas refuser à tort.
- **Focus** : quand la proposition est périmée, le focus passe à « Proposer à nouveau » (vérifié dans Chrome) ; la croix et « Ignorer » pendant l'application passent en `aria-disabled` (le focus reste).
- **Autres :** titres des stories en sprint plafonnés à 100 ; critères coupés à 300 caractères aussi pour le contrôle des chiffres ; message « moins de 2 stories » aligné sur la spec ; message d'échec d'écriture « Relance une proposition » ; compteur de raisons retirées limité aux stories dont la place change.
- **Essais réels durcis :** le 30 exige 0 place changée, 0 raison et un ordre identique (fixture sans ambiguïté : la dernière story est « Présenter le tableau final à la directrice ») ; le 31 piège aussi un critère. Passage final sur le modèle de production : 4 sur 4.

**Reportés (`deferred-work`) :** fenêtre de course entre la relecture du serveur et `renumber` (un glisser-déposer entre les deux serait écrasé : `renumber` ne vérifie que l'ensemble, pas l'ordre ; même limite que le glisser-déposer) ; écritures par ligne sans transaction ; plafond de 500 identifiants de `parseReorderIds` (un backlog hors sprint de plus de 500 stories ne pourrait pas être appliqué) ; ouvrir l'ajout à la main démonte le panneau et perd la proposition ; pas de limite de générations (déjà noté) ; stories omises par l'IA et identifiants forgés en brut non couverts par un essai réel (couverts par les tests purs) ; thème clair non vérifié.
