---
title: 'Parcours de démonstration complet sur le compte de démo A (story 7.4)'
type: 'chore'
created: '2026-10-29'
status: 'done'
route: 'dispatch'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** le parcours réel d'Alex (rendez-vous avec un prospect, note, mission, devis, devis validé, backlog, sprints, livraison, facture, règlement) n'a jamais été déroulé d'un trait dans l'application ; la story 7.4 du plan le demande (« connexion, client, note, question à l'assistant avec source, mission, facture, encaissement, cockpit, portfolio, sans erreur »). Sans cela, on ne sait pas si les maillons tiennent ensemble ni ce qu'on peut montrer en démo.

**Approach:** (1) écrire le scénario dans `docs/parcours-demo.md` : un prospect fictif, ce qu'on saisit à chaque écran, ce qu'on doit voir ; (2) le dérouler **réellement** dans le navigateur sur le compte A (je pilote, Alex regarde), en notant chaque écart (erreur, étape bloquée, texte trompeur, lenteur) ; (3) corriger ou mettre en dette chaque écart, un commit chacun ; (4) rejouer `test:isolation`.

## Boundaries & Constraints

**Always:** données fictives, étiquetées (« démo ») ; compte A uniquement (`@example.com`) ; les données créées par le parcours sont repérables et supprimables (préfixe « Parcours démo ») ; le SQL des éventuelles corrections de données est montré avant d'être appliqué ; le parcours suit l'application telle qu'elle est (pas de fonction ajoutée pour le faire passer, sauf décision d'Alex) ; chaque écart est noté dans `docs/journal.md`.

**Never:** toucher au compte réel d'Alex ; vraies données ; contourner l'interface par SQL pour « faire passer » une étape (sauf nettoyage final) ; inventer un taux, un montant fiscal ou un statut juridique.

**Limites connues (hors parcours, notées pour ne pas surprendre) :** le portfolio (épopée 6) n'est pas construit : l'étape finale de la story 7.4 reste donc « à venir » ; « créer une mission depuis une note » n'existe pas (l'enchaînement note, mission se fait à la main ou par le devis, dont l'acceptation crée la mission) ; la rédaction d'un backlog « avec l'aide de l'IA » consomme des appels Claude.

## Décisions à valider

1. **Prospect du scénario :** « Atelier Mistral (démo) », un salon de coiffure fictif qui veut un site de réservation en ligne et un rappel SMS. Alternative : réutiliser un prospect existant du compte A. Proposition : en créer un nouveau (le parcours part de zéro, donc plus parlant en démo).
2. **Backlog :** une passe avec l'IA (propositions de stories, relues puis gardées) **et** une story ajoutée à la main, pour montrer les deux voies. Alternative : IA seule.
3. **Mesure de vitesse :** relevé des pages courantes (cockpit, clients, missions, factures, notes) par le navigateur ; objectif de la story : moins de 3 secondes. Mesure en production (Vercel), pas en local.

## I/O & Edge-Case Matrix (étapes du parcours)

| # | Étape | Écran | Attendu |
|---|-------|-------|---------|
| 1 | Connexion | `/auth/login` | cockpit du compte A |
| 2 | Fiche prospect | `/clients/nouvelle` | prospect créé, origine « Démo » |
| 3 | Note du rendez-vous | `/notes/nouvelle` | note liée à la fiche, indexée (vectorisée) |
| 4 | Question à l'assistant | assistant | réponse avec source = la note |
| 5 | Devis (brouillon, envoyé) | fiche client | pastille « Devis envoyé » ; tuile « Devis » du cockpit à jour |
| 6 | Devis accepté | fiche client | prospect devient client ; mission « Devis du JJ/MM/AAAA — Nom » créée |
| 7 | Backlog | mission | stories (IA + main), ordre du backlog |
| 8 | Sprints | mission | sprint composé, démarré ; tâches au cockpit |
| 9 | Livraison | mission | sprint clos, mission « terminée » |
| 10 | Rappel « Facturer » | cockpit | « Facturer la mission … » apparaît |
| 11 | Facture | `/factures` | facture créée ; le rappel disparaît |
| 12 | Règlement | `/factures` | encaissement ; facture soldée ; cockpit et plafonds à jour |
| 13 | Prompt pour un autre assistant | mission | panneau « Préparer un prompt… » produit un texte relisible |
| 14 | Vitesse et isolation | toutes pages ; `test:isolation` | moins de 3 s ; compte B ne voit rien |

</frozen-after-approval>

## Tasks & Acceptance

- [ ] `docs/parcours-demo.md` : scénario complet (textes à saisir, résultats attendus), réutilisable pour la vraie démo.
- [ ] Déroulé réel dans le navigateur sur le compte A, étape par étape, avec capture des écarts.
- [ ] Chaque écart : corrigé (commit séparé) ou noté en dette avec son motif.
- [ ] Mesure des temps d'affichage en production.
- [ ] `npm run test:isolation` rejoué ; résultat noté dans le journal.
- [ ] Nettoyage : suppression des données « Parcours démo » créées, ou conservation voulue par Alex.

**Acceptation :** les étapes 1 à 14 se déroulent sans erreur bloquante ; les écarts restants sont dans `deferred-work.md` ; `docs/parcours-demo.md` permet à Alex de refaire la démo seul.
