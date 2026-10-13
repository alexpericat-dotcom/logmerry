---
title: LogMerry
status: final
created: 2026-10-10
updated: 2026-10-13
---

# PRD : LogMerry
*Nom de code. Le nom public reste à définir.*

## 0. Objet du document
Ce PRD s'adresse à l'auteur, à son tuteur (Richard) et aux étapes BMAD suivantes (UX, architecture, épics). Il s'appuie sur `docs/brief.md` et sur la session de cadrage `_bmad-output/forge/logmerry-mvp/forged-idea.md`, qu'il ne duplique pas. Chaque fonctionnalité regroupe des exigences fonctionnelles (FR), numérotées de façon continue dans tout le document (l'ordre de lecture peut différer de l'ordre numérique). Les hypothèses sont balisées `[ASSUMPTION]` et indexées en §10. Les choix techniques détaillés sont dans `addendum.md` et, en cas d'écart, dans l'architecture (`architecture/architecture-logmerry-2026-10-12/ARCHITECTURE-SPINE.md`) qui fait foi. Les écrans, le ton et le comportement de l'interface sont décrits dans `ux-designs/ux-logmerry-2026-10-11/DESIGN.md` (aspect) et `EXPERIENCE.md` (comportement, parcours détaillés), sous `_bmad-output/planning-artifacts/`.

## 1. Vision
LogMerry est un cockpit personnel pour piloter une activité de conseil No-Code/IA en micro-entreprise. Chaque jour, il dit à son propriétaire quoi faire, et pourquoi, à partir de ses missions, de ses prospects, de ses factures et de ses échéances. Un assistant répond à partir de **ses propres notes** et **cite ses sources**.

Ce qui compte le plus pour l'auteur, qui n'a jamais été à son compte : la **structure**. Un gros projet ou une longue liste d'obligations paraissent insurmontables ; découpés en étapes et ordonnés dans le temps, ils deviennent atteignables.

Le produit sert deux buts qui vont dans le même sens : valider le Workshop 8 (priorité à court terme), puis piloter l'activité réelle (priorité à long terme). Le MVP est évolutif.

## 2. Utilisateur cible

### 2.1 Jobs To Be Done
- Savoir au jour le jour où j'en suis et quoi faire aujourd'hui, avec une explication.
- Ne rater ni une échéance administrative ni une facture à relancer.
- Voir où j'en suis par rapport à mon plafond, avec des estimations clairement étiquetées.
- Retrouver vite une information que j'ai déjà écrite, avec la source.
- Montrer mes réalisations à des prospects.

### 2.2 Non-utilisateurs (v1)
Les clients (portail en version 2), les équipes, et toute personne cherchant un outil de facturation légale ou de conseil fiscal.

