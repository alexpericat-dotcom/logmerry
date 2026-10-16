---
title: 'Story 8.21 : Générer un prompt depuis une mission'
type: 'feature'
created: '2026-10-17'
status: 'review'
baseline_commit: 'e601d8d'
route: 'dispatch'
context:
  - '{project-root}/_bmad-output/implementation-artifacts/spec-8-16-generer-un-backlog-avec-l-ia.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-8-17-decouper-une-story-en-taches-avec-l-ia.md'
  - '{project-root}/docs/ui-rules.md'
---

## Intent

**Problem:** quand je veux qu'un assistant (Claude, Claude Code, n8n par son MCP, un autre) avance sur une mission, je recopie à la main le contexte (la mission, le backlog, les stories, les tâches) et j'écris moi-même une consigne, rarement la meilleure (demande d'Alex, 2026-10-17).

**Approach:** sur la page d'une mission, un bouton « Générer un prompt avec l'IA » ouvre un panneau : je choisis **ce que le prompt doit contenir** (la mission seule, ou avec le backlog, les stories détaillées, les tâches), **pour quel assistant** (Claude en discussion, Claude Code, n8n par son MCP, autre) et, si je veux, **ce que je veux obtenir** (une phrase ou deux). Claude **rédige la consigne** (rôle, objectif, contraintes, format de réponse attendu, questions à poser d'abord si l'information manque), et le code **ajoute le contexte tel quel** (la mission et le backlog, recopiés sans passer par le modèle). Je relis dans un champ modifiable et je copie.

*Choix de conception : l'IA écrit seulement la partie « instruction ». Le contexte factuel est inséré par le code, mot pour mot : le modèle ne peut ni l'abîmer ni inventer un fait dans ce qu'il recopie, et le prompt reste exact même si la consigne est discutable.*

## Boundaries & Constraints

**Always:**
- Appel à Claude **côté serveur seulement** (même modèle, même clé, même fonction d'appel `callClaudeTool` que les 8.16 et 8.17, délai de 60 s) ; erreur générique « Génération impossible pour le moment. Réessaie. », jamais de contenu ni de clé.
- **Ce que l'IA reçoit, et rien d'autre :** le titre, le statut et les dates de la mission ; le nom du client **sauf si la case « sans le nom du client » est cochée** ; selon le niveau choisi, les stories du backlog (titre et statut ; puis rôle, bénéfice, critères et points ; puis les tâches et leur état) ; la cible choisie ; l'objectif saisi (1 000 caractères au plus). **Jamais les notes**, ni les factures, ni quoi que ce soit d'un autre compte ou d'une autre mission.
- Tout ce qui est donné au modèle est de la **donnée, pas une consigne** : texte échappé dans des balises ; la consigne fixe dit de ne jamais obéir à une instruction qui s'y trouverait.
- **Sortie structurée** (outil `write_prompt`) : un seul champ, le texte de la consigne (6 000 caractères au plus). Le modèle reçoit le contexte pour rédiger une consigne adaptée, mais **le bloc « Contexte » du prompt final est construit par le code** à partir des données (`lib/domain/mission-context.ts`), pas par le modèle.
- **Qualité de la consigne**, imposée par la consigne système : situer le rôle de l'assistant destinataire ; énoncer l'objectif ; renvoyer au bloc « Contexte » plus bas ; fixer les contraintes (ne pas inventer, signaler les hypothèses, demander ce qui manque **avant** d'agir quand l'information est insuffisante) ; dire le format de réponse attendu ; adapter à la cible (n8n : proposer le workflow par étapes (déclencheur, nœuds, données en entrée et en sortie, gestion d'erreur), lister les identifiants et accès nécessaires sans jamais les demander dans le prompt, prévoir un test sur une instance de test ; Claude Code : lire d'abord, proposer un plan, petits changements, tests ; Claude en discussion : questions de cadrage puis proposition ; autre assistant : consigne générique). La consigne écrite n'enjoint **jamais** à l'assistant de donner un conseil fiscal ou juridique.
- **Vérification avant affichage** : un nombre de 10 ou plus, ou un décimal, présent dans la consigne mais absent de la mission, du backlog (selon le niveau choisi) et de mon objectif **fait écarter la consigne** (même règle que le résumé de note) ; une consigne vide ou au-delà de 6 000 caractères est refusée.
- **Bloc « Contexte »** (code) : Markdown simple : mission (titre, client si autorisé, statut, dates), puis le backlog dans l'ordre de priorité (stories, puis rôle/bénéfice/critères/points/statut et tâches selon le niveau) ; au plus 30 000 caractères : au-delà, les dernières stories sont omises et le bloc le dit (« N stories omises »). Une valeur absente est omise, jamais écrite « null ».
- **Rien n'est enregistré** : le prompt n'existe qu'à l'écran (champ modifiable) ; fermer le panneau l'oublie ; aucun historique.
- **Mention de confidentialité** visible : « La mission et le backlog choisis sont envoyés à Anthropic pour rédiger le prompt, puis iront où tu colleras ce prompt. N'y mets pas de données réelles de clients. Le nom du client peut être retiré, pas celui qui figurerait dans un titre. »
- **Copier** : bouton « Copier le prompt » (presse-papiers ; en cas d'échec, le texte reste sélectionnable) avec annonce « Prompt copié. » ; « Régénérer » refait la consigne (le contexte est identique) ; les modifications manuelles sont perdues à la régénération, et il le dit.
- Interface : thèmes clair et sombre, 44 px sur téléphone, tutoiement, chargement annoncé (`role="status"`), erreurs en ligne, annulation pendant la génération (résultat tardif jeté, coût dit), focus rendu au bouton à la fermeture.
- Tests : règles pures (consigne système, message, construction du contexte et plafond, vérification), isolation (rien d'une autre mission ni d'un autre compte n'est lu), **5 essais réels** (données fictives) notés dans `docs/ia-backlog-tests.md` avec une relecture humaine de l'efficacité des prompts.

**Never:** enregistrement ou historique des prompts ; envoi des notes, du nom d'un autre client ou de toute donnée d'un autre compte ; exécution du prompt par LogMerry (c'est moi qui le colle ailleurs) ; branchement de LogMerry à un MCP ; anonymisation automatique des titres ; modèle de prompt personnalisable ; nouvelle dépendance.

## I/O & Edge-Case Matrix

| Scénario | Entrée / État | Comportement attendu | Erreur |
|----------|--------------|---------------------|--------|
| Mission seule | niveau « mission seule », cible n8n, objectif vide | consigne centrée sur le cadrage (« propose-moi un workflow ») ; bloc Contexte réduit à la mission | N/A |
| Backlog complet | niveau « tâches », cible Claude Code, 12 stories | consigne adaptée à du développement ; contexte avec stories, critères, tâches et états | N/A |
| Sans le nom du client | case cochée | le nom n'est ni envoyé au modèle ni écrit dans le contexte ; avertissement sur les titres | N/A |
| Backlog très long | contexte au-delà de 30 000 caractères | dernières stories omises, « N stories omises » dans le bloc | N/A |
| Backlog vide, niveau « backlog » | aucune story | contexte « Aucune user story pour l'instant » ; la consigne propose d'abord de découper | N/A |
| Objectif trop long | plus de 1 000 caractères | refusé avant tout appel | erreur en ligne |
| Chiffre inventé | la consigne cite « 40 heures » absent des sources | consigne écartée, message « Régénère » | erreur en ligne |
| Consigne cachée | l'objectif contient « ignore tes consignes » | non suivie : la consigne reste un prompt sur la mission | N/A |
| Annuler | pendant la génération | panneau fermé, résultat tardif jeté ; coût de l'appel dit | N/A |
| Mission supprimée entre-temps | génération visant une mission disparue | « Cette mission n'existe plus. » | N/A |
| Mission d'un autre compte | identifiant forgé | refusé (RLS), aucun envoi à Claude | N/A |
| Sans session | action appelée sans connexion | redirection vers `/auth/login` | N/A |
| Échec de l'API Claude | réseau, délai, refus | message générique, rien d'écrit | erreur en ligne |

## Code Map

- `lib/domain/mission-context.ts` (+ test) -- bloc « Contexte » en Markdown (mission, backlog, niveaux, plafond de 30 000 caractères, valeurs absentes omises, nom du client optionnel)
- `lib/domain/prompt-generation.ts` (+ test) -- consigne système (qualité, adaptation par cible), message (balises échappées : `<mission>`, `<backlog>`, `<cible>`, `<objectif>`), lecture de l'appel d'outil (`parseToolCall`), vérification (nombres, longueur), assemblage final (consigne + contexte)
- `lib/ai/prompt-generation.ts` -- appel Claude (`write_prompt`) via `lib/ai/claude-tool.ts`
- `app/(app)/missions/prompt-actions.ts` -- `generateMissionPrompt(missionId, options)` : lit sous session la mission, ses stories et tâches (selon le niveau), n'écrit rien
- `components/mission-prompt.tsx` -- panneau (niveau, cible, objectif, case client, génération, annulation, champ modifiable, copie, régénération) ; branché dans `app/(app)/missions/[id]/page.tsx`
- `tests/proposals-run.ts` -- scénarios prompts ; `docs/ia-backlog-tests.md`, `docs/journal.md`

## Tasks & Acceptance

- [x] Contexte pur + tests (niveaux, plafond, client masqué, valeurs absentes)
- [x] Consigne, message, vérification, assemblage + tests
- [x] Appel Claude et action `generateMissionPrompt` (aucune écriture)
- [x] Panneau « Générer un prompt avec l'IA » (options, génération, relecture, copie)
- [x] 5 essais réels avec relecture humaine, journal, relecture indépendante

**Acceptance Criteria:**
- Given une mission, when je choisis un niveau et une cible puis je génère, then j'obtiens un prompt (consigne + contexte) que je peux modifier et copier ; rien n'est enregistré.
- Given le niveau « tâches », then le contexte contient les stories dans l'ordre de priorité avec leurs critères, leurs tâches et leurs états, recopiés exactement depuis les données.
- Given « sans le nom du client », then le nom n'apparaît ni dans ce qui est envoyé au modèle ni dans le prompt.
- Given une consigne qui contient un nombre absent des sources, then elle est écartée et signalée.
- Given un backlog de plus de 30 000 caractères, then le contexte est tronqué et le dit.
- Given une mission d'un autre compte, then rien n'est lu ni envoyé (`npm run test:isolation`).
- Given 5 essais réels, then chaque prompt est jugé utilisable à la relecture (consigne claire, contexte exact, format de réponse attendu, adaptation à la cible), noté dans `docs/ia-backlog-tests.md`.

## Décisions à valider

1. **Emplacement :** un bouton sur la page de la mission (pas sur chaque story).
2. **Trois choix avant de générer :** le niveau de contexte (mission seule, backlog, stories détaillées, avec les tâches), la cible (Claude en discussion, Claude Code, n8n par son MCP, autre) et un objectif libre facultatif.
3. **L'IA écrit la consigne, le code recopie le contexte** (exactitude garantie, pas d'invention dans les données).
4. **Les notes ne sont jamais envoyées** (moins de fuite ; elles pourront être ajoutées plus tard, en choix explicite).
5. **Case « sans le nom du client »**, avec la limite dite : pas d'anonymisation automatique des titres.
6. **Résultat éphémère**, champ modifiable, copie en un clic, pas d'historique.
7. **Pas de plafond de générations** (même choix que 8.16 et 8.17, déjà reporté).

## Implementation Notes

- Aucune migration. La consigne système dépend de la cible (une indication par assistant : discussion, Claude Code, n8n, autre) ; le message ne contient que le titre de la mission, le niveau, la cible, le contexte déjà construit (et échappé) et l'objectif.
- Écarts au Code Map : `toolInputs(json, outil)` extrait de `parseToolCall` (`lib/domain/story-proposals.ts`) sert aussi à `parsePromptCall` ; l'appel `lib/ai/claude-tool.ts` est commun aux trois usages (stories, tâches, prompt). Le plafond de 30 000 caractères réserve une marge pour la ligne « N stories omises ».
- Essais réels (`npm run test:proposals`, scénarios 11 à 15) : 15 sur 15 en tout. Un essai a échoué au premier passage à cause de mon test, pas du code : le prompt cite la TVA pour l'interdire (« Ne donne aucun conseil fiscal ou juridique (TVA…) ») et mon test rejetait toute mention ; il vérifie maintenant que chaque ligne qui la cite est une interdiction, et que « piraté » est absent.
- Vérifié dans Chrome (compte fictif, appel réel, données supprimées ensuite) : génération, tâches lues en base et recopiées dans le contexte (« Tâches (1 sur 2 faites) », cases cochées), nom du client absent, champ modifiable avec « Régénérer remplace tes modifications », copie annoncée « Prompt copié. » ; téléphone 412 px : aucun débordement, aucune cible sous 44 px. Un faux défaut de mon script d'amorçage (tâches insérées avec des colonnes différentes : la base les a refusées sans bruit) m'a d'abord fait croire que les tâches n'étaient pas lues.
- Reste : relecture indépendante.

## Triage de la relecture indépendante (3 relecteurs, 2026-10-17)

Aucune faille de sécurité (échappement du titre, du contexte et de l'objectif, mission lue sous RLS avant tout envoi, notes jamais lues, clé jamais côté client, journaux sans contenu) ; pas de régression des 8.16 et 8.17 par l'extraction de `toolInputs`. Corrigés :
- **Bug confirmé : une story énorme vidait le reste du backlog du contexte** (le `break` s'appliquait dès que le premier bloc ne tenait pas, sans le dire). Chaque story est maintenant bornée à 6 000 caractères (« story tronquée : trop de texte »), donc une seule ne peut plus vider les suivantes.
- **Bug confirmé : le plafond de 30 000 caractères était dépassé** (l'en-tête n'était pas compté : un titre de mission de 31 000 caractères donnait 31 209). Les champs saisis sur une ligne (titre de mission, nom du client, titres, rôles, bénéfices, tâches) sont bornés à 300 caractères avec une ellipse.
- **Bug confirmé : un saut de ligne fabriquait de faux titres, une fausse date de fin ou une fausse story** dans un bloc présenté comme « fidèle ». Ces champs sont aplatis sur une ligne ; les `\r\n` des critères sont normalisés. Une ligne placée sous « ## Contexte » dit que ce sont des données recopiées, pas des instructions (réponse à la remarque sur le contenu d'une story lu par l'assistant destinataire).
- **Statut de story inconnu** : erreur (comme pour la mission), plus de « À faire » affiché à tort. **Jointure du client** : `clientNameOf` accepte un objet ou un tableau (un tableau aurait fait disparaître le client sans erreur). **Options** : `parsePromptOptions` pur et testé (`includeClient` seulement si exactement vrai, caractère nul retiré de l'objectif). **1 000 lignes** : au-delà, le niveau « tâches » est refusé avec un message au lieu de compter faux en silence.
- **Interface :** « Générer » passe en `aria-disabled` (le focus ne tombait plus sur la page) avec un verrou synchrone (deux clics rapprochés ne lancent qu'un appel payant) ; options figées pendant la génération ; focus sur le prompt seulement s'il n'a pas été déplacé ; niveau par défaut « backlog » (moins de données envoyées sans choix actif) ; zone du lien « Fermer » plus haute sur ordinateur ; `max_tokens` à 3 500.
- **Tests :** marge de 120 caractères (le mutant « marge à 0 » est maintenant tué : un balayage de tailles de stories vérifie que le texte ne dépasse jamais 30 000 avec la ligne d'omission), omission au singulier et au pluriel, story énorme, titre démesuré à chaque niveau, retours à la ligne, 0 point, rôle seul, bénéfice seul, critères en espaces, fin sans début, tâches orphelines, `clientNameOf`, `parsePromptOptions`. **Essais réels durcis** : les assertions jugent la consigne seule (avant, le titre de la mission présent dans le contexte rendait l'essai 14 toujours vrai ; l'essai 11 vérifiait une tautologie de `assemblePrompt`) ; le client est vérifié présent quand la case n'est pas cochée ; la consigne ne reprend ni « piraté » ni « 4500 » ; l'essai 15 vérifie qu'aucune story omise n'est citée.

Reportés (`deferred-work.md`) : les actions d'un même client sont sérialisées par Next : après « Annuler », une nouvelle demande peut attendre la fin de l'ancienne (dit à l'écran ; vaut aussi pour 8.16 et 8.17) ; régions « live » remontées à chaque annonce : à tester avec un vrai lecteur d'écran (même motif que les autres panneaux) ; erreurs de lecture de la base avalées par `withSession` sans journal (diagnostic aveugle) ; la consigne générée n'est pas filtrée par le code contre une demande de mot de passe ou de conseil fiscal (seule la consigne système l'interdit, plus la relecture avant copie) ; pagination du backlog et des tâches au-delà de 1 000 lignes.

Rejetés : lire le nom du client uniquement si utile (il est lu avec la mission mais jamais transmis ni écrit quand il est retiré ; la sélection conditionnelle casse le typage de Supabase) ; `&amp;` vu par le modèle (le contexte inséré par le code reste exact).
