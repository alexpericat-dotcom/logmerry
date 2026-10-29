# Parcours de démonstration (compte de démo A)

Scénario déroulé le 29 octobre 2026 (story 7.4), sur le compte `demo-a@example.com`. Tout est fictif et préfixé « Parcours démo » : on peut le supprimer ou le garder pour la démo. Durée : une vingtaine de minutes (l'attente de l'IA en représente trois).

À refaire sur un compte propre : changer le nom du prospect, ou supprimer d'abord les fiches « Parcours démo ».

| # | Étape | Où | Ce qu'on saisit | Ce qu'on doit voir |
|---|-------|----|-----------------|--------------------|
| 1 | Connexion | `/auth/login` | compte de démo | le cockpit |
| 2 | Prospect | Clients, « Créer une fiche » | « Parcours démo — Atelier Mistral (démo) », origine « Démo » | fiche « Prospect » |
| 3 | Note du rendez-vous | Notes, « Créer une note » | titre « Rendez-vous Atelier Mistral : site de réservation », liée à la fiche ; texte : salon de coiffure, site avec réservation en ligne, rappel SMS la veille, budget d'environ 2 400 € HT, en ligne fin novembre, pas de nom de domaine | note « Indexée », visible sur la fiche |
| 4 | Question à l'assistant | panneau « Ouvrir l'assistant » | « Quel budget et quel délai l'Atelier Mistral m'a-t-il annoncés pour son site de réservation ? » | réponse juste (2 400 € HT, fin novembre) avec « Source 1 » = la note |
| 5 | Devis | fiche, « Nouveau devis » | 2 400 € HT, taxe vide, puis « Marquer envoyé » (date du jour) | brouillon, « taxe inconnue », puis « Envoyé » |
| 6 | Devis accepté | fiche, « Accepté » puis « Oui, accepté » | | la fiche devient « Client » ; la mission « Devis du JJ/MM/AAAA — … » est créée, « À planifier » |
| 7 | Backlog | mission, « Proposer des user stories avec l'IA » | cocher la note ; garder 4 propositions sur 5 (rejeter celle que la note ne justifie pas) ; puis « Ajouter une user story » à la main | 4 stories et leurs tâches, avec la source ; une 5e ajoutée à la main |
| 8 | Sprint | mission, « Ajouter un sprint » | objectif, dates ; « Composer avec l'IA », capacité 13 ; « Placer » ; « Démarrer le sprint » | 2 stories (8 + 5 = 13 points) placées, sprint « En cours » |
| 9 | Livraison | mission | stories du sprint « Terminée », « Clore le sprint », puis « Modifier » la mission : statut « Terminée », dates | sprint clos ; mission « Terminée » |
| 10 | Rappel « Facturer » | cockpit | | « Facturer la mission … : mission terminée, aucune facture enregistrée » |
| 11 | Facture | mission, « Nouvelle facture » | 2 400 € HT, échéance dans un mois, devis lié | « Non payée » ; le rappel disparaît du cockpit |
| 12 | Règlement | Factures, détail, « Ajouter un encaissement » | 2 400 € HT | « Payée », « soldée » |
| 13 | Prompt | mission, bouton de prompt | « La mission seule » ou le contexte complet ; un objectif | un prompt relisible, sans montant ni donnée financière |
| 14 | Vitesse, isolation | toutes les pages ; `npm run test:isolation` | | pages courantes sous 3 s ; 129 tests, le compte B ne voit rien |

## Écarts relevés au déroulé (détail dans `deferred-work.md`)

- Démarrer un sprint laisse la mission « À planifier » : il faut la passer « En cours » à la main.
- Une story passée « Terminée » garde ses tâches à « 0 sur N faites ».
- Passer la mission « Terminée » ne prévient pas quand des stories restent à faire.
- Le titre automatique de la mission d'un devis accepté (« Devis du … — Nom ») est peu parlant : à renommer.
- Le portfolio (épopée 6) n'existe pas : la dernière étape de la story 7.4 reste « à venir ».
- Vitesse mesurée en développement, à chaud (0,4 à 1,5 s par page) ; la mesure sur le déploiement reste à faire avec une session connectée.
