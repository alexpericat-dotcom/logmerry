---
title: LogMerry
status: final
created: 2026-10-10
updated: 2026-10-17
---

# PRD : LogMerry
*Nom de code. Le nom public reste à définir.*

## 0. Objet du document
Ce PRD s'adresse à l'auteur, à son tuteur (Richard) et aux étapes BMAD suivantes (UX, architecture, épics). Il s'appuie sur `docs/brief.md` et sur la session de cadrage `_bmad-output/forge/logmerry-mvp/forged-idea.md`, qu'il ne duplique pas. Chaque fonctionnalité regroupe des exigences fonctionnelles (FR), numérotées de façon continue dans tout le document (l'ordre de lecture peut différer de l'ordre numérique). Les hypothèses sont balisées `[ASSUMPTION]` et indexées en §10. Les choix techniques détaillés sont dans `addendum.md` et, en cas d'écart, dans l'architecture (`architecture/architecture-logmerry-2026-10-12/ARCHITECTURE-SPINE.md`) qui fait foi. Les écrans, le ton et le comportement de l'interface sont décrits dans `ux-designs/ux-logmerry-2026-10-11/DESIGN.md` (aspect) et `EXPERIENCE.md` (comportement, parcours détaillés), sous `_bmad-output/planning-artifacts/`.

