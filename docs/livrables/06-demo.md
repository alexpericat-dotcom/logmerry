# Démonstration de l'application

> **En deux phrases.** La démonstration se fait sur l'adresse de production **`https://logmerry.vercel.app`** (QR ci-dessous), avec un compte fictif, et suit un scénario de 14 étapes qui va d'un prospect à une facture payée en une vingtaine de minutes. Ce scénario a été déroulé en développement le 29 octobre 2026 ; **il n'a pas été rejoué sur la production**, et le portfolio public, la page « Qui suis-je » et le formulaire de contact y sont depuis le 5 novembre 2026.

## Où et comment

| Élément | Valeur |
|---|---|
| Adresse | `https://logmerry.vercel.app` (arrive sur la page de connexion) |
| Compte de démonstration | `demo-a@example.com`, compte **fictif**. Le mot de passe n'est écrit nulle part dans ce document : il est dans le gestionnaire de mots de passe d'Alex (ou le fichier local `.env.test.local`, ignoré par Git) |
| Inscription | Désactivée : on ne peut pas créer de compte depuis l'adresse publique |
| Données | Fictives, étiquetées « démo » ; la base ne contient aucune vraie donnée client |
| Portfolio public | `https://logmerry.vercel.app/portfolio`, **sans connexion** (vérifié le 5 novembre : réponse 200) |
| Second compte | Un compte B fictif sert au test d'isolation (`TEST_B_EMAIL`, dans `.env.test.local`, que je ne lis pas) : son adresse n'est pas écrite ici |