### 2.3 Parcours clés
- **UJ-1. Alex ouvre son cockpit un lundi matin.** Alex, consultant débutant en micro-entreprise, se connecte. Le cockpit « Aujourd'hui » affiche trois tâches, chacune avec son motif (« échéance administrative dans 3 jours », « facture échue depuis 1 jour », « devis sans réponse depuis 7 jours »). Il coche la première et la liste se réordonne. Quand tout est fait, un message de félicitation s'affiche (au MVP : félicitation seule ; la proposition de « prendre de l'avance » est après le MVP, §7.4). Sous la liste, une ligne de synthèse (« 2 procédures à documenter ») renvoie vers l'écran « À faire » (FR-21) ; ce n'est pas une tâche. **Cas limite :** si un paramètre fiscal est absent, la jauge de plafond affiche « paramètre manquant » au lieu d'un chiffre.
- **UJ-2. Alex retrouve une procédure pendant un rendez-vous.** Alex demande à l'assistant comment il a configuré l'authentification chez un client précédent. L'assistant répond avec un extrait et un lien vers la note source. **Cas limite :** la base ne contient rien de pertinent, l'assistant répond qu'il ne trouve pas et propose « Créer une note à documenter plus tard » (FR-21).
- **UJ-3. Une visiteuse consulte une réalisation publiée.** Camille (personnage fictif), gérante d'une petite agence, ouvre le lien public du portfolio et voit uniquement les réalisations publiées avec l'accord du client, en lecture seule. Pour contacter Alex, elle utilise un lien « m'écrire » (e-mail) ; la page n'a pas de formulaire au MVP.
- **UJ-4. Alex saisit son activité après un premier rendez-vous.** Alex crée le prospect depuis la note de rendez-vous, puis le passe en client, crée la ou les missions, ajoute des étapes datées, un devis, puis les échéances. À l'ouverture du cockpit, il voit l'effet de sa saisie : les tâches issues de ses étapes et échéances, chacune avec son motif. Chaque formulaire n'exige que ses champs minimaux (détail dans `EXPERIENCE.md`).
- **UJ-5. Alex enregistre un paiement et règle son plafond.** Alex marque une facture payée et saisit l'encaissement, puis renseigne le plafond dans les paramètres avec sa source et sa date de vérification. Au retour sur le cockpit, la jauge de plafond est à jour (estimation). **Cas limite :** sans plafond, la jauge affiche « paramètre manquant », sans chiffre.

## 3. Glossaire
- **Propriétaire** — l'unique utilisateur connecté ; ses données sont isolées par `owner_id`.
- **Base de connaissances** — l'ensemble des notes, procédures, modèles et FAQ du propriétaire.
- **Note** — un document de la base de connaissances, découpé en extraits pour la recherche.
- **Extrait** — fragment de note, identifié, retrouvé par similarité et envoyé au modèle.
- **Citation** — référence à un extrait faite par l'assistant ; valide seulement si l'extrait a été fourni au modèle.
- **Mission** — un projet de conseil rattaché à un client, composé d'**Étapes**.
- **Étape** — sous-partie datée d'une mission.
- **Paramètre** — valeur réglementaire ou fiscale (taux, plafond) avec source et date de vérification.
- **Estimation** — résultat calculé par le code à partir de paramètres, jamais un montant officiel.
- **Encaissement** — somme effectivement reçue, base de tous les calculs de cotisations et de plafond.
- **Échéance** — obligation ou rappel daté, avec sa source.
- **Règle d'adaptation** — règle déterministe qui ordonne les tâches du cockpit et explique son choix.
- **Réalisation** — élément du portfolio, publiable en lecture seule avec l'accord du client.
- **Sigles** — ACRE (aide à la création ou à la reprise d'une entreprise) ; CA (chiffre d'affaires) ; RAG (génération augmentée par récupération : l'assistant répond à partir d'extraits retrouvés) ; RLS (sécurité par ligne) ; MCP (protocole qui permet à un assistant de code d'accéder à la base Supabase) ; J-3, J+1, M-1 (3 jours avant, 1 jour après, 1 mois avant une date).
- **Fiche d'outil** — entrée du catalogue d'outils (brique, taille de projet, coût, limites, date de vérification). Hors MVP.
- **Devis** — suivi simple d'une proposition commerciale (montant, date d'envoi, statut) rattaché à une mission ou à un prospect ; ce n'est pas un document (FR-22).
- **Écran « À faire »** — liste des éléments à documenter plus tard.
- **Élément à documenter** — Note brouillon créée depuis une requête sans résultat de l'assistant, titrée d'après cette requête (FR-21).

## 4. Fonctionnalités

### 4.1 Authentification et isolation des données
**Description :** accès sécurisé ; chaque ligne appartient à un propriétaire. Les comptes de démonstration et le compte réel coexistent dans la même base, sans se voir.

#### FR-1 : Connexion et isolation
Le propriétaire se connecte avec un compte. **Conséquences (testables) :**
- Chaque table a la sécurité par ligne activée avec `owner_id = auth.uid()`.
- Avec deux comptes fictifs, aucun ne voit, ne cherche ni ne cite une donnée de l'autre.
- La recherche vectorielle filtre aussi par `owner_id`.

#### FR-2 : Données de démonstration
Le compte de démonstration contient uniquement des données fictives, étiquetées. **Conséquences :** le compte de démonstration ne contient aucune donnée réelle de client ; la purge prévue au passage à l'outil pro est décrite en §5.2.

### 4.2 Base de connaissances et assistant (jalon du 30 octobre 2026)
**Description :** le propriétaire ajoute des notes ; l'assistant répond à partir d'elles, cite ses sources, refuse quand il ne sait pas et conserve l'historique. Réalise UJ-2.

#### FR-3 : Gestion des notes
Le propriétaire crée, modifie, classe et recherche des notes. **Conséquences :** une note ajoutée ou modifiée est découpée en extraits et indexée ; la recherche renvoie les notes pertinentes.

#### FR-19 : Recherche
Le propriétaire cherche dans l'ensemble de ses contenus (notes, clients, missions). **Conséquences :** la recherche ne renvoie que des éléments du propriétaire connecté ; une requête sans résultat l'indique explicitement.

#### FR-4 : Réponses citées
L'assistant répond avec les identifiants des extraits cités. **Conséquences :** toute citation dont l'extrait n'a pas été fourni au modèle fait rejeter la réponse ; l'interface relit la source en base par identifiant ; si aucun extrait n'atteint le seuil de similarité, l'assistant répond qu'il ne trouve pas.

#### FR-5 : Historique
Les échanges sont conservés et consultables, avec leurs citations. **Conséquences :** après une déconnexion puis une reconnexion, les échanges précédents réapparaissent dans l'ordre, chacun avec ses citations cliquables ; un compte ne voit jamais l'historique d'un autre.

#### FR-6 : Jeu de test du RAG
Le jeu de test (`docs/rag-tests.md`, 15 à 20 questions) couvre : réponse présente avec source attendue, réponse absente (refus attendu), piège inter-comptes. **Conséquences :** deux mesures par question (bon extrait retrouvé ; réponse fidèle à la source). Seuil cible : 18 sur 20 (décision de l'auteur) ; une fuite entre comptes est inacceptable, quel que soit le score.

#### FR-20 : Résumé automatique d'une note
Le propriétaire demande un résumé d'une note. Livré après le jalon du 30 octobre. **Conséquences :**
- Le résumé n'utilise que le contenu de la note ; il est étiqueté « résumé généré » et renvoie à la note source.
- Le propriétaire peut le régénérer ou l'ignorer ; il n'est jamais enregistré à la place de la note.
- Un résumé n'est possible que sur une note du propriétaire connecté.

#### FR-21 : Éléments à documenter (écran « À faire »)
Quand l'assistant ne trouve rien, le propriétaire peut cliquer sur « Créer une note à documenter plus tard ». Livré avec le cockpit (§7.3). **Conséquences (testables) :**
- Une Note brouillon est créée, titrée d'après la requête, et listée sur l'écran « À faire », propre à chaque propriétaire.
- Une Note brouillon vide n'est pas indexée par le RAG ; elle ne peut donc jamais être citée. Dès qu'elle reçoit du contenu, FR-3 s'applique.
- Le cockpit affiche sous la liste des tâches une ligne de synthèse (« 2 procédures à documenter »), lien vers l'écran « À faire », masquée à 0 et mise à jour au retour sur le cockpit.
- Cette ligne n'est pas une tâche : sans case à cocher, hors liste du jour, hors ordre de priorité. **FR-14 reste à six règles.**

### 4.3 CRM et missions
**Description :** prospects, clients, contacts et missions découpées en étapes. Chaque fiche porte une étiquette d'origine (client réel, formation, ami, démo).

#### FR-7 : Prospects, clients, contacts
Le propriétaire crée et suit des prospects, clients et contacts, avec un statut et une étiquette d'origine. **Conséquences :** une fiche peut être filtrée par statut et par étiquette d'origine ; un contact est rattaché à un client ou à un prospect ; depuis l'éditeur de note, le propriétaire lie la note à un prospect ou client (champ « Lié à ») et peut créer le prospect sans quitter la note (nom et origine seulement, avec suggestion des fiches existantes avant création) ; un prospect qui devient client change de statut sans ressaisie, et ses notes et contacts le suivent ; le compte de démonstration n'affiche que des fiches étiquetées « démo ».

#### FR-8 : Missions et étapes
Le propriétaire crée une mission, la découpe en étapes datées et suit leur avancement. **Conséquences :** une mission affiche sa progression ; les étapes échues alimentent le cockpit.

#### FR-22 : Suivi de devis
Le propriétaire suit un devis rattaché à une mission ou à un prospect. **Conséquences (testables) :**
- Champs : montant et date d'envoi obligatoires ; statut « envoyé » (par défaut), « accepté » ou « refusé » ; remarque facultative.
- Statut « accepté » : une mission est créée ou confirmée. Statut « refusé » : la tâche correspondante disparaît du cockpit.
- La règle 5 de FR-14 (devis sans réponse depuis 7 jours) s'appuie sur ce suivi : seul un devis au statut « envoyé » la déclenche.
- Aucun document de devis n'est produit (FR-18 reste un non-objectif).

**Notes :** `[NOTE FOR PM]` Comme on attend 10 à 20 entités, le CRM se justifie surtout comme support du RAG et des missions. Le garder minimal et surveiller le périmètre.

### 4.4 Finances et paramètres
**Description :** suivi des factures et des encaissements ; estimations de cotisations, de provisions et de position par rapport au plafond, calculées par le code à partir de paramètres.

#### FR-9 : Factures et encaissements
Le propriétaire enregistre des factures (payée ou non payée, date d'échéance) et des encaissements. **Conséquences :** les calculs utilisent les encaissements enregistrés en base, jamais un montant saisi dans un prompt ; si l'utilisateur cite un montant facturé, l'assistant le signale et demande l'encaissement réel.

#### FR-10 : Table de paramètres
Les taux, plafonds, dates et la périodicité de déclaration sont stockés comme paramètres avec source et date de vérification. **Conséquences :** aucun taux, plafond ou montant fiscal n'est codé en dur ; une modification d'un paramètre est prise en compte au calcul suivant, sans cache.

#### FR-11 : Estimations et jauge de plafond
Le système calcule des estimations (cotisations, provisions) et la position par rapport au plafond. **Conséquences :**
- Chaque résultat est étiqueté « estimation » avec ses paramètres sources.
- Si un paramètre est absent ou si sa date de vérification est dépassée, le système ne calcule pas et demande une intervention humaine.
- Aucun chiffre affiché ne vient du modèle de langage.
- 100 % des cas de référence calculés à la main, dont les cas limites (prorata de la première année, fin de l'ACRE, bascule de TVA), donnent le résultat attendu.

**Prérequis :** une liste d'au moins 6 cas de référence (dont les 3 cas limites) calculés à la main est établie avant l'implémentation ; les valeurs fiscales utilisées sont à vérifier à la source (§9, point 5).

#### FR-12 : Garde-fous de l'assistant
L'assistant explique les estimations sans conseiller. **Conséquences :** une demande hors périmètre (optimisation fiscale, conseil juridique) est refusée explicitement avec un message qui renvoie vers un professionnel ; une demande d'explication d'une estimation affiche les paramètres, leurs sources et leurs dates de vérification, sans recommandation.

### 4.5 Formalités et échéances
**Description :** déclarations et obligations d'indépendant saisies par le propriétaire avec leur date et leur source. L'outil les range et les rappelle ; il ne les invente pas.

#### FR-13 : Échéances
Le propriétaire crée des échéances avec date et source. **Conséquences :** une échéance sans date ou sans source est refusée à la saisie ; une échéance dont la date approche (J-3) apparaît dans le cockpit ; chaque paramètre porte un rappel de revérification périodique (le rappel pour les fiches d'outils ne s'applique pas au MVP, catalogue hors MVP).

### 4.6 Cockpit « Aujourd'hui »
**Description :** liste ordonnée des tâches du jour, chacune avec son motif. Réalise UJ-1.

#### FR-14 : Règles d'adaptation du MVP
Six règles déterministes ordonnent les tâches du jour. Déclencheurs, calculés à partir de données saisies : (1) échéance administrative à J-3 ; (2) facture échue à J+1 (non payée, date d'échéance dépassée) ; (3) encaissements cumulés à 90 % du plafond de TVA (paramètre) ; (4) fin de l'ACRE à M-1, date saisie ; (5) devis ou prospect sans mise à jour depuis 7 jours ; (6) pipeline vide (moins de deux missions ou prospects planifiés le mois suivant). Ces six règles sont les seules : l'écran « À faire » (FR-21) n'en ajoute aucune. **Ordre de priorité quand plusieurs règles se déclenchent :** 1, 2, 3, 4, 5, 6 ; à priorité égale, la date la plus proche d'abord. **Conséquences :** chaque tâche explique « pourquoi aujourd'hui » ; aucune règle n'est décidée par le modèle de langage ; aucun e-mail n'est envoyé automatiquement (un brouillon est proposé) ; une règle dont le paramètre est absent est affichée comme « paramètre manquant », pas ignorée.

#### FR-15 : Affichage financier
Le cockpit affiche le CA encaissé, la position par rapport au plafond et les estimations étiquetées. **Conséquences :** les montants affichés sont identiques à ceux de FR-11 (même calcul, pas de second calcul) ; un montant manquant affiche « paramètre manquant » ; chaque estimation porte l'étiquette « estimation ». L'affichage financier n'est pas un critère de réussite de l'outil.

### 4.7 Réalisations (portfolio)
**Description :** réalisations avec vue publique en lecture seule. Réalise UJ-3.

#### FR-16 : Publication
Le propriétaire publie une réalisation avec l'accord du client. **Conséquences :**
- La vue publique n'expose que les réalisations publiées ; elle est en lecture seule (au MVP, seul un lien « m'écrire » permet de contacter le propriétaire) ; aucune donnée privée n'y apparaît.
- Champs obligatoires : titre, description courte, étiquette d'origine (client réel, formation, ami, démo) et accord du client, sans lequel la publication est bloquée.
- Champs facultatifs : captures (texte alternatif obligatoire pour chacune), stack en étiquettes, chiffre de résultat (publiable seulement avec l'accord), nom du client.
- Sans accord, le nom du client est anonymisé par défaut (« Client, secteur X »).

### 4.8 Catalogue d'outils **[HORS MVP]**
**Description :** fiches par brique (base de données, formulaires, automatisation…), avec taille de projet adaptée, coût, hébergement, limites et date de vérification. Une stack retenue peut être rattachée à chaque mission. Décision de la session UX du 11 octobre : hors MVP et hors navigation de l'application.

#### FR-17 : Fiches d'outils et stack de mission
Le propriétaire crée des fiches d'outils et rattache une stack à une mission. **Conséquences :** une fiche dont la date de vérification est dépassée est signalée.

#### FR-18 : Brouillon de devis
Le système assemble un brouillon de lignes à partir du catalogue, à recopier dans le modèle de devis du propriétaire. Dépend de FR-17. Hors MVP, comme FR-17. **[NON-OBJECTIF]** : document de devis complet (mentions légales, numérotation) ; le simple suivi de statut d'un devis est couvert par FR-22.

## 5. Contraintes, garde-fous et exigences non fonctionnelles

### 5.1 Exigences non fonctionnelles transverses
- **NFR-1 : Performance.** Une page courante s'affiche en moins de 3 secondes ; l'assistant répond en moins de 15 secondes dans la majorité des cas, ou affiche un état d'attente.
- **NFR-2 : Accessibilité.** Écrans principaux utilisables au clavier, contrastes lisibles, libellés de formulaire associés (cible WCAG 2.1 AA sur les parcours UJ-1 à UJ-5). Écrans, ton (tutoiement dans l'espace privé, vouvoiement sur le portfolio public) et appareils (ordinateur principal ; téléphone pour la consultation et la saisie légère ; portfolio public lisible sur téléphone) : voir `DESIGN.md` et `EXPERIENCE.md`.
- **NFR-3 : Sécurité.** Voir FR-1 (isolation par ligne), aucune clé secrète côté client, schéma versionné.
- **NFR-4 : Fiabilité et sauvegarde.** Les données du propriétaire peuvent être restaurées après une erreur ; une sauvegarde est vérifiée avant le passage aux vraies données.
- **NFR-5 : Traçabilité de la démarche.** `docs/journal.md` consigne les prompts, les décisions, les bugs et les corrections ; les résultats du jeu de test du RAG sont enregistrés à chaque itération (au moins trois exécutions datées, avec le score), pour montrer l'amélioration.

### 5.2 Contraintes et garde-fous
- **Pas de conseil fiscal ou juridique généré par l'IA.** Les provisions et cotisations sont des estimations, jamais des montants officiels.
- **Données personnelles et RGPD :** hébergement dans l'Union européenne (base Supabase UE, fonctions Vercel en région Paris) ; les extraits de notes sont envoyés à Anthropic (réponses) et à Mistral AI (embeddings) : à documenter avant toute donnée réelle.
- **Gouvernance des données :** une seule base ; données fictives pendant le Workshop 8 ; au passage à l'outil pro, purge (embeddings et historique de chat inclus), seul le portfolio est conservé ; le MCP Supabase est autorisé tant que la base ne contient que des données fictives (lecture seule hors modification du schéma, approbation manuelle) et débranché avant la première vraie donnée client.
- **Sécurité :** aucune clé secrète côté client, dans le code ou dans un commit ; schéma versionné dans `supabase/migrations/`.
- **Langue :** interface en français, code et commits en anglais.

## 6. Non-objectifs
- Facturation légale ou électronique, calcul officiel de cotisations, d'impôt ou de TVA, agenda complet.
- IA qui conseille en fiscal ou en juridique, « précision absolue » promise, mise à jour autonome des taux.
- Envoi d'e-mails automatique, suivi d'ouverture de liens chez les prospects.

## 7. Périmètre par phases

### 7.1 Contraintes de calendrier
- La contrainte réelle est la **date**, pas les heures : la formation se termine le 8 février 2027. Les 130 h du Workshop 8 sont une estimation, dépassable.
- Capacité déclarée : 35 h par semaine, hors semaine du 12 octobre 2026 `[ASSUMPTION : déclarée par l'auteur, non vérifiée sur la durée]`. Il reste environ 195 h de travail (Workshop 8, Workshop 9 de 10 h, Workshop 10 de 75 h), à répartir sur environ 17 semaines.
- Option écartée : sacrifier du périmètre pour tenir 130 h.

### 7.2 Jalon 30 octobre 2026 : tranche RAG de bout en bout
FR-1, FR-2, FR-3, FR-4, FR-5, FR-6, FR-19. S'il n'est pas atteint : aucune nouvelle fonction, correction du RAG d'abord.

### 7.3 MVP, après le RAG
Ordre de livraison : (1) résumé automatique des notes (FR-20), CRM, missions et suivi de devis (FR-7, FR-8, FR-22) ; (2) finances et paramètres (FR-9 à FR-12) ; (3) formalités, cockpit et éléments à documenter (FR-13 à FR-15, FR-21) ; (4) réalisations (FR-16). Le catalogue d'outils et le brouillon de devis (FR-17, FR-18) sont hors MVP (§7.4). Le calendrier (§7.1) n'impose aucune coupe pour l'instant.

### 7.4 Après le MVP et version 2
- Catalogue d'outils, fiches et brouillon de devis (FR-17, FR-18), reportés hors MVP.
- « Prendre de l'avance » : à la fin des tâches du jour, proposition facultative (opt-in strict, SM-C1) de voir jusqu'à 3 tâches futures (étapes de mission à venir et échéances des 30 prochains jours, date la plus proche, étiquetées « à venir », hors liste du jour). Au MVP : félicitation seule.
- Formulaire de contact sur le portfolio public. Contraintes : insertion seule par un visiteur anonyme, anti-spam sans test cognitif, aucun e-mail automatique, mention RGPD (détail dans `addendum.md`).
- Import de fichiers (Notion, PDF) dans les notes ; au MVP, les CGV et procédures se collent dans une note (FR-3).
- Veille n8n des taux : détection et alerte, mise à jour après validation du propriétaire.
- Rappels d'échéances et résumé hebdomadaire via n8n ; synchronisation avec un calendrier.
- Capacité et suivi du temps, avec comparaison du temps passé et du devis.
- Dépenses et provisions détaillées.
- Alertes techniques.
- Portail client en lecture seule ; l'assistant et le RAG restent privés.
- Questions libres en SQL.

### 7.5 Version future
- Intégration Strava et Coros : consentement explicite ; seul un signal dérivé est conservé ; les données brutes ne sont ni conservées ni envoyées au modèle.
- Devis complet.

## 8. Indicateurs de réussite

**Primaires**
- **SM-1 : Calculs fiables.** 100 % des cas de référence corrects (FR-11). Valide FR-9, FR-10, FR-11.
- **SM-2 : RAG.** 18 questions sur 20 correctes (décision de l'auteur) ; zéro fuite inter-comptes. Valide FR-4, FR-6.
- **SM-3 : Aucune échéance ratée.** Sur un trimestre, chaque échéance administrative et chaque facture échue a déclenché une alerte, traitée à temps. Valide FR-13, FR-14.
- **SM-4 : Encaissements à jour.** Chaque encaissement est saisi dans les 7 jours suivant sa réception. Valide FR-9.
- **SM-5 : Usage.** Cockpit ouvert au moins 4 jours par semaine. Valide FR-14.
- **SM-6 : Workshop 8.** Parcours de démo complet (connexion, création d'un client, note, question à l'assistant avec source citée, historique), application déployée et accessible par une URL, journal de vibe coding à jour. Valide FR-1 à FR-6, FR-19. Voir la correspondance avec les critères du Workshop 8 ci-dessous.

**Contre-indicateurs (à ne pas optimiser)**
- **SM-C1 : Nombre de tâches affichées.** Ne pas gonfler la liste pour faire « actif » ; contrebalance SM-5.
- **SM-C2 : Taux de réponse de l'assistant.** Un refus correct vaut mieux qu'une réponse inventée ; contrebalance SM-2.

**Robustesse (tests)** : requête ambiguë (CA facturé au lieu d'encaissé), demande hors périmètre refusée, paramètre modifié pris en compte au calcul suivant.

**Correspondance avec les critères du Workshop 8** (communiqués par le tuteur)

| Critère évalué | Où il est traité |
| --- | --- |
| Compréhension du besoin métier, cohérence du produit | §1, §2, §3 ; parcours UJ-1 à UJ-5 |
| Pertinence de la stack choisie | `addendum.md` (choix et options écartées argumentés) |
| Qualité de la démarche de Vibe Coding ; usage de l'IA pour produire, corriger, améliorer | NFR-5 (journal, itérations du jeu de test) ; SM-6 |
| Fonctionnalité IA utile intégrée | FR-4 (réponses citées), FR-20 (résumé automatique), FR-12 ; calculs expliqués par l'assistant |
| Logique RAG et base vectorielle | FR-3, FR-4, FR-6, FR-19 ; `addendum.md` (découpage, embeddings, vérification des citations) |
| Qualité de l'expérience utilisateur | NFR-1, NFR-2 ; cockpit FR-14, FR-15 ; parcours UJ-1 à UJ-5 ; documents UX : `ux-designs/ux-logmerry-2026-10-11/DESIGN.md` et `EXPERIENCE.md` |
| Crédibilité globale du MVP présenté | SM-6 (parcours de démo complet, application déployée) ; jalon du 30 octobre |
| Fonctionnalités attendues (compte, tableau de bord, contenus, recherche, dialogue, RAG, historique, espace structuré) | FR-1, FR-14/FR-15, FR-3, FR-19, FR-4, FR-4/FR-6, FR-5, FR-3/FR-7 |

## 9. Questions ouvertes
1. Critères de notation : reçus du tuteur (voir §8). Restent à confirmer avec Richard, session du 12 octobre 2026 : le formalisme BMAD attendu et la date de soutenance.
2. Seuil de bonnes réponses du RAG : voir FR-6 ; à réviser si Richard exige autre chose.
3. ~~Modèle de langage et d'embeddings~~ : tranché le 13 octobre 2026 dans l'architecture (Claude pour les réponses, `mistral-embed` pour les embeddings). Reste à valider le modèle Claude exact sur le jeu de test (FR-6) et à documenter l'envoi des extraits à deux fournisseurs (RGPD) avant toute donnée réelle.
4. Nom public du produit.
5. Valeurs de référence (taux de l'ACRE, seuils de TVA, périodicité de déclaration) : fournies par l'auteur, **non vérifiées**, à confirmer à la source avant usage.

## 10. Index des hypothèses
- §7.1 : capacité de 35 h par semaine sur environ 17 semaines, déclarée, non vérifiée.
- §9, point 5 : statut de micro-entreprise (BNC) et valeurs de référence déclarés par l'auteur, non vérifiés.