> **Mise à jour du 17 octobre 2026 :** ce PRD a été remis en cohérence avec les décisions prises pendant la construction (méthode agile pour les missions, aide de l'IA à leur conception, génération de prompt, deux thèmes). Le détail daté est en §11 ; les sections modifiées portent la mention « (17 octobre) ».

## 1. Vision
LogMerry est un cockpit personnel pour piloter une activité de conseil No-Code/IA en micro-entreprise. Chaque jour, il dit à son propriétaire quoi faire, et pourquoi, à partir de ses missions, de ses prospects, de ses factures et de ses échéances. Un assistant répond à partir de **ses propres notes** et **cite ses sources**.

Ce qui compte le plus pour l'auteur, qui n'a jamais été à son compte : la **structure**. Un gros projet ou une longue liste d'obligations paraissent insurmontables ; découpés en étapes et ordonnés dans le temps, ils deviennent atteignables.

Pour tenir cette structure au quotidien, l'auteur a choisi la **méthode agile** : chaque mission a un **backlog** de user stories, découpées en tâches, puis regroupées en sprints, et l'**IA aide à les concevoir** (propositions à relire, jamais appliquées sans accord). (17 octobre)

Le produit sert deux buts qui vont dans le même sens : valider le Workshop 8 (priorité à court terme), puis piloter l'activité réelle (priorité à long terme). Le MVP est évolutif.

## 2. Utilisateur cible

### 2.1 Jobs To Be Done
- Savoir au jour le jour où j'en suis et quoi faire aujourd'hui, avec une explication.
- Ne rater ni une échéance administrative ni une facture à relancer.
- Voir où j'en suis par rapport à mon plafond, avec des estimations clairement étiquetées.
- Retrouver vite une information que j'ai déjà écrite, avec la source.
- Montrer mes réalisations à des prospects.
- Concevoir une mission en agile (backlog, user stories, tâches, sprints) avec l'aide de l'IA, puis confier le travail à un assistant (Claude, Claude Code, n8n par son MCP) avec un prompt efficace tiré de la mission. (17 octobre)

### 2.2 Non-utilisateurs (v1)
Les clients (portail en version 2), les équipes, et toute personne cherchant un outil de facturation légale ou de conseil fiscal.

### 2.3 Parcours clés
- **UJ-1. Alex ouvre son cockpit un lundi matin.** Alex, consultant débutant en micro-entreprise, se connecte. Le cockpit « Aujourd'hui » affiche trois tâches, chacune avec son motif (« échéance administrative dans 3 jours », « facture échue depuis 1 jour », « devis sans réponse depuis 7 jours »). Il coche la première et la liste se réordonne. Quand tout est fait, un message de félicitation s'affiche (au MVP : félicitation seule ; la proposition de « prendre de l'avance » est après le MVP, §7.4). Sous la liste, une ligne de synthèse (« 2 procédures à documenter ») renvoie vers l'écran « À faire » (FR-21) ; ce n'est pas une tâche. **Cas limite :** si un paramètre fiscal est absent, la jauge de plafond affiche « paramètre manquant » au lieu d'un chiffre.
- **UJ-2. Alex retrouve une procédure pendant un rendez-vous.** Alex demande à l'assistant comment il a configuré l'authentification chez un client précédent. L'assistant répond avec un extrait et un lien vers la note source. **Cas limite :** la base ne contient rien de pertinent, l'assistant répond qu'il ne trouve pas et propose « Créer une note à documenter plus tard » (FR-21).
- **UJ-3. Une visiteuse consulte une réalisation publiée.** Camille (personnage fictif), gérante d'une petite agence, ouvre le lien public du portfolio et voit uniquement les réalisations publiées avec l'accord du client, en lecture seule. Pour contacter Alex, elle utilise un lien « m'écrire » (e-mail) ; la page n'a pas de formulaire au MVP.
- **UJ-4. Alex saisit son activité après un premier rendez-vous.** Alex crée le prospect depuis la note de rendez-vous, puis le passe en client, crée la ou les missions, construit leur backlog (user stories puis tâches, avec l'aide de l'IA si besoin, UJ-6), ajoute un devis, puis les échéances. À l'ouverture du cockpit, il voit l'effet de sa saisie : les tâches issues de ses échéances, factures et devis, chacune avec son motif (le lien entre le backlog et le cockpit n'est pas encore décidé : §9, point 6). Chaque formulaire n'exige que ses champs minimaux (détail dans `EXPERIENCE.md`).
- **UJ-5. Alex enregistre un paiement et règle son plafond.** Alex marque une facture payée et saisit l'encaissement, puis renseigne le plafond dans les paramètres avec sa source et sa date de vérification. Au retour sur le cockpit, la jauge de plafond est à jour (estimation). **Cas limite :** sans plafond, la jauge affiche « paramètre manquant », sans chiffre.
- **UJ-6. Alex conçoit une mission en agile avec l'IA.** (17 octobre) Alex ouvre une mission, colle le brief du client ou coche des notes de rendez-vous liées au client, et demande des user stories à l'IA. Il relit chaque proposition (garder, modifier puis garder, rejeter) ; rien n'est enregistré avant son accord. Il déplie une story, demande des tâches à l'IA, les garde d'un coup ou une par une, puis réordonne le tout par glisser-déposer. Il génère ensuite un prompt depuis la mission (backlog et tâches compris) pour le confier à Claude Code ou à Claude relié à n8n, après avoir choisi s'il retire le nom du client. **Cas limites :** l'IA propose un chiffre absent de ses sources, la proposition est écartée et signalée ; une note trop volumineuse est laissée de côté et le dit ; une proposition qui répète une tâche existante est écartée.

## 3. Glossaire
- **Propriétaire** — l'unique utilisateur connecté ; ses données sont isolées par `owner_id`.
- **Base de connaissances** — l'ensemble des notes, procédures, modèles et FAQ du propriétaire.
- **Note** — un document de la base de connaissances, découpé en extraits pour la recherche.
- **Extrait** — fragment de note, identifié, retrouvé par similarité et envoyé au modèle.
- **Citation** — référence à un extrait faite par l'assistant ; valide seulement si l'extrait a été fourni au modèle.
- **Mission** — un projet de conseil rattaché à un client, géré en agile : elle porte un **Backlog**.
- **Backlog** — liste ordonnée (de la plus à la moins prioritaire) des **User stories** d'une mission ; l'ordre se change par glisser-déposer. (17 octobre)
- **User story** — besoin écrit « En tant que… je veux… afin de… » (titre obligatoire ; rôle, bénéfice, critères d'acceptation et points facultatifs), avec un statut (à faire, en cours, terminée). (17 octobre)
- **Points** — estimation d'effort d'une story dans la suite de Fibonacci (1, 2, 3, 5, 8, 13), jamais en heures. (17 octobre)
- **Tâche** — action concrète d'une user story (titre et case « faite ») ; cocher toutes les tâches ne change pas le statut de la story. (17 octobre)
- **Sprint** — courte période de livraison avec un objectif, où l'on place des stories du backlog (planifié, FR-8). (17 octobre)
- **Proposition de l'IA** — suggestion (stories, tâches, prompt) qui n'existe qu'à l'écran tant que le propriétaire ne la garde pas. (17 octobre)
- **Prompt de mission** — consigne destinée à un autre assistant, rédigée par l'IA, suivie du contexte de la mission recopié tel quel par le code (FR-24). (17 octobre)
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
**Description :** prospects, clients, contacts et missions gérées en agile (backlog, user stories, tâches, sprints). Chaque fiche porte une étiquette d'origine (client réel, formation, ami, démo).

#### FR-7 : Prospects, clients, contacts
Le propriétaire crée et suit des prospects, clients et contacts, avec un statut et une étiquette d'origine. **Conséquences :** une fiche peut être filtrée par statut et par étiquette d'origine ; un contact est rattaché à un client ou à un prospect ; depuis l'éditeur de note, le propriétaire lie la note à un prospect ou client (champ « Lié à ») et peut créer le prospect sans quitter la note (nom et origine seulement, avec suggestion des fiches existantes avant création) ; un prospect qui devient client change de statut sans ressaisie, et ses notes et contacts le suivent ; le compte de démonstration n'affiche que des fiches étiquetées « démo ».

#### FR-8 : Missions, backlog, user stories, tâches et sprints
(17 octobre ; remplace « Missions et étapes datées », décision de l'auteur du 16 octobre 2026 : méthode et vocabulaire agile.) Le propriétaire crée une mission rattachée à un client, tient son **backlog** de user stories, découpe chaque story en **tâches** et planifie des **sprints**. **Conséquences (testables) :**
- Une user story a un titre obligatoire (200 caractères au plus) ; rôle, bénéfice, critères d'acceptation et points (Fibonacci) sont facultatifs ; un statut parmi à faire, en cours, terminée.
- La mission affiche sa progression (« 2 sur 5 stories terminées », jamais « 0 sur 0 »), aussi dans la liste des missions et sur la fiche du client. Terminer toutes les stories ne change pas le statut de la mission.
- L'ordre du backlog (priorité) et l'ordre des tâches se changent par glisser-déposer, à la souris, au toucher et au clavier, avec annonces pour les lecteurs d'écran ; un échec rétablit l'ordre d'origine avec un message.
- Une story est affichée en une ligne repliée (statut, titre, points, avancement des tâches) ; le détail et les tâches se déplient.
- Une tâche (titre de 200 caractères au plus, case « faite ») s'ajoute, se coche, se modifie, se supprime (avec confirmation) ; l'avancement « 3 sur 4 tâches faites » ne change jamais le statut de la story.
- Supprimer une mission supprime son backlog et ses tâches ; la confirmation dit combien de stories (ou de tâches) partent avec.
- **Sprints (à livrer, 3.5c) :** le propriétaire planifie des sprints (objectif en une phrase, période) et y place des stories du backlog.
- Le lien entre le backlog ou les sprints et le cockpit « Aujourd'hui » n'est pas décidé : FR-14 reste à six règles, aucune ne porte sur les stories (§9, point 6).

#### FR-23 : Aide de l'IA à la conception d'une mission
(17 octobre.) Le propriétaire demande à l'IA de l'aider à concevoir sa mission. **Conséquences (testables) :**
- **Backlog (8.16) :** à partir d'un brief collé et/ou de notes de rendez-vous liées à la fiche du client, l'IA propose jusqu'à 8 user stories dans un ordre logique de réalisation, avec critères d'acceptation et points suggérés ; chaque proposition peut citer la note d'où elle vient.
- **Tâches (8.17) :** à partir d'une story (rôle, bénéfice, critères), de sa note d'origine et d'une précision facultative, l'IA propose 1 à 8 tâches dans l'ordre logique de réalisation ; « Tout garder » les ajoute d'un coup, à la suite des tâches existantes.
- **À venir :** tâches proposées avec les stories du backlog (8.17b), relecture et amélioration d'une story (8.18), composition d'un sprint (8.19), ordre logique d'un backlog existant avec raison par déplacement (8.20).
- **Règles communes :** une proposition n'existe qu'à l'écran et n'est enregistrée qu'avec l'accord du propriétaire (garder, modifier puis garder, rejeter) ; elle ne reprend jamais une story ou une tâche déjà présente ; une proposition qui contient un nombre (10 ou plus, ou décimal) absent des sources fournies est écartée et signalée ; seules les notes liées à la fiche du client de la mission, actives et au compte du propriétaire peuvent être lues ; le texte fourni (brief, notes, story) est traité comme une donnée, jamais comme une consigne ; l'IA ne donne aucun conseil fiscal ou juridique ; l'appel est fait côté serveur ; une mention dit que le contenu est envoyé à Anthropic (§5.2).
- **Mesure :** jeu d'essais réels sur données fictives (`docs/ia-backlog-tests.md`) : 15 scénarios au 17 octobre.

#### FR-24 : Générer un prompt depuis une mission
(17 octobre, story 8.21.) Le propriétaire génère un prompt à confier à un autre assistant. **Conséquences (testables) :**
- Il choisit ce que le prompt contient (la mission seule, ou avec le backlog, les stories détaillées, les tâches et leur état), l'assistant visé (Claude en discussion, Claude Code, Claude avec le MCP n8n, autre) et un objectif facultatif.
- L'IA rédige la **consigne** (rôle, objectif, contraintes, format de réponse, questions à poser avant d'agir, adaptation à la cible) ; le **contexte** (mission, backlog) est ajouté tel quel par le code, jamais recopié par le modèle.
- Les notes ne sont jamais envoyées ; une case permet de retirer le nom du client (pas celui qui figurerait dans un titre : limite dite à l'écran) ; une consigne qui contient un nombre absent des sources est écartée ; le contexte est limité à 30 000 caractères et le dit.
- Le prompt est modifiable et copiable ; il n'est jamais enregistré ni exécuté par LogMerry.
- Pour n8n, la consigne interdit de demander un mot de passe ou une clé dans la conversation et demande une instance de test.

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
- **NFR-2 : Accessibilité.** Écrans principaux utilisables au clavier, contrastes lisibles, libellés de formulaire associés (cible WCAG 2.1 AA sur les parcours UJ-1 à UJ-6). Cibles tactiles d'au moins 44 px sur téléphone ; tout glisser-déposer a son équivalent au clavier avec annonces ; l'interface propose deux thèmes, « Rétro » (clair, pixel art) et « Futur » (sombre), choisis à l'arrivée (17 octobre). Écrans, ton (tutoiement dans l'espace privé, vouvoiement sur le portfolio public) et appareils (ordinateur principal ; téléphone pour la consultation et la saisie légère ; portfolio public lisible sur téléphone) : voir `DESIGN.md` et `EXPERIENCE.md`.
- **NFR-3 : Sécurité.** Voir FR-1 (isolation par ligne), aucune clé secrète côté client, schéma versionné.
- **NFR-4 : Fiabilité et sauvegarde.** Les données du propriétaire peuvent être restaurées après une erreur ; une sauvegarde est vérifiée avant le passage aux vraies données.
- **NFR-5 : Traçabilité de la démarche.** `docs/journal.md` consigne les prompts, les décisions, les bugs et les corrections ; les résultats du jeu de test du RAG sont enregistrés à chaque itération (au moins trois exécutions datées, avec le score), pour montrer l'amélioration ; les essais réels de l'IA de conception sont notés dans `docs/ia-backlog-tests.md` (17 octobre).

### 5.2 Contraintes et garde-fous
- **Pas de conseil fiscal ou juridique généré par l'IA.** Les provisions et cotisations sont des estimations, jamais des montants officiels.
- **Données personnelles et RGPD :** hébergement dans l'Union européenne (base Supabase UE, fonctions Vercel en région Paris) ; les extraits de notes sont envoyés à Anthropic (réponses) et à Mistral AI (embeddings) ; le brief, les notes cochées, les stories, les tâches, les précisions et les objectifs saisis pour l'aide à la conception (FR-23) et la génération de prompt (FR-24) sont envoyés à Anthropic (la mention est affichée dans chaque panneau) ; un prompt généré va ensuite là où le propriétaire le colle (autre outil, autre fournisseur) : à documenter avant toute donnée réelle.
- **Gouvernance des données :** une seule base ; données fictives pendant le Workshop 8 ; au passage à l'outil pro, purge (embeddings et historique de chat inclus), seul le portfolio est conservé ; le MCP Supabase est autorisé tant que la base ne contient que des données fictives (lecture seule hors modification du schéma, approbation manuelle) et débranché avant la première vraie donnée client.
- **Sécurité :** aucune clé secrète côté client, dans le code ou dans un commit ; schéma versionné dans `supabase/migrations/`.
- **Langue :** interface en français, code et commits en anglais.

## 6. Non-objectifs
- Facturation légale ou électronique, calcul officiel de cotisations, d'impôt ou de TVA, agenda complet.
- IA qui conseille en fiscal ou en juridique, « précision absolue » promise, mise à jour autonome des taux.
- Envoi d'e-mails automatique, suivi d'ouverture de liens chez les prospects.
- Estimation des user stories en heures (points seulement) ; exécution du prompt généré par LogMerry ; enregistrement des propositions de l'IA avant accord du propriétaire. (17 octobre)

## 7. Périmètre par phases

### 7.1 Contraintes de calendrier
- La contrainte réelle est la **date**, pas les heures : la formation se termine le 8 février 2027. Les 130 h du Workshop 8 sont une estimation, dépassable.
- Capacité déclarée : 35 h par semaine, hors semaine du 12 octobre 2026 `[ASSUMPTION : déclarée par l'auteur, non vérifiée sur la durée]`. Il reste environ 195 h de travail (Workshop 8, Workshop 9 de 10 h, Workshop 10 de 75 h), à répartir sur environ 17 semaines.
- Option écartée : sacrifier du périmètre pour tenir 130 h.

### 7.2 Jalon 30 octobre 2026 : tranche RAG de bout en bout
FR-1, FR-2, FR-3, FR-4, FR-5, FR-6, FR-19. S'il n'est pas atteint : aucune nouvelle fonction, correction du RAG d'abord.

### 7.3 MVP, après le RAG
Ordre de livraison : (1) résumé automatique des notes (FR-20), CRM, missions en agile avec backlog, tâches et sprints, aide de l'IA à leur conception et génération de prompt (FR-7, FR-8, FR-23, FR-24), suivi de devis (FR-22) ; (2) finances et paramètres (FR-9 à FR-12) ; (3) formalités, cockpit et éléments à documenter (FR-13 à FR-15, FR-21) ; (4) réalisations (FR-16). Le catalogue d'outils et le brouillon de devis (FR-17, FR-18) sont hors MVP (§7.4). Le calendrier (§7.1) n'impose aucune coupe pour l'instant.

### 7.4 Après le MVP et version 2
- Catalogue d'outils, fiches et brouillon de devis (FR-17, FR-18), reportés hors MVP.
- « Prendre de l'avance » : à la fin des tâches du jour, proposition facultative (opt-in strict, SM-C1) de voir jusqu'à 3 tâches futures (sprints ou stories à venir, à redéfinir avec les sprints, et échéances des 30 prochains jours, date la plus proche, étiquetées « à venir », hors liste du jour). Au MVP : félicitation seule.
- Formulaire de contact sur le portfolio public. Contraintes : insertion seule par un visiteur anonyme, anti-spam sans test cognitif, aucun e-mail automatique, mention RGPD (détail dans `addendum.md`).
- Pièces jointes aux notes (photos, documents, enregistrements), idée de l'auteur du 15 octobre ; ajout des notes comme source facultative du prompt généré (FR-24).
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
| Fonctionnalité IA utile intégrée | FR-4 (réponses citées), FR-20 (résumé automatique), FR-23 (conception de mission), FR-24 (prompt de mission), FR-12 ; calculs expliqués par l'assistant |
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
6. (17 octobre) Lien entre le backlog ou les sprints et le cockpit « Aujourd'hui » : les six règles de FR-14 ne portent pas sur les stories ; faut-il une septième règle (story en cours, sprint qui se termine) ? À trancher avec les sprints (3.5c) ; sans décision, le cockpit ne reflète pas le backlog.

## 10. Index des hypothèses
- §7.1 : capacité de 35 h par semaine sur environ 17 semaines, déclarée, non vérifiée.
- §9, point 5 : statut de micro-entreprise (BNC) et valeurs de référence déclarés par l'auteur, non vérifiés.

## 11. Évolutions depuis le 13 octobre 2026 (17 octobre)
Décisions de l'auteur prises pendant la construction, reportées ici pour que ce PRD reste la référence :
- **16 octobre : méthode agile.** « Étapes datées » remplacées par backlog, user stories, tâches et sprints (FR-8, glossaire, UJ-4).
- **16 octobre : aide de l'IA à la conception** (FR-23) : backlog (8.16), tâches (8.17) ; relecture, sprint, ordre et tâches avec le backlog à suivre.
- **15 et 16 octobre : interface.** Thème clair « Arcade clair » (pixel art), écran de choix « Rétro » / « Futur » à l'arrivée, message du cockpit écrit au clavier, refonte mobile (cibles de 44 px), stories compactes et glisser-déposer (`DESIGN.md`, `EXPERIENCE.md`).
- **17 octobre : prompt de mission** (FR-24), l'IA rédige la consigne et le code recopie le contexte.
- **Idées gardées pour plus tard :** pièces jointes aux notes (§7.4) ; ordre logique du backlog par l'IA (8.20) ; tâches proposées avec le backlog (8.17b).