![QR code vers https://logmerry.vercel.app](captures/qr-production.png)

*QR généré en local depuis l'adresse ci-dessus (bibliothèque `qrcode`, installée hors du dépôt). **Scanné par Alex avec un téléphone le 5 novembre 2026** : il ouvre la page de connexion.*

## Ce que la production contient (et ne contient pas)

Production = branche `main` au 5 novembre 2026, commit `59c9d8c` (fusion de la pull request n° 102 : formulaire de contact et « Qui suis-je », après les n° 96, 97 et 99). Déploiement terminé dans Vercel (statut de commit GitHub : « Deployment has completed »).

| Visible en démonstration | **Absent de la production** |
|---|---|
| Cockpit « Aujourd'hui », clients, notes, assistant, devis, missions, backlog, sprints, factures, plafonds, échéances | Rien de prévu qui ne soit pas en ligne ; voir « Ce qui n'est pas démontrable » |
| Réalisations (gestion dans l'application, captures avec texte alternatif, statut, « Choix de conception » et « Validation ») ; **portfolio public** (`/portfolio`, sans connexion) ; page **« Qui suis-je »** (`/portfolio/qui-suis-je`) ; **formulaire de contact** (remplace le lien « M'écrire ») | — |

> **À savoir.** Le formulaire de contact écrit dans les notes du compte propriétaire, en brouillon. Un message envoyé pendant la démonstration y apparaît ; à supprimer ensuite. Sa ligne d'information est courte (base légale et durée sont décidées ; les droits et le contact restent à compléter : chapitre « Exploitation et conformité »).

## Avant de commencer : la liste de contrôle

À faire **la veille**, puis une dernière fois le matin :

| # | Contrôle | Comment | État relevé le 5 novembre |
|---|---|---|---|
| 1 | Le projet Supabase n'est pas en pause (offre gratuite : pause après une semaine sans activité) | Tableau de bord Supabase, ou ouvrir la page de connexion et se connecter | Actif (« ACTIVE_HEALTHY ») |
| 2 | La production répond | Ouvrir l'adresse ; scanner le QR | Répond (connexion en 200) |
| 3 | La connexion avec le compte fictif fonctionne | Se connecter | **Essayé le 9 novembre 2026** : connexion saisie par Alex, cockpit affiché |
| 4 | L'assistant répond (clés Anthropic et Mistral valides, crédit disponible) | Poser une question de la note de démonstration | **Essayé le 9 novembre 2026** (voir « Rejeu du 9 novembre 2026 ») : réponse sourcée en 3,5 s |
| 5 | Pas de restes d'un précédent essai | Supprimer ou renommer les fiches « Parcours démo » (le scénario crée « Atelier Mistral (démo) ») | À vérifier à l'écran |
| 6 | Le thème (sombre par défaut) et le zoom conviennent à la salle | — | — |

## Scénario

Reprise du fichier `docs/parcours-demo.md`, déroulé le 29 octobre 2026 sur le compte A. Tout est fictif et préfixé « Parcours démo ».

| # | Étape | Où | Ce qu'on saisit | Ce qu'on doit voir |
|---|---|---|---|---|
| 1 | Connexion | `/auth/login` | Compte de démonstration | Le cockpit |
| 2 | Prospect | Clients, « Créer une fiche » | « Parcours démo — Atelier Mistral (démo) », origine « Démo » | Fiche « Prospect » |
| 3 | Note du rendez-vous | Notes, « Créer une note » | Titre « Rendez-vous Atelier Mistral : site de réservation », liée à la fiche ; salon de coiffure, site avec réservation en ligne, rappel SMS la veille, budget d'environ 2 400 € HT, en ligne fin novembre, pas de nom de domaine | Note « Indexée », visible sur la fiche |
| 4 | Question à l'assistant | Panneau « Ouvrir l'assistant » | « Quel budget et quel délai l'Atelier Mistral m'a-t-il annoncés pour son site de réservation ? » | Réponse juste (2 400 € HT, fin novembre) avec « Source 1 » = la note |
| 5 | Devis | Fiche, « Nouveau devis » | 2 400 € HT, taxe vide, puis « Marquer envoyé » | Brouillon, « taxe inconnue », puis « Envoyé » |
| 6 | Devis accepté | Fiche, « Accepté » puis « Oui, accepté » | | La fiche devient « Client » ; mission « Client — devis du JJ/MM/AAAA » créée, « À planifier » |
| 7 | Backlog | Mission, « Proposer des user stories avec l'IA » | Cocher la note ; garder 4 propositions sur 5 (rejeter celle que la note ne justifie pas) ; ajouter une story à la main | 4 stories et leurs tâches, avec la source ; une 5e à la main |
| 8 | Sprint | Mission, « Ajouter un sprint » | Objectif, dates ; « Composer avec l'IA », capacité 13 ; « Placer » ; « Démarrer le sprint » | 2 stories (8 + 5 = 13 points), sprint « En cours » |
| 9 | Livraison | Mission | Stories « Terminée », « Clore le sprint », puis mission « Terminée » | Sprint clos ; mission « Terminée » |
| 10 | Rappel « Facturer » | Cockpit | | « Facturer la mission … : mission terminée, aucune facture enregistrée » |
| 11 | Facture | Mission, « Nouvelle facture » | 2 400 € HT, échéance dans un mois, devis lié | « Non payée » ; le rappel disparaît |
| 12 | Règlement | Factures, détail, « Ajouter un encaissement » | 2 400 € HT | « Payée », « soldée » |
| 13 | Prompt | Mission, bouton de prompt | « La mission seule » ou le contexte complet ; un objectif | Prompt relisible, sans montant ni donnée financière |
| 14 | Isolation | Test de sécurité | `npm run test:isolation` (sur le poste d'Alex) | Le compte B ne voit rien du compte A |

**Durée** : une vingtaine de minutes, dont environ trois d'attente de l'IA (étapes 4, 7 et 8).

### Version courte (5 minutes)

Si le temps manque : étape 1 (cockpit), puis 3 et 4 (note et question, c'est le cœur du projet : une réponse **qui cite sa source**), puis la page Plafonds (jauge étiquetée « estimation · DEMO »). Les données de démonstration sont déjà en place : `npm run seed:demo`, `seed:backlog`, `seed:activity` et `seed:to-invoice` les posent sur le compte fictif (essai à blanc possible, refus de tout compte hors `@example.com`).

## Rejeu du 9 novembre 2026 (production)

**Le rejeu a été fait par Claude Code (l'assistant de code), pas par Alex** ; Alex a seulement saisi lui-même l'e-mail et le mot de passe de la connexion (aucun identifiant n'a été lu ni enregistré par l'assistant). Étapes rejouées en lecture et en questions : cockpit, notes, recherche par mots-clés et par sens, assistant (3 questions), propositions de user stories (non gardées). **Origine des chiffres : mesure sur la production, une seule exécution, précision d'environ 0,5 s** (détail et limites au chapitre 7).

| Étape | Constat | Temps |
|---|---|---|
| Question dont la réponse est dans une note | 3 puces, 1 source cliquable | 3,5 s |
| Question hors corpus | Réponse prudente + avertissement « Aucune de tes notes ne soutient cette réponse » (**pas un refus à phrase fixe**) | 3,5 s |
| Question sur la TVA | Aucun taux, renvoi vers un expert-comptable | 2,5 s |
| Propositions de user stories | 7 propositions à relire | **19,6 s** |

**Pendant les 20 secondes de génération des stories** (Alex parle, 3 ou 4 phrases) : « Je viens de donner à l'IA le brief de la mission et la note du rendez-vous ; rien n'est enregistré tant que je ne garde pas une proposition. Claude doit appeler un outil qui impose la forme d'une story, avec ses critères et ses tâches. Chaque proposition est vérifiée : une proposition qui cite une source inconnue ou un chiffre absent des notes est écartée. » **Repli si la génération dépasse 40 secondes** : continuer à parler, puis montrer la capture du plan B (`docs/soutenance/plan-b/12-propositions-user-stories.png`) et passer à l'étape suivante.

**Nettoyage du compte de démonstration (par Alex, données fictives)** : supprimer la mission « blabla mission » depuis l'application (**à faire, À confirmer**) ; vider l'historique de l'assistant (« Vider la conversation ») **lundi 16 novembre au matin, avant la démonstration** ; le brouillon « Procédure : onboarding d'un nouveau client (démo) » reste « En attente d'indexation » (laissé en place).

## Ce qui peut mal tourner, et la réponse

| Incident | Effet | Réponse |
|---|---|---|
| Supabase en pause | Connexion impossible | Réactiver le projet depuis le tableau de bord Supabase (**durée : À confirmer**) ; d'où le contrôle de la veille |
| Anthropic ou Mistral indisponible | Étapes 4, 7 et 8 sans réponse de l'IA (message fixe) ; le reste fonctionne | Passer à l'étape suivante ; montrer les captures et le chapitre « Rapport d'évaluation » (20 sur 20, 3,4 s) |
| Plafond d'appels atteint (20 par minute) | Refus avec un message qui demande d'attendre une minute | Attendre une minute |
| Réseau de la salle | Tout est indisponible | Captures du chapitre « UX et maquettes » (6 images) ; l'application locale (`npm run dev`) en secours, mais elle parle à **la même base** |
| La réponse de l'assistant paraît fausse | — | La vérification des citations rejette une réponse dont la source n'existe pas ; en cas de doute, montrer la source citée |

## Ce qui n'est pas démontrable aujourd'hui

- Les **performances en production** : les pages ont été mesurées en développement (0,4 à 1,5 s par page, à chaud) ; la mesure sur le déploiement avec une session connectée reste à faire.
- L'**envoi réel** d'un message par le formulaire de contact : non essayé en production par moi (il écrirait dans la base).
- L'**estimation de cotisations** : bloquée tant que les règles réelles ne sont pas fournies (les règles d'essai sont « DEMO, non officielle »).
- Les **vraies données** : aucune ; tout est fictif.

## Limites de ce chapitre

| Limite | Conséquence |
|---|---|
| Scénario déroulé le 29 octobre en développement, pas sur la production | Un écart entre les deux reste possible (**À confirmer** par une répétition) |
| Rejeu partiel sur la production le 9 novembre 2026, **fait par Claude Code** (connexion saisie par Alex) | Les étapes de création (devis, facture, sprint) n'ont pas été rejouées : elles écrivent dans la base |
| QR scanné par Alex le 5 novembre : le téléphone ouvre la page de connexion | Aucune, vérifié |
