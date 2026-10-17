---
status: final
stepsCompleted: [1, 2, 3, 4]
mode: rapide
inputDocuments:
  - _bmad-output/planning-artifacts/prds/prd-logmerry-2026-10-10/prd.md
  - _bmad-output/planning-artifacts/prds/prd-logmerry-2026-10-10/addendum.md
  - _bmad-output/planning-artifacts/architecture/architecture-logmerry-2026-10-12/ARCHITECTURE-SPINE.md
  - _bmad-output/planning-artifacts/ux-designs/ux-logmerry-2026-10-11/DESIGN.md
  - _bmad-output/planning-artifacts/ux-designs/ux-logmerry-2026-10-11/EXPERIENCE.md
created: 2026-10-13
---

# LogMerry - Découpage en epics et stories

## Aperçu

Ce document découpe le PRD, les documents UX et l'architecture en epics (grands blocs) et en stories (petites tâches). Chaque story tient dans **une conversation avec l'IA** et se **teste dans le navigateur**. Les stories sont ensuite rangées en **13 sprints**, dans l'ordre du PRD (§7.2 et §7.3) : d'abord la tranche RAG de bout en bout pour le jalon du 30 octobre 2026 (sprints 1 à 6), puis le reste du MVP. Les numéros d'epics et de stories ne suivent pas l'ordre des sprints : c'est le tableau « Plan des sprints » qui fait foi.

Vocabulaire : *story* = une petite fonctionnalité ; *epic* = un groupe de stories ; *sprint* = une série courte de 3 à 4 stories qui se termine par une version qui fonctionne ; *RLS* = la sécurité qui empêche un compte de voir les données d'un autre ; *RAG* = l'assistant qui répond à partir de tes notes en citant ses sources.

## Inventaire des exigences

### Exigences fonctionnelles

- FR-1 : connexion et isolation des données par compte (RLS sur chaque table).
- FR-2 : compte de démonstration avec données fictives étiquetées.
- FR-3 : créer, modifier, classer, rechercher des notes ; une note enregistrée est découpée et indexée.
- FR-4 : l'assistant répond avec des sources vérifiées, ou dit qu'il ne trouve pas.
- FR-5 : historique des échanges conservé, avec citations cliquables.
- FR-6 : jeu de test du RAG (15 à 20 questions), score mesuré, aucune fuite entre comptes.
- FR-7 : prospects, clients, contacts, statut, étiquette d'origine, lien avec les notes.
- FR-8 : missions pilotées en agile (changement du 2026-10-16, décision d'Alex) : backlog de user stories, tâches, sprints, avec progression ; l'IA aide à les concevoir (FR-23, stories 8.16 à 8.20) et à en tirer un prompt (FR-24, story 8.21). Remplace les « étapes datées ».
- FR-9 : factures (payée ou non, échéance) et encaissements.
- FR-10 : table de paramètres (taux, plafonds) avec source et date de vérification.
- FR-11 : estimations (cotisations, plafond) calculées par le code, étiquetées « estimation ».
- FR-12 : garde-fous de l'assistant (pas de conseil fiscal ou juridique).
- FR-13 : échéances avec date et source obligatoires.
- FR-14 : six règles qui ordonnent les tâches du jour, chacune avec son motif.
- FR-15 : cockpit avec CA encaissé, position par rapport au plafond, estimations étiquetées.
- FR-16 : réalisations publiables (avec accord du client) sur une page publique en lecture seule.
- FR-19 : recherche dans les notes, clients et missions.
- FR-20 : résumé automatique d'une note (après le jalon RAG).
- FR-21 : « Créer une note à documenter plus tard » et écran « À faire ».
- FR-22 : suivi de devis (montant, date d'envoi, statut).
- FR-23 : aide de l'IA à la conception d'une mission (17 octobre) : propositions de user stories, de tâches, relecture d'une story, composition d'un sprint, ordre logique du backlog ; rien n'est enregistré sans l'accord du propriétaire.
- FR-24 : générer un prompt depuis une mission (17 octobre) : l'IA rédige la consigne, le code recopie le contexte.
- Hors MVP : FR-17 et FR-18 (catalogue d'outils, brouillon de devis).

### Exigences non fonctionnelles

- NFR-1 : page courante en moins de 3 s ; assistant en moins de 15 s ou état d'attente.
- NFR-2 : accessibilité WCAG 2.1 AA sur les parcours UJ-1 à UJ-5.
- NFR-3 : aucune clé secrète côté navigateur ni dans Git ; schéma par migrations.
- NFR-4 : sauvegarde vérifiée avant les vraies données.
- NFR-5 : `docs/journal.md` à jour ; au moins 3 exécutions datées du jeu de test RAG.

### Exigences issues de l'architecture

- AR-1 : projet Next.js (App Router) passé en 16.x et épinglé ; déploiement Vercel (région `cdg1`) ; Supabase UE.
- AR-2 : RLS partout (`owner_id = auth.uid()`), jamais de clé `service_role` dans l'application.
- AR-3 : lectures dans les Server Components, écritures par Server Actions qui retournent `{ ok, data } | { ok: false, error }` ; contraintes de validité dans la base.
- AR-4 : calculs et règles dans `lib/domain/` (fonctions pures testées avec Vitest) ; l'IA ne calcule aucun chiffre.
- AR-5 : appels IA uniquement côté serveur (`lib/ai/`, `server-only`) ; Claude pour les réponses, `mistral-embed` (1024 dimensions) pour les embeddings.
- AR-6 : chaque table est créée par une migration dans `supabase/migrations/`, SQL montré avant application.
- AR-7 : argent en centimes entiers ; dates en UTC ; « aujourd'hui » à l'heure de Paris.
- AR-8 : le public ne lit que la vue `public_realisations`.
- AR-9 : citations vérifiées, pas de streaming, citations rattachées à `note_id`.

### Exigences UX

- UX-DR1 : barre latérale fixe, repliable, page courante marquée sans couleur seule ; panneau assistant non modal poussé à droite.
- UX-DR2 : thème clair/sombre (`next-themes`), jetons de `DESIGN.md`, interface en français (tutoiement dans l'espace privé, vouvoiement sur le portfolio).
- UX-DR3 : `task-row` (motif visible, coche, titre barré, réordonnancement annoncé) et message de félicitation ; `backlog-summary` masquée à 0.
- UX-DR4 : `plafond-bar` avec marqueur à 90 %, `estimation-label`, état « paramètre manquant » avec icône et texte.
- UX-DR5 : palette `⌘K` (recherche, puis assistant) avec bouton équivalent et `aria-keyshortcuts`.
- UX-DR6 : `data-table` accessible (tri, filtres, `caption`, `aria-sort`).
- UX-DR7 : formulaires avec champs minimum, libellés associés, récapitulatif d'erreurs en tête.
- UX-DR8 : états vide, chargement (`Skeleton`), erreur avec « Réessayer », sans perte de saisie.
- UX-DR9 : `citation-chip` (lien ou bouton ≥ 24 px, « Copier le texte », « Ouvrir »).
- UX-DR10 : socle d'accessibilité : `lang="fr"`, un seul `h1`, lien d'évitement, focus visible, contrastes 4,5:1, `prefers-reduced-motion`.
- UX-DR11 : portfolio public : texte alternatif obligatoire sur chaque capture, lien « m'écrire » (`mailto:`).

## Carte de couverture des FR

| FR | Epic | Stories |
| --- | --- | --- |
| FR-1 | 1 | 1.2, 1.3, 2.3 |
| FR-2 | 2, 7 | 2.3, 7.1 |
| FR-3 | 2, 8 | 2.1, 2.2, 8.3, 8.4 |
| FR-4 | 8 | 8.8, 8.9, 8.11 |
| FR-5 | 8 | 8.10 |
| FR-6 | 8 | 8.14, 8.15 |
| FR-7 | 3 | 3.1, 3.2, 3.3 |
| FR-8 | 3 | 3.4, 3.5a, 3.5b, 3.5c |
| FR-9 | 4 | 4.2, 4.3 |
| FR-10 | 4 | 4.1 |
| FR-11 | 4 | 4.4, 4.5 |
| FR-12 | 8 | 8.12 |
| FR-13 | 5 | 5.1 |
| FR-14 | 5 | 5.2, 5.3, 5.4 |
| FR-15 | 5 | 5.5 |
| FR-16 | 6 | 6.1, 6.2, 6.3 |
| FR-19 | 2, 3, 8 | 2.4, 3.7, 8.6 |
| FR-20 | 8 | 8.13 |
| FR-21 | 5, 8 | 5.6, 8.11 |
| FR-22 | 3 | 3.6 |
| FR-23 | 8 | 8.16, 8.17, 8.17b, 8.18, 8.19, 8.20 |
| FR-24 | 8 | 8.21 |

## Liste des epics

1. **Epic 1 : Fondations et accès** : l'application est en ligne et je m'y connecte.
2. **Epic 2 : Mes notes** : j'écris, classe et retrouve mes notes (sans IA), et deux comptes ne se voient pas.
3. **Epic 3 : Clients et missions** : je suis mes prospects, clients, missions et devis.
4. **Epic 4 : Factures et finances** : je suis mes factures, mes encaissements et mon plafond.
5. **Epic 5 : Échéances et cockpit « Aujourd'hui »** : l'application me dit quoi faire aujourd'hui, et pourquoi.
6. **Epic 6 : Réalisations et portfolio public** : je montre mes réalisations à des prospects.
7. **Epic 7 : Application complète et démontrable** : données de démonstration, accessibilité, sauvegarde.
8. **Epic 8 : Assistant IA et RAG** (livré juste après les fondations et les notes) : l'assistant répond à partir de mes notes en citant ses sources.

---

## Epic 1 : Fondations et accès

Je peux ouvrir LogMerry en ligne, me connecter en sécurité et voir mon cockpit (vide pour l'instant).

### Story 1.1 : Voir LogMerry en ligne

En tant que propriétaire, je veux ouvrir LogMerry à une adresse web, afin de savoir que le projet tourne.

**Critères d'acceptation :**

**Étant donné** le projet issu du template Supabase, **quand** je lance l'application, **alors** Next.js est en version 16.x épinglée et la page d'accueil du template est remplacée par une page « LogMerry » en français.
**Et** l'application est déployée sur Vercel et accessible par une adresse web.
**Et** la clé secrète du modèle d'IA n'est nulle part dans le code ; `.env.local` est ignoré par Git.

### Story 1.2 : Me connecter et me déconnecter

En tant que propriétaire, je veux me connecter avec e-mail et mot de passe, afin d'accéder à mes données.

**Critères d'acceptation :**

**Étant donné** un compte créé dans Supabase, **quand** je saisis e-mail et mot de passe corrects, **alors** j'arrive sur la zone privée ; un mauvais mot de passe affiche une erreur en français qui nomme le champ.
**Et** « Mot de passe oublié » envoie un e-mail de réinitialisation qui fonctionne.
**Et** après « Se déconnecter », ouvrir une page privée me renvoie à la connexion.
**Et** l'inscription publique est désactivée (pas de lien « créer un compte »).

### Story 1.3 : Voir mon cockpit vide dans la barre latérale

En tant que propriétaire connecté, je veux une zone privée avec barre latérale et un cockpit vide, afin de voir la structure de l'application.

**Critères d'acceptation :**

**Étant donné** que je suis connecté, **quand** j'ouvre l'application, **alors** je vois une barre latérale (Cockpit, Notes, Clients, Missions, Factures, Échéances, Paramètres, Réalisations, À faire) et la page « Aujourd'hui » avec un message de page vide.
**Et** la barre se replie en icônes ; la page courante est marquée par une barre et du gras, pas par la couleur seule.
**Et** le thème clair/sombre fonctionne ; la page a un seul titre `h1` et un lien « Aller au contenu ».
**Et** sans connexion, toute page privée redirige vers la connexion (vérifié côté serveur).

---

### Story 1.4 : Appliquer le thème LogMerry

*Ajoutée le 13 octobre 2026, après le sprint 6 : l'exigence UX-DR2 (jetons de `DESIGN.md`) n'était portée par aucune story ; l'application tournait sur les valeurs par défaut du gabarit.*

En tant que propriétaire, je veux que l'application porte les couleurs et la typographie choisies dans la conception, afin que tout écran construit ensuite parte des bons jetons.

**Critères d'acceptation :**

**Étant donné** `DESIGN.md`, **quand** j'ouvre l'application en mode clair puis sombre, **alors** les couleurs sont celles des jetons sémantiques (fond, texte, carte, primaire, accent, bordure, anneau de focus, états succès, avertissement, erreur) et les polices sont celles de `DESIGN.md` (Hanken Grotesk pour le texte, IBM Plex Mono pour les chiffres, Pixelify Sans pour les titres de bandeau en clair, Bricolage Grotesque pour le logotype). *Mise à jour du 17 octobre : le thème clair est « Arcade clair » (pixel art) et le sombre est le thème par défaut ; la police d'origine, Plus Jakarta Sans, n'est plus utilisée.*
**Et** les contrastes de texte sont de 4,5:1 au moins dans les deux thèmes pour les couples de jetons utilisés (vérifiés par un test automatique), et aucun état ne repose sur la couleur seule.
**Et** les pages existantes (connexion, cockpit, notes, paramètres, panneau de l'assistant) s'affichent correctement dans les deux thèmes, sans couleur écrite en dur hors des jetons.

## Epic 2 : Mes notes

J'écris et organise mes notes, je les retrouve par mots-clés, et je sais que mon compte est isolé des autres. Aucune IA ici.

### Story 2.1 : Créer et lister mes notes

En tant que propriétaire, je veux créer une note et voir la liste de mes notes, afin de commencer ma base de connaissances.

**Critères d'acceptation :**

**Étant donné** la table `notes` créée par une migration (avec `owner_id`, RLS, statut brouillon/actif), **quand** je crée une note avec un titre et du texte, **alors** elle apparaît dans la liste, du plus récent au plus ancien.
**Et** un titre vide est refusé avec un message clair.
**Et** sans note, la liste affiche une phrase d'explication et un bouton « Créer une note ».

### Story 2.2 : Modifier, classer et supprimer une note

En tant que propriétaire, je veux modifier, classer et supprimer mes notes, afin de les garder à jour.

**Critères d'acceptation :**

**Étant donné** une note existante, **quand** je la modifie et enregistre, **alors** le changement est visible après rechargement.
**Et** je peux la classer par type (note, procédure, modèle, FAQ) et filtrer la liste par type.
**Et** la suppression demande une confirmation, puis la note disparaît de la liste.

### Story 2.3 : Deux comptes fictifs ne se voient pas

En tant que propriétaire, je veux vérifier que deux comptes ne voient pas les données de l'autre, afin d'avoir confiance dans l'isolation.

**Critères d'acceptation :**

**Étant donné** deux comptes fictifs « démo A » et « démo B » créés dans Supabase, **quand** A crée une note, **alors** B ne la voit ni dans sa liste ni en ouvrant son adresse directe.
**Et** un script de test (à rejouer après chaque migration) confirme que B ne peut ni lire, ni modifier, ni supprimer la note de A.
**Et** le résultat est noté dans `docs/journal.md`.

### Story 2.4 : Rechercher dans mes notes avec ⌘K

En tant que propriétaire, je veux ouvrir une palette de recherche avec ⌘K, afin de retrouver vite une note.

**Critères d'acceptation :**

**Étant donné** plusieurs notes, **quand** j'appuie sur ⌘K (ou clique sur « Rechercher ») et tape un mot, **alors** les notes qui le contiennent s'affichent et Entrée ouvre celle choisie.
**Et** une recherche sans résultat affiche « Aucun résultat ».
**Et** la recherche ne montre jamais les notes d'un autre compte.
**Et** Esc ferme la palette et rend le focus à l'endroit précédent.

---

## Epic 3 : Clients et missions

Je suis mes prospects, mes clients, mes missions découpées en étapes, et mes devis.

### Story 3.1 : Gérer mes prospects et clients

En tant que propriétaire, je veux créer et lister mes prospects et clients, afin de savoir à qui j'ai affaire.

**Critères d'acceptation :**

**Étant donné** la table `clients` créée par une migration (RLS, statut, étiquette d'origine), **quand** je crée une fiche avec un nom et une origine, **alors** elle apparaît dans un tableau triable.
**Et** je peux filtrer par statut (prospect, client) et par origine (client réel, formation, ami, démo).
**Et** le nom et l'origine sont les seuls champs obligatoires.

### Story 3.2 : Ajouter des contacts et passer un prospect en client

En tant que propriétaire, je veux ajouter des contacts à une fiche et transformer un prospect en client, afin de ne pas ressaisir.

**Critères d'acceptation :**

**Étant donné** une fiche prospect, **quand** j'ajoute un contact (nom, e-mail facultatif), **alors** il apparaît sur la fiche.
**Et** « Passer en client » change le statut sans perdre les contacts.
**Et** un contact ne peut pas exister sans fiche rattachée.

### Story 3.3 : Lier une note à un client ou un prospect

En tant que propriétaire, je veux lier une note à une fiche depuis l'éditeur, afin de retrouver mes notes de rendez-vous.

**Critères d'acceptation :**

**Étant donné** l'éditeur de note, **quand** je remplis « Lié à », **alors** je peux choisir une fiche existante ; la note apparaît aussi sur la fiche.
**Et** si la fiche n'existe pas, je peux la créer sur place (nom + origine) après avoir vu les fiches proches.
**Et** quand le prospect devient client, la note reste liée.

### Story 3.4 : Créer des missions

En tant que propriétaire, je veux créer une mission pour un client, afin de suivre mon travail.

**Critères d'acceptation :**

**Étant donné** la table `missions` créée par une migration (RLS), **quand** je crée une mission avec un client et un titre, **alors** elle apparaît dans la liste des missions et sur la fiche du client.
**Et** client et titre sont les seuls champs obligatoires.
**Et** je peux modifier ou supprimer la mission après confirmation.

### Story 3.5a : Backlog et user stories d'une mission

*(Remplace l'ancienne story 3.5 « étapes datées » : décision d'Alex du 2026-10-16, il veut le vocabulaire et la méthode agile.)*

En tant que propriétaire, je veux tenir le backlog d'une mission sous forme de user stories priorisées, afin de savoir ce qu'il reste à faire pour mon client.

**Critères d'acceptation :**

**Étant donné** la table `user_stories` créée par une migration (RLS), **quand** j'ajoute une user story à une mission (titre obligatoire ; rôle, bénéfice, critères d'acceptation et points facultatifs), **alors** elle apparaît dans le backlog de la mission, à la dernière place.
**Et** je peux la monter ou la descendre dans le backlog (la priorité), la modifier et la supprimer après confirmation.
**Et** chaque story a un statut (à faire, en cours, terminée) et la mission affiche sa progression (ex. 2 sur 5 stories terminées).

### Story 3.5b : Tâches d'une user story

En tant que propriétaire, je veux découper une user story en tâches, afin de savoir quoi faire concrètement.

**Critères d'acceptation :**

**Étant donné** la table `tasks` créée par une migration (RLS), **quand** j'ajoute une tâche à une story (titre obligatoire), **alors** elle s'affiche sous la story ; je peux la cocher, la modifier, la supprimer et la réordonner.
**Et** la story affiche l'avancement de ses tâches (ex. 3 sur 4) sans changer son statut tout seule.

### Story 3.5c : Sprints

En tant que propriétaire, je veux planifier des sprints et y placer des stories du backlog, afin de livrer par périodes courtes avec un objectif.

**Critères d'acceptation :**

**Étant donné** la table `sprints` créée par une migration (RLS), **quand** je crée un sprint (nom, objectif en une phrase, date de début, date de fin), **alors** je peux y placer des stories du backlog ou les en retirer ; une story n'est que dans un sprint à la fois.
**Et** un seul sprint est « en cours » par mission ; je peux le démarrer et le clore ; à la clôture, les stories non terminées retournent au backlog ou passent au sprint suivant (mon choix).
**Et** la page d'une mission montre le sprint en cours, son avancement et le reste du backlog ; la fin ne peut pas précéder le début.
**Et** une story se glisse d'une liste à l'autre (backlog, sprint planifié, sprint en cours) à la souris, au toucher et au clavier avec annonces ; le menu « Sprint » de la story reste l'équivalent clavier et lecteur d'écran (ajouté le 17 octobre).
**Et** à la création, le nom du sprint est prérempli (« Sprint 1 », « Sprint 2 »… par mission, numéro calculé côté serveur) et modifiable ; le cockpit affichera toujours « Client / Mission / Sprint X » (stories 5.x) (ajouté le 18 octobre).
**Et** un sprint clos est figé : aucune story n'y entre ni n'en sort, côté écran, côté serveur et côté base ; son nom et son objectif restent modifiables ; le supprimer renvoie ses stories au backlog, à la suite, dans leur ordre.

### Story 3.6 : Suivre mes devis

*Réécrite le 18 octobre 2026 (montants hors taxe et taxe, acceptation en une action, mission créée automatiquement : PRD FR-22, architecture AD-4 et AD-8).*

En tant que propriétaire, je veux enregistrer un devis et son statut, afin de savoir lesquels attendent une réponse et d'ouvrir ma mission quand il est accepté.

**Critères d'acceptation :**

**Étant donné** la table `quotes` créée par une migration (RLS, `client_id` obligatoire, `mission_id` facultatif, montants en centimes), **quand** je crée un devis (montant hors taxe, montant de taxe, date d'envoi, rattaché à un client ou prospect et, si elle existe, à une mission), **alors** son statut est « envoyé » par défaut.
**Et** un devis sans montant hors taxe ou sans date d'envoi est refusé ; une taxe inconnue reste vide, jamais 0 ; aucun document de devis n'est produit.
**Et** je peux le passer en « refusé » : il disparaît des alertes du cockpit.
**Et** « accepté » est **une seule action, tout ou rien** (fonction `accept_quote`) : pour un devis lié à un prospect, le prospect devient client et une mission « en cours » est créée automatiquement (client du devis, titre « Devis du JJ/MM/AAAA — Nom du client » avec la date d'envoi, modifiable ensuite) et rattachée au devis ; pour un devis lié à une mission existante, rien d'autre ne change.
**Et** accepter deux fois le même devis (double clic, deux onglets) ne crée qu'une seule mission, et aucun autre chemin ne peut passer un devis en « accepté » (la base le refuse).
**Et** un devis accepté ne change plus de statut (pour corriger, on crée un nouveau devis).
**Et** le test d'isolation couvre les devis (un autre compte ne les voit ni ne les modifie, ni ne les rattache à ma fiche).

### Story 3.7 : Rechercher aussi clients et missions

En tant que propriétaire, je veux que ⌘K trouve aussi mes clients et missions, afin d'avoir une seule recherche.

**Critères d'acceptation :**

**Étant donné** des clients et des missions, **quand** je cherche un mot dans ⌘K, **alors** les résultats sont groupés (Notes, Clients, Missions).
**Et** Entrée sur un résultat ouvre la bonne page.
**Et** aucun résultat d'un autre compte n'apparaît.

---

## Epic 4 : Factures et finances

Je suis mes factures et mes encaissements, et je vois où j'en suis par rapport à mon plafond, avec des chiffres étiquetés « estimation ».

### Story 4.1 : Renseigner mes paramètres

En tant que propriétaire, je veux saisir mes paramètres (plafond, taux, dates) avec leur source et leur date de vérification, afin qu'aucun chiffre ne soit écrit en dur.

**Critères d'acceptation :**

**Étant donné** la table `parameters` créée par une migration (RLS), **quand** je saisis un paramètre avec valeur, unité, source et date de vérification, **alors** il apparaît dans la page Paramètres.
**Et** un paramètre sans source ou sans date est refusé.
**Et** un paramètre dont la date de revérification est dépassée est signalé (icône + texte).
**Et** aucune valeur fiscale n'est préremplie.

### Story 4.2 : Enregistrer mes factures

En tant que propriétaire, je veux enregistrer mes factures (payée ou non, date d'échéance), afin de savoir lesquelles relancer.

**Critères d'acceptation :**

**Étant donné** la table `invoices` créée par une migration (RLS, montant en centimes), **quand** je crée une facture liée à une mission avec montant et date d'échéance, **alors** elle apparaît dans la liste avec son statut.
**Et** je peux filtrer « non payées » et « échues ».
**Et** ce n'est pas une facture légale : un texte le rappelle.

### Story 4.3 : Enregistrer un encaissement

En tant que propriétaire, je veux marquer une facture payée en saisissant l'encaissement, afin que mes calculs reposent sur de l'argent réellement reçu.

**Critères d'acceptation :**

**Étant donné** une facture non payée, **quand** je saisis un encaissement (montant, date), **alors** la facture passe en « payée » (ou « partiellement payée ») et l'encaissement est listé.
**Et** un encaissement sans montant ou sans date est refusé.
**Et** le montant s'affiche en euros avec deux décimales (stocké en centimes).

### Story 4.4 : Voir ma position par rapport au plafond

En tant que propriétaire, je veux voir mes encaissements cumulés comparés au plafond, afin de savoir où j'en suis.

**Critères d'acceptation :**

**Étant donné** un paramètre « plafond » et des encaissements, **quand** j'ouvre la page Finances, **alors** je vois une jauge avec le cumul, le plafond, un marqueur à 90 % et l'étiquette « estimation » avec la source et la date du plafond.
**Et** sans plafond, la jauge affiche « paramètre manquant : plafond non renseigné » avec un lien vers Paramètres, jamais un chiffre.
**Et** le calcul est une fonction pure de `lib/domain/` testée sur au moins 3 cas de référence calculés à la main.

### Story 4.5 : Voir une estimation de cotisations

En tant que propriétaire, je veux une estimation de mes cotisations à partir de mes encaissements, afin d'anticiper.

**Critères d'acceptation :**

**Étant donné** un taux de cotisation en paramètre et des encaissements, **quand** j'ouvre Finances, **alors** je vois un montant étiqueté « estimation » avec les paramètres utilisés et leurs dates.
**Et** si un paramètre manque ou est périmé, aucun calcul n'est affiché et « paramètre manquant » apparaît.
**Et** la fonction de calcul passe au moins 6 cas de référence calculés à la main, dont prorata de première année, fin de l'ACRE et bascule de TVA.
**Et** une modification d'un paramètre est prise en compte au calcul suivant.

---

## Epic 5 : Échéances et cockpit « Aujourd'hui »

Le cockpit me dit quoi faire aujourd'hui et pourquoi.

### Story 5.1 : Enregistrer mes échéances

En tant que propriétaire, je veux enregistrer mes échéances administratives avec leur date et leur source, afin de ne rien rater.

**Critères d'acceptation :**

**Étant donné** la table `deadlines` créée par une migration (RLS), **quand** je crée une échéance avec titre, date et source, **alors** elle apparaît dans la liste triée par date.
**Et** une échéance sans date ou sans source est refusée.
**Et** je peux la modifier, la marquer faite ou la supprimer.

### Story 5.2 : Voir mes tâches du jour (échéances et factures échues)

En tant que propriétaire, je veux voir sur le cockpit les tâches du jour avec leur motif, afin de savoir quoi faire en premier.

**Critères d'acceptation :**

**Étant donné** une échéance à J-3 et une facture échue à J+1, **quand** j'ouvre le cockpit, **alors** deux tâches s'affichent avec leur motif (« échéance dans 3 jours », « facture échue depuis 1 jour »), dans l'ordre de priorité des règles 1 puis 2.
**Et** cocher une tâche la barre, la réordonne et l'annonce aux lecteurs d'écran ; décocher est possible.
**Et** quand tout est fait, « Bravo, tu as fait toutes tes tâches du jour. » s'affiche.
**Et** les règles sont des fonctions pures testées ; aucune règle ne passe par l'IA.

### Story 5.3 : Tâches liées au plafond et à l'ACRE

En tant que propriétaire, je veux être alerté à 90 % du plafond et un mois avant la fin de l'ACRE, afin d'anticiper.

**Critères d'acceptation :**

**Étant donné** des encaissements à 90 % du plafond, **quand** j'ouvre le cockpit, **alors** une tâche de règle 3 apparaît avec son motif.
**Et** étant donné une date de fin d'ACRE à un mois, une tâche de règle 4 apparaît.
**Et** si le paramètre manque, la règle s'affiche « paramètre manquant » au lieu d'être ignorée.

### Story 5.4 : Tâches « devis sans réponse » et « pipeline vide »

En tant que propriétaire, je veux être alerté quand un devis ou un prospect dort 7 jours, ou quand mon pipeline se vide, afin de relancer.

**Critères d'acceptation :**

**Étant donné** un devis « envoyé » sans mise à jour depuis 7 jours, **quand** j'ouvre le cockpit, **alors** une tâche de règle 5 apparaît ; un devis « accepté » ou « refusé » n'en déclenche pas.
**Et** avec moins de deux missions ou prospects planifiés le mois suivant, une tâche de règle 6 apparaît.
**Et** l'ordre final suit les règles 1 à 6, puis la date la plus proche ; aucun e-mail n'est envoyé.

### Story 5.5 : Voir mon CA encaissé et ma jauge sur le cockpit

En tant que propriétaire, je veux voir le CA encaissé et la jauge de plafond sur le cockpit, afin d'avoir tout au même endroit.

**Critères d'acceptation :**

**Étant donné** des encaissements et un plafond, **quand** j'ouvre le cockpit, **alors** je vois le CA encaissé et la jauge, avec les mêmes chiffres que la page Finances (même fonction de calcul).
**Et** chaque estimation porte l'étiquette « estimation » ; un paramètre absent affiche « paramètre manquant ».
**Et** après avoir enregistré un encaissement, le cockpit est à jour à mon retour, sans bouton d'actualisation.

### Story 5.6 : Écran « À faire » et ligne de synthèse

En tant que propriétaire, je veux un écran « À faire » listant mes notes brouillons à rédiger, afin de ne pas les oublier.

**Critères d'acceptation :**

**Étant donné** des notes au statut brouillon, **quand** j'ouvre « À faire », **alors** je les vois listées ; cliquer sur l'une ouvre l'éditeur.
**Et** sous les tâches du cockpit s'affiche « 2 procédures à documenter » (lien vers « À faire »), au singulier pour 1, masquée à 0 ; ce n'est pas une tâche.
**Et** une note brouillon vide n'est jamais envoyée à l'IA (aucun appel IA dans cette story).

---

## Epic 6 : Réalisations et portfolio public

Je publie mes réalisations, avec l'accord du client, sur une page publique en lecture seule.

### Story 6.1 : Gérer mes réalisations

En tant que propriétaire, je veux créer mes réalisations, afin de préparer mon portfolio.

**Critères d'acceptation :**

**Étant donné** la table `realisations` créée par une migration (RLS), **quand** je crée une réalisation avec titre, description courte et étiquette d'origine, **alors** elle est enregistrée comme non publiée.
**Et** captures, stack en étiquettes, chiffre de résultat et nom du client sont facultatifs.
**Et** je peux la modifier ou la supprimer.

### Story 6.2 : Publier avec l'accord du client

En tant que propriétaire, je veux publier une réalisation seulement si le client a donné son accord, afin de respecter ses droits.

**Critères d'acceptation :**

**Étant donné** une réalisation sans accord coché, **quand** je clique sur « Publier », **alors** la publication est bloquée avec un message clair.
**Et** avec l'accord coché, elle passe en « publiée » ; le chiffre de résultat n'est publiable qu'avec l'accord.
**Et** sans accord, le nom du client est remplacé par « Client, secteur X ».

### Story 6.3 : Voir le portfolio public

En tant que visiteur, je veux ouvrir une page publique sans me connecter, afin de découvrir les réalisations.

**Critères d'acceptation :**

**Étant donné** des réalisations publiées et non publiées, **quand** j'ouvre `/portfolio` sans connexion, **alors** je ne vois que les publiées, avec leur étiquette d'origine, en lecture seule et en vouvoiement.
**Et** la page lit uniquement la vue `public_realisations` ; aucune donnée privée n'apparaît.
**Et** chaque capture publiée a un texte alternatif (obligatoire à la publication) ; le contact se fait par un lien « m'écrire » (`mailto:`).
**Et** sans réalisation publiée, un message sobre s'affiche ; la page est lisible sur téléphone.

---

## Epic 7 : Application complète et démontrable

Toute l'application fonctionne et se montre, avec des données fictives (notes de démo indexées comprises).

### Story 7.1 : Données de démonstration fictives

En tant que propriétaire, je veux un compte de démonstration rempli de données fictives étiquetées, afin de montrer l'application sans données réelles.

**Critères d'acceptation :**

**Étant donné** le compte de démo, **quand** je me connecte, **alors** je vois des notes, clients, missions, devis, factures, échéances et réalisations fictifs.
**Et** chaque fiche client est étiquetée « démo ».
**Et** le cockpit du compte de démo affiche des tâches avec motif ; le compte B n'en voit aucune.

### Story 7.2 : Accessibilité des parcours principaux

En tant que propriétaire, je veux que les parcours principaux marchent au clavier, afin de respecter le niveau WCAG 2.1 AA.

**Critères d'acceptation :**

**Étant donné** les parcours UJ-1, UJ-4 et UJ-5, **quand** je les fais au clavier seul, **alors** je peux tout faire, avec un focus toujours visible.
**Et** les contrastes (clair et sombre) sont conformes (texte 4,5:1) ; aucun état ne repose sur la couleur seule.
**Et** chaque formulaire a des libellés associés et un récapitulatif d'erreurs en tête.

### Story 7.3 : Sauvegarde vérifiée

En tant que propriétaire, je veux une sauvegarde de ma base vérifiée, afin de pouvoir revenir en arrière.

**Critères d'acceptation :**

**Étant donné** la base de démonstration, **quand** je lance la sauvegarde documentée, **alors** j'obtiens un fichier de sauvegarde.
**Et** je l'ai restauré une fois dans une base de test, ce qui est noté dans `docs/journal.md`.
**Et** la marche à suivre pour la purge avant les vraies données est écrite (embeddings et historique inclus).

### Story 7.4 : Parcours de démo complet

En tant que propriétaire, je veux dérouler un parcours de démonstration complet, afin de vérifier que toute l'application marche de bout en bout.

**Critères d'acceptation :**

**Étant donné** le compte de démo, **quand** je fais connexion → client → note → question à l'assistant avec source → mission → facture → encaissement → cockpit → portfolio, **alors** tout fonctionne sans erreur.
**Et** le test d'isolation à deux comptes (story 2.3) est rejoué sur toutes les tables et réussit.
**Et** les pages courantes s'affichent en moins de 3 secondes.

---

## Epic 8 : Assistant IA et RAG

L'assistant répond à partir de mes notes en citant des sources vérifiées, et refuse proprement quand il ne sait pas. Il est livré en premier après les fondations (jalon du 30 octobre), en quatre temps : préparation des données, recherche, réponse avec sources, qualité. Les stories 8.12 (garde-fous sur les estimations) et 8.13 (résumé) viennent plus tard car elles dépendent des finances ou du reste du MVP.

### Story 8.1 : Préparer le serveur pour l'IA

En tant que propriétaire, je veux configurer l'accès au modèle d'IA côté serveur, afin qu'aucune clé n'arrive au navigateur.

**Critères d'acceptation :**

**Étant donné** les variables `ANTHROPIC_API_KEY`, `MISTRAL_API_KEY` et `AI_CHAT_MODEL` dans Vercel et `.env.local`, **quand** je construis l'application, **alors** `lib/ai/` est marqué `server-only` et le build échoue si un composant client l'importe.
**Et** une migration active l'extension `pgvector` et crée `note_chunks` (`vector(1024)`, RLS, `embedding_model`).
**Et** aucune clé n'apparaît dans le code ni dans un commit.

### Story 8.2 : Découper une note en extraits

En tant que propriétaire, je veux que mes notes soient découpées en extraits, afin que l'IA retrouve le bon passage.

**Critères d'acceptation :**

**Étant donné** une note longue, **quand** la fonction de découpage s'exécute, **alors** elle produit des extraits avec un chevauchement.
**Et** une note vide ou brouillon vide produit zéro extrait.
**Et** la fonction est pure (`lib/domain/`) et couverte par des tests.

### Story 8.3 : Indexer une note à l'enregistrement

En tant que propriétaire, je veux que ma note soit vectorisée quand je l'enregistre, afin qu'elle soit retrouvable par sens.

**Critères d'acceptation :**

**Étant donné** une note avec du contenu, **quand** je l'enregistre, **alors** ses anciens extraits sont remplacés par de nouveaux, avec embeddings (`mistral-embed`).
**Et** si l'IA est en panne, la note est quand même enregistrée avec l'état « échec d'indexation » et un bouton « Réessayer ».
**Et** un état « indexée / en attente / échec » est visible sur la note.

### Story 8.4 : Indexer mes notes existantes

En tant que propriétaire, je veux indexer toutes mes notes déjà écrites, afin de ne pas les recopier.

**Critères d'acceptation :**

**Étant donné** des notes créées avant l'IA, **quand** je clique sur « Indexer mes notes » dans Paramètres, **alors** chaque note non brouillon vide est indexée et un compteur indique le résultat.
**Et** relancer le bouton ne duplique aucun extrait.
**Et** seules mes notes sont indexées.

### Story 8.5 : Retrouver les passages pertinents (fonction de recherche)

En tant que propriétaire, je veux que la base retrouve les extraits proches d'une question, afin d'alimenter l'assistant.

**Critères d'acceptation :**

**Étant donné** des extraits indexés, **quand** la fonction `match_chunks` reçoit une question vectorisée, **alors** elle renvoie les extraits les plus proches au-dessus d'un seuil de similarité.
**Et** elle filtre par `owner_id` (en plus de la RLS) et n'est pas `security definer`.
**Et** sans extrait au-dessus du seuil, elle renvoie une liste vide.

### Story 8.6 : Chercher par sens dans mes notes

En tant que propriétaire, je veux une recherche « par sens » dans mes notes, afin de vérifier ce que l'IA retrouve avant de lui parler.

**Critères d'acceptation :**

**Étant donné** des notes indexées, **quand** je saisis une question dans « Chercher par sens » (page Notes), **alors** je vois les extraits retrouvés avec la note d'origine et leur score.
**Et** une question sans passage pertinent affiche « Aucun passage trouvé ».
**Et** la recherche par mots-clés de ⌘K reste inchangée.

### Story 8.7 : La recherche ne fuit pas entre comptes

En tant que propriétaire, je veux vérifier que la recherche par sens ne montre rien d'un autre compte, afin de garder mes notes privées.

**Critères d'acceptation :**

**Étant donné** deux comptes fictifs ayant chacun des notes indexées, **quand** B cherche un sujet qui n'existe que chez A, **alors** B ne reçoit aucun extrait.
**Et** le test est scripté et noté dans `docs/rag-tests.md`.
**Et** un seul extrait d'un autre compte fait échouer le test.

### Story 8.8 : Poser une question à l'assistant

En tant que propriétaire, je veux ouvrir un panneau et poser une question, afin d'obtenir une réponse tirée de mes notes.

**Critères d'acceptation :**

**Étant donné** des notes indexées, **quand** j'ouvre le panneau (bouton ou entrée « Demander à l'assistant » dans ⌘K) et envoie une question, **alors** le texte « Recherche dans tes notes… » s'affiche pendant l'attente puis une réponse rédigée par Claude à partir des extraits retrouvés.
**Et** le panneau est non modal, pousse la page à droite, et le focus va au champ de saisie à l'ouverture.
**Et** l'appel passe par `app/api/chat`, côté serveur ; la réponse est affichée en entier (pas de flux).
**Et** en cas d'erreur, un message avec « Réessayer » apparaît et ma saisie est conservée.

### Story 8.9 : Citations vérifiées et sources cliquables

En tant que propriétaire, je veux que chaque réponse cite ses sources vérifiées, afin de pouvoir m'y fier.

**Critères d'acceptation :**

**Étant donné** une réponse de Claude au format `{ answer, citations }`, **quand** une citation désigne un extrait qui n'a pas été envoyé au modèle, **alors** la réponse est rejetée et jamais affichée.
**Et** les sources valides s'affichent sous la réponse en puces cliquables ; « Ouvrir » affiche la note, « Copier le texte » copie l'extrait lu en base (pas celui écrit par le modèle).
**Et** une réponse chiffrée n'utilise que les résultats de calcul fournis, jamais un chiffre inventé.

### Story 8.10 : Retrouver mon historique

En tant que propriétaire, je veux que mes échanges soient conservés, afin de les relire.

**Critères d'acceptation :**

**Étant donné** des échanges, **quand** je me déconnecte puis me reconnecte, **alors** l'historique réapparaît dans l'ordre, avec les citations cliquables.
**Et** si une note citée a été supprimée, la citation affiche « source supprimée ».
**Et** un autre compte ne voit jamais cet historique.

### Story 8.11 : Dire « je ne trouve pas » et créer une note à documenter

En tant que propriétaire, je veux que l'assistant refuse d'inventer et me laisse noter le sujet, afin de combler mes trous de documentation.

**Critères d'acceptation :**

**Étant donné** une question sans extrait assez proche, **quand** je l'envoie, **alors** l'assistant répond « Je n'ai trouvé aucune procédure documentée correspondant à cette requête. » **sans appeler le modèle**.
**Et** le bouton « Créer une note à documenter plus tard » crée une note brouillon titrée d'après la question, visible dans la liste des notes (filtre « brouillon ») ; l'écran « À faire » arrive en story 5.6.
**Et** cette note brouillon vide n'est pas indexée et ne peut pas être citée ; la conversation reste ouverte.

### Story 8.12 : Garde-fous et explication des estimations

En tant que propriétaire, je veux que l'assistant refuse le conseil fiscal ou juridique et explique mes estimations, afin de rester dans le cadre.

**Critères d'acceptation :**

**Étant donné** une demande d'optimisation fiscale ou de conseil juridique, **quand** je l'envoie, **alors** l'assistant refuse avec un message chaleureux qui renvoie vers un comptable ou un juriste.
**Et** « Explique cette estimation » affiche les paramètres, leurs sources et leurs dates, sans recommandation.
**Et** si je cite un montant facturé, l'assistant le signale et demande l'encaissement réel.

### Story 8.13 : Résumé automatique d'une note

En tant que propriétaire, je veux demander un résumé d'une note, afin de la relire vite.

**Critères d'acceptation :**

**Étant donné** une de mes notes, **quand** je clique sur « Résumer », **alors** un résumé étiqueté « résumé généré » s'affiche avec un lien vers la note source.
**Et** je peux « Régénérer » ou « Ignorer » ; le résumé n'est jamais enregistré à la place de la note.
**Et** le résumé n'utilise que le contenu de cette note ; il est impossible sur la note d'un autre compte.

### Story 8.14 : Jeu de test du RAG et score

En tant que propriétaire, je veux un jeu de 15 à 20 questions avec la source attendue, afin de mesurer la qualité de l'assistant.

**Critères d'acceptation :**

**Étant donné** `docs/rag-tests.md`, **quand** je pose les 15 à 20 questions (réponse présente, réponse absente, piège inter-comptes), **alors** je note pour chacune : bon extrait retrouvé ? réponse fidèle à la source ?
**Et** le score est calculé par rapport au seuil cible de 18 sur 20.
**Et** trois exécutions datées sont enregistrées pour montrer l'amélioration, avec le modèle Claude utilisé.

### Story 8.15 : Test de fuite sur l'assistant et l'historique

En tant que propriétaire, je veux vérifier que l'assistant ne fuit rien entre comptes, afin de valider la sécurité de bout en bout.

**Critères d'acceptation :**

**Étant donné** deux comptes fictifs avec notes et historiques, **quand** B pose une question dont la réponse n'est que chez A, **alors** B reçoit « je ne trouve pas » et aucune source de A.
**Et** l'historique et les citations de A ne sont ni lisibles ni appelables par B.
**Et** le résultat est noté dans `docs/rag-tests.md` et `docs/journal.md` ; une seule fuite bloque la livraison.

### Story 8.16 : Générer un backlog avec l'IA

En tant que propriétaire, je veux coller un brief ou choisir des notes de rendez-vous et obtenir des user stories proposées, afin de gagner du temps de conception.

**Critères d'acceptation :**

**Étant donné** une mission, **quand** je donne un texte (ou je choisis des notes liées à son client), **alors** l'IA propose des user stories (« En tant que… je veux… afin de… », critères d'acceptation, points suggérés) que je relis ; rien n'est enregistré avant que je valide chaque proposition (garder, modifier, rejeter).
**Et** l'IA ne reçoit que mon texte, la mission, le backlog existant et les extraits de mes notes liées au client (jamais ceux d'un autre compte) ; les extraits partent chez Anthropic : la mention RGPD s'applique.
**Et** les stories proposées citent la note d'où elles viennent quand il y en a une ; aucun conseil fiscal ou juridique.

### Story 8.17 : Découper une story en tâches avec l'IA

En tant que propriétaire, je veux que l'IA propose des tâches pour une user story, afin de ne rien oublier.

**Critères d'acceptation :**

**Étant donné** une user story, **quand** je demande de la découper, **alors** l'IA propose des tâches que je valide une à une ; rien n'est ajouté sans mon accord, et les tâches existantes ne sont pas dupliquées.
**Et** les tâches sont proposées **dans un ordre logique de réalisation**, déduites de la story (rôle, bénéfice, critères d'acceptation) et de la note d'origine si elle existe ; une fois gardées, elles se réordonnent comme les autres.

### Story 8.17b : Tâches proposées avec les stories du backlog

*Séparée de la 8.17 le 17 octobre 2026 : ce critère n'était pas livré avec la 8.17.*

En tant que propriétaire, je veux que les stories proposées par l'IA arrivent avec leurs tâches, afin de ne pas relancer un découpage story par story.

**Critères d'acceptation :**

**Étant donné** des user stories proposées par la 8.16, **quand** je garde une proposition, **alors** la story et ses tâches proposées sont ajoutées ensemble ; les tâches sont modifiables et supprimables avant d'être gardées, et dans un ordre logique de réalisation.
**Et** les règles de la 8.17 s'appliquent (rien n'est enregistré sans mon accord, pas de doublon, un chiffre absent des sources fait écarter la proposition) ; l'ajout de la story et de ses tâches est tout ou rien.

### Story 8.18 : Relire et améliorer une story avec l'IA

En tant que propriétaire, je veux que l'IA critique une user story, afin de la rendre plus claire.

**Critères d'acceptation :**

**Étant donné** une user story, **quand** je demande une relecture, **alors** l'IA signale ce qui ne va pas (trop grosse, floue, critères manquants, bénéfice absent) et propose une reformulation que je peux appliquer ou ignorer.

### Story 8.19 : Composer un sprint avec l'IA

En tant que propriétaire, je veux que l'IA propose le contenu d'un sprint, afin de planifier sans partir d'une page blanche.

**Critères d'acceptation :**

**Étant donné** un backlog avec des points et un sprint à planifier, **quand** je demande une proposition, **alors** l'IA suggère des stories à y placer (selon la priorité, les points et la durée du sprint) et un objectif en une phrase ; je valide, modifie ou ignore, et rien n'est placé sans mon accord.

### Story 8.20 : Ordonner le backlog avec l'IA

En tant que propriétaire, je veux que l'IA propose un ordre logique pour mon backlog, afin de commencer par ce qui doit venir en premier.

**Critères d'acceptation :**

**Étant donné** un backlog de plusieurs stories, **quand** je clique sur « Proposer un ordre logique », **alors** l'IA propose un nouvel ordre (dépendances d'abord, socle avant confort) avec une phrase de raison par story déplacée ; j'applique, je modifie ou j'ignore, et rien n'est réordonné sans mon accord.
**Et** une story qui apparaît ou disparaît pendant la proposition fait refuser l'application (l'ordre se recalcule).

### Story 8.21 : Générer un prompt depuis une mission

En tant que propriétaire, je veux générer un prompt à partir de ma mission, de son backlog, de ses stories et de ses tâches, afin de confier le travail à Claude (ou à un autre assistant) avec la meilleure consigne possible.

**Critères d'acceptation :**

**Étant donné** une mission, **quand** je choisis le niveau de contexte (mission seule, backlog, stories détaillées, tâches), la cible (Claude, Claude Code, n8n par son MCP, autre) et un objectif facultatif, **alors** l'IA rédige la consigne et le code y ajoute le contexte tel quel ; je relis dans un champ modifiable et je copie ; rien n'est enregistré.
**Et** le nom du client peut être retiré, les notes ne sont jamais envoyées, et une consigne qui contient un chiffre absent des sources est écartée.

---

## Plan des sprints

Un sprint = 3 à 4 stories, un objectif en une phrase, et une version qui marche que tu peux montrer. Les sprints 1 à 6 forment la tranche RAG du jalon du 30 octobre 2026 (PRD §7.2). Ordre ensuite : PRD §7.3.

| Sprint | Objectif | Stories | Type |
| --- | --- | --- | --- |
| 1 | Poser les fondations : l'application est en ligne, je m'y connecte et je vois ma première page. | 1.1, 1.2, 1.3 | Standard |
| 2 | Écrire et retrouver mes notes, avec deux comptes bien isolés. | 2.1, 2.2, 2.3, 2.4 | Standard |
| 3 | Préparer les données pour l'IA : serveur, découpage, embeddings, indexation. | 8.1, 8.2, 8.3, 8.4 | IA |
| 4 | Retrouver les passages pertinents de mes notes, sans fuite entre comptes. | 8.5, 8.6, 8.7 | IA |
| 5 | Poser une question à l'assistant et obtenir une réponse avec sources vérifiées, conservée dans l'historique. | 8.8, 8.9, 8.10 | IA |
| 6 | Clore le jalon du 30 octobre : refus « je ne trouve pas », jeu de test et test de fuite. | 8.11, 8.14, 8.15 | IA |
| 7 | Résumer une note et suivre mes prospects et clients. | 8.13, 3.1, 3.2, 3.3 | IA + standard |
| 8 | Suivre mes missions en agile (backlog, tâches, sprints), mes devis, et tout chercher avec ⌘K. | 3.4, 3.5a, 3.5b, 3.5c, 3.6, 3.7 | Standard |
| 8b | Concevoir mes missions avec l'IA : backlog, tâches, relecture, sprint, ordre. | 8.16, 8.17, 8.17b, 8.18, 8.19, 8.20, 8.21 | IA |
| 9 | Enregistrer mes paramètres, mes factures et mes encaissements. | 4.1, 4.2, 4.3 | Standard |
| 10 | Voir mon plafond, mes cotisations estimées, faire expliquer mes estimations à l'assistant, et saisir mes échéances. | 4.4, 4.5, 8.12, 5.1 | Standard + IA |
| 11 | Avoir un cockpit « Aujourd'hui » qui me dit quoi faire et pourquoi. | 5.2, 5.3, 5.4, 5.5 | Standard |
| 12 | Lister ce qu'il reste à documenter et publier mon portfolio public. | 5.6, 6.1, 6.2, 6.3 | Standard |
| 13 | Montrer toute l'application : démo, accessibilité, sauvegarde. | 7.1, 7.2, 7.3, 7.4 | Standard |

## Hypothèses à confirmer

- Décision de l'auteur (2026-10-13) : l'ordre du PRD fait foi (RAG d'abord, jalon du 30 octobre 2026).
- [ASSUMPTION] **Durée d'un sprint** : l'auteur pense avancer plus vite que prévu ; à fixer dès le sprint 1. Le jalon du 30 octobre demande 6 sprints en 17 jours, soit environ 3 jours par sprint ; à défaut, le sprint 6 (jeu de test et test de fuite) glisse après le 30 octobre.
- [ASSUMPTION] Les notes (Epic 2) existent avant l'IA ; l'indexation est branchée en 8.3 (sprint 3), donc FR-3 est livré en deux temps.
- [ASSUMPTION] FR-21 est coupé en deux : bouton « Créer une note à documenter plus tard » au sprint 6 (8.11), écran « À faire » et ligne de synthèse au sprint 12 (5.6). Entre les deux, les brouillons se retrouvent par un filtre dans la liste des notes.
- [ASSUMPTION] FR-12 (garde-fous) est placé au sprint 10, avec les finances, car il explique les estimations.
- [ASSUMPTION] Les cas de référence des calculs (4.4 et 4.5) sont fournis par l'auteur et vérifiés à la source avant le code (PRD §9.5).
- [ASSUMPTION] Pas de story pour Vercel Pro, provisions détaillées, dépenses, n8n, import de fichiers, formulaire de contact (hors MVP).
- [ASSUMPTION] Les comptes « démo A » et « démo B » sont créés à la main dans Supabase pendant le sprint 2 ; les notes fictives servant au jeu de test RAG sont écrites avant le sprint 6.
