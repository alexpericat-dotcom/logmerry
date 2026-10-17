---
title: LogMerry
status: final
created: 2026-10-10
updated: 2026-10-18
---

# PRD : LogMerry
*Nom de code. Le nom public reste à définir.*

## 0. Objet du document
Ce PRD s'adresse à l'auteur, à son tuteur (Richard) et aux étapes BMAD suivantes (UX, architecture, épics). Il s'appuie sur `docs/brief.md` et sur la session de cadrage `_bmad-output/forge/logmerry-mvp/forged-idea.md`, qu'il ne duplique pas. Chaque fonctionnalité regroupe des exigences fonctionnelles (FR), numérotées de façon continue dans tout le document (l'ordre de lecture peut différer de l'ordre numérique). Les hypothèses sont balisées `[ASSUMPTION]` et indexées en §10. Les choix techniques détaillés sont dans `addendum.md` et, en cas d'écart, dans l'architecture (`architecture/architecture-logmerry-2026-10-12/ARCHITECTURE-SPINE.md`) qui fait foi. Les écrans, le ton et le comportement de l'interface sont décrits dans `ux-designs/ux-logmerry-2026-10-11/DESIGN.md` (aspect) et `EXPERIENCE.md` (comportement, parcours détaillés), sous `_bmad-output/planning-artifacts/`.

> **Mise à jour du 17 octobre 2026 :** ce PRD a été remis en cohérence avec les décisions prises pendant la construction (méthode agile pour les missions, aide de l'IA à leur conception, génération de prompt, deux thèmes). Le détail daté est en §11 ; les sections modifiées portent la mention « (17 octobre) ».
>
> **Mise à jour du 18 octobre 2026 :** le périmètre financier est précisé à partir de la spec « cockpit financier » de l'auteur (`spec-cockpit-financier.md`, décisions dans `decisions-finances.md`) : règles réglementaires versionnées, profil professionnel, plafonds multiples et calendrier administratif entrent dans le MVP ; vue d'ensemble financière, objectifs et suivi ARE forment une phase suivante. Les sections modifiées portent la mention « (18 octobre) ».

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
- **UJ-5. Alex enregistre un paiement et règle son plafond.** Alex marque une facture payée et saisit l'encaissement, puis renseigne son profil professionnel (statut, régime, date de début d'activité : tant qu'une donnée est « À confirmer », les règles qui en dépendent n'affichent aucun chiffre) ; les plafonds et leurs règles portent leur source et leur date de vérification. Au retour sur le cockpit, les jauges de plafond sont à jour (estimation). **Cas limite :** sans règle vérifiée pour un plafond, la jauge affiche « paramètre manquant », sans chiffre. (18 octobre)
- **UJ-6. Alex conçoit une mission en agile avec l'IA.** (17 octobre) Alex ouvre une mission, colle le brief du client ou coche des notes de rendez-vous liées au client, et demande des user stories à l'IA. Il relit chaque proposition (garder, modifier puis garder, rejeter) ; rien n'est enregistré avant son accord. Il déplie une story, demande des tâches à l'IA, les garde d'un coup ou une par une, puis réordonne le tout par glisser-déposer. Il génère ensuite un prompt depuis la mission (tout le contexte : backlog, stories, tâches) pour le confier à Claude Code ou à Claude relié à n8n, en citant l'outil dans ce qu'il veut obtenir, après avoir choisi s'il retire le nom du client. **Cas limites :** l'IA propose un chiffre absent de ses sources, la proposition est écartée et signalée ; une note trop volumineuse est laissée de côté et le dit ; une proposition qui répète une tâche existante est écartée.

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
- **Paramètre** — valeur réglementaire ou fiscale (taux, plafond) avec source et date de vérification ; chaque paramètre appartient à une **règle** (FR-10).
- **Règle réglementaire** — règle fiscale, sociale ou administrative versionnée : identifiant, catégorie, description, valeur ou paramètres de calcul, date de début et de fin d'effet, conditions d'application, catégorie d'activité concernée, source officielle, date de dernière vérification, statut de validation, tests associés. Une règle non vérifiée ne produit jamais un calcul présenté comme fiable (FR-10). (18 octobre)
- **Profil professionnel** — les données personnelles qui décident des règles applicables (statut, régime, catégorie, date de début d'activité…), FR-25. (18 octobre)
- **« À confirmer »** — état d'une donnée personnelle ou d'une règle inconnue : jamais remplacée par une valeur par défaut, et toute règle qui en dépend affiche « paramètre manquant ». (18 octobre)
- **Plafond** — seuil réglementaire (régime micro, franchise de TVA, TVA applicable) ou seuil interne choisi par le propriétaire, suivi par une jauge ; chaque plafond se calcule sur le chiffre d'affaires pertinent pour sa règle (FR-11). (18 octobre)
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
- Cette ligne n'est pas une tâche : sans case à cocher, hors liste du jour, hors ordre de priorité. Elle ne fait pas partie des règles de FR-14.

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
- **Sprints (livrés, 3.5c) :** le propriétaire planifie des sprints (objectif en une phrase, période, un seul sprint en cours par mission) et y place des stories du backlog, par le menu « Sprint » de la story ou par glisser-déposer entre le backlog et les sprints non clos ; un sprint clos est figé (aucune story n'y entre ni n'en sort) ; **un sprint appartient toujours à une et une seule mission**. À la création, le nom est prérempli (« Sprint 1 », « Sprint 2 »… par mission, numéro calculé côté serveur, modifiable). (18 octobre)
- **Lien avec le cockpit :** voir FR-14 (septième règle et tâches du sprint) ; le cockpit affiche toujours « Client / Mission / Sprint X », jamais le nom du sprint seul, puisque chaque mission a son « Sprint 1 ». (18 octobre)

#### FR-23 : Aide de l'IA à la conception d'une mission
(17 octobre.) Le propriétaire demande à l'IA de l'aider à concevoir sa mission. **Conséquences (testables) :**
- **Backlog (8.16) :** à partir d'un brief collé et/ou de notes de rendez-vous liées à la fiche du client, l'IA propose jusqu'à 8 user stories dans un ordre logique de réalisation, avec critères d'acceptation et points suggérés ; chaque proposition peut citer la note d'où elle vient.
- **Tâches (8.17) :** à partir d'une story (rôle, bénéfice, critères), de sa note d'origine et d'une précision facultative, l'IA propose 1 à 8 tâches dans l'ordre logique de réalisation ; « Tout garder » les ajoute d'un coup, à la suite des tâches existantes.
- **Tâches avec les stories (8.17b) :** les stories proposées peuvent arriver avec 0 à 6 tâches chacune dans le même appel ; « Garder » ajoute la story et ses tâches ensemble (tout ou rien), les tâches se modifient et se retirent avant. (18 octobre)
- **Relecture d'une story (8.18) :** remarques à types fixes (trop grosse, floue, critères manquants, bénéfice ou rôle absent) et version proposée champ par champ ; le propriétaire coche ce qu'il applique ; refusé si la story a changé entre-temps. (18 octobre)
- **Composition d'un sprint (8.19) :** stories du backlog proposées dans l'ordre de priorité avec une raison chacune, capacité en points visée et vérifiée par le code, objectif proposé seulement si le sprint n'en a pas. (18 octobre)
- **Ordre du backlog (8.20) :** nouvel ordre pour les stories ouvertes hors sprint avec une raison par story déplacée ; les stories terminées et celles des sprints gardent leur place ; refusé si le backlog a changé entre-temps. (18 octobre)
- **Règles communes :** une proposition n'existe qu'à l'écran et n'est enregistrée qu'avec l'accord du propriétaire (garder, modifier puis garder, rejeter) ; elle ne reprend jamais une story ou une tâche déjà présente ; une proposition qui contient un nombre (10 ou plus, ou décimal) absent des sources fournies est écartée et signalée ; seules les notes liées à la fiche du client de la mission, actives et au compte du propriétaire peuvent être lues ; le texte fourni (brief, notes, story) est traité comme une donnée, jamais comme une consigne ; l'IA ne donne aucun conseil fiscal ou juridique ; l'appel est fait côté serveur ; une mention dit que le contenu est envoyé à Anthropic (§5.2).
- **Mesure :** jeu d'essais réels sur données fictives (`docs/ia-backlog-tests.md`) : 32 scénarios au 18 octobre.

#### FR-24 : Générer un prompt depuis une mission
(17 octobre, story 8.21.) Le propriétaire génère un prompt à confier à un autre assistant. **Conséquences (testables) :**
- Il choisit ce que le prompt contient (**la mission seule**, ou **tout le contexte** : backlog, stories détaillées, tâches et états) et peut écrire ce qu'il veut obtenir, en citant l'outil visé s'il le souhaite (n8n, Claude Code, une discussion avec Claude) : la consigne s'y adapte, sinon elle est générique. Il n'y a pas de menu « assistant ».
- L'IA rédige la **consigne** (rôle, objectif, contraintes, format de réponse, questions à poser avant d'agir, adaptation à l'outil cité) ; le **contexte** (mission, backlog) est ajouté tel quel par le code, jamais recopié par le modèle.
- Les notes ne sont jamais envoyées ; une case remplace le nom du client par « le client » **partout** (mission, stories, tâches, objectif ; les autres noms propres restent : limite dite à l'écran) ; une consigne qui contient un nombre absent des sources est écartée ; le contexte est limité à 30 000 caractères et le dit.
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
**Description :** suivi des factures et des encaissements ; profil professionnel ; règles réglementaires versionnées ; estimations de cotisations et position par rapport aux plafonds, calculées par le code à partir de ces règles. (18 octobre : règles, profil et plafonds multiples précisés à partir de la spec « cockpit financier »)

**Contrainte transverse (18 octobre, non négociable) :** aucune valeur réglementaire (plafond, taux, abattement, seuil, échéance) n'est codée en dur sans **source officielle identifiée, datée et vérifiée** ; une règle historique n'est jamais présentée comme une règle actuelle ; une règle non vérifiée ne produit jamais un calcul présenté comme fiable ; une donnée personnelle inconnue n'est jamais préremplie avec une valeur arbitraire (état « À confirmer »). Sources officielles à utiliser en priorité : Légifrance, Entreprendre.Service-Public.fr, Urssaf, Impots.gouv.fr, France Travail.

#### FR-9 : Factures et encaissements
Le propriétaire enregistre des factures (payée ou non payée, date d'échéance) et des encaissements. **Conséquences :** les calculs utilisent les encaissements enregistrés en base, jamais un montant saisi dans un prompt ; si l'utilisateur cite un montant facturé, l'assistant le signale et demande l'encaissement réel. Chaque plafond se calcule sur la base de recettes que sa règle désigne (hors taxe ou toutes taxes comprises, période, catégorie de recettes) : les factures et les encaissements portent les champs que ces règles exigent, fixés quand les règles sont écrites (§9, point 11). (18 octobre)

#### FR-10 : Règles réglementaires versionnées et paramètres
Les règles fiscales, sociales et administratives (taux, plafonds, seuils, dates, périodicité de déclaration) sont centralisées dans un mécanisme **versionné**, jamais dispersées dans l'interface. Chaque règle porte : identifiant, catégorie, description, valeur ou paramètres de calcul, date de début d'effet, date de fin d'effet éventuelle, conditions d'application, catégorie d'activité concernée, source officielle, date de dernière vérification, statut de validation (à vérifier, vérifiée, périmée) et tests associés. **Conséquences :** aucun taux, plafond ou montant fiscal n'est codé en dur ; une modification d'une règle est prise en compte au calcul suivant, sans cache ; une règle non vérifiée, périmée ou dont une condition dépend d'une donnée « À confirmer » (FR-25) n'est jamais utilisée silencieusement : le calcul concerné affiche « paramètre manquant » ; les données du propriétaire, les règles, les résultats de calculs, les notifications et les sources sont des notions séparées. Aucune valeur n'est préremplie : l'auteur saisit chaque règle avec sa source et sa date de vérification, après l'avoir confirmée à la source. (18 octobre ; remplace « Table de paramètres »)

#### FR-11 : Estimations et suivi des plafonds
Le système calcule des estimations (cotisations) et la position par rapport à **plusieurs plafonds distincts** : plafonds du régime micro, seuils de franchise de TVA, seuils de TVA applicables au régime du propriétaire, seuils internes choisis pour les alertes (le cumul avec les allocations chômage relève de la phase suivante, FR-28). **Conséquences :**
- Chaque plafond se calcule sur le chiffre d'affaires **pertinent pour sa règle** : le même montant n'est jamais réutilisé automatiquement pour tous les plafonds (périodes, catégories de recettes et bases peuvent différer).
- Chaque jauge affiche : le seuil concerné, le montant consommé, le pourcentage atteint, le montant restant avant le seuil, la période de référence, la date de dernière mise à jour, la source officielle et la date d'effet de la règle. Des alertes sont configurables à 50, 75, 90 et 100 %. (18 octobre)
- Chaque résultat est étiqueté « estimation » avec ses règles sources.
- Si une règle est absente, non vérifiée ou périmée, ou si une donnée du profil dont elle dépend est « À confirmer », le système ne calcule pas, affiche « paramètre manquant » et demande une intervention humaine.
- Aucun chiffre affiché ne vient du modèle de langage.
- 100 % des cas de référence calculés à la main, dont les cas limites (prorata de la première année, fin de l'ACRE, bascule de TVA), donnent le résultat attendu ; ces cas deviennent les **tests associés** des règles (FR-10).

**Prérequis :** une liste d'au moins 6 cas de référence (dont les 3 cas limites) calculés à la main est établie avant l'implémentation ; les règles correspondantes (« prorata de la première année », « bascule de TVA », fin de l'ACRE) sont écrites par l'auteur **avec leur source officielle** et ne sont pas devinées ; les valeurs fiscales utilisées sont à vérifier à la source (§9, points 5 et 12). (18 octobre ; remplace « Estimations et jauge de plafond »)

#### FR-12 : Garde-fous de l'assistant
L'assistant explique les estimations sans conseiller. **Conséquences :** une demande hors périmètre (optimisation fiscale, conseil juridique) est refusée explicitement avec un message qui renvoie vers un professionnel ; une demande d'explication d'une estimation affiche les paramètres, leurs sources et leurs dates de vérification, sans recommandation.

#### FR-25 : Profil professionnel
Une page de configuration (18 octobre) rassemble les données personnelles qui décident des règles applicables : statut juridique, régime fiscal, catégorie BNC ou BIC, nature des prestations, date de début d'activité, fréquence des déclarations Urssaf, régime de TVA, éligibilité éventuelle à l'ACRE, situation France Travail, objectifs financiers, taux de réserve personnels, préférences de notification. **Conséquences :** une donnée inconnue est dans l'état « À confirmer » et n'est **jamais préremplie** avec une valeur arbitraire ; toute règle qui en dépend affiche « paramètre manquant » tant qu'elle n'est pas confirmée ; au démarrage, le statut est « micro-entreprise, BNC » déclaré par l'auteur et marqué à confirmer à la source (§9, point 5), et la date de début d'activité est « À confirmer ». Les objectifs financiers et le suivi de la situation France Travail ne servent, au MVP, que de données du profil : leurs usages sont en phase suivante (FR-27, FR-28).

### 4.5 Formalités, échéances et calendrier
**Description :** déclarations et obligations d'indépendant saisies par le propriétaire avec leur date et leur source, ou calculées à partir des règles vérifiées applicables à son profil. L'outil les range et les rappelle ; il ne les invente pas.

#### FR-13 : Échéances
Le propriétaire crée des échéances avec date et source. **Conséquences :** une échéance sans date ou sans source est refusée à la saisie ; une échéance dont la date approche (J-3) apparaît dans le cockpit ; chaque règle et chaque paramètre porte un rappel de revérification périodique (le rappel pour les fiches d'outils ne s'applique pas au MVP, catalogue hors MVP).
**Calendrier administratif (18 octobre) :** les obligations sont rangées dans un calendrier unique, par catégorie : déclarations Urssaf, actualisation France Travail, déclarations fiscales, déclarations de TVA, CFE et échéances associées, factures à émettre, factures à relancer, justificatifs à transmettre, renouvellements et démarches administratives, échéances personnalisées. Chaque tâche porte titre, description, date d'échéance, catégorie, statut, priorité, lien vers la source officielle et règle de récurrence éventuelle. Vues : « Aujourd'hui », « Cette semaine », « Ce mois-ci », « En retard ». **Jamais de fausse échéance :** une date est saisie par le propriétaire ou calculée par une règle vérifiée applicable à son profil ; une échéance inconnue est signalée comme telle (« À confirmer »), pas estimée silencieusement.

### 4.6 Cockpit « Aujourd'hui »
**Description :** liste ordonnée des tâches du jour, chacune avec son motif. Réalise UJ-1.

#### FR-14 : Règles d'adaptation du MVP
Sept règles déterministes ordonnent les tâches du jour. Déclencheurs, calculés à partir de données saisies : (1) échéance administrative à J-3 ; (2) facture échue à J+1 (non payée, date d'échéance dépassée) ; (3) encaissements cumulés à 90 % d'un plafond suivi (FR-11 ; le ou les plafonds concernés et les seuils d'alerte sont des règles, §9, point 13) ; (4) fin de l'ACRE à M-1, date saisie ; (5) devis ou prospect sans mise à jour depuis 7 jours (périmètre à trancher, §9, point 7) ; (6) pipeline vide (moins de deux missions ou prospects planifiés le mois suivant ; « planifié » à définir, §9, point 8) ; **(7) sprint en cours qui se termine à J-2 avec au moins une story non terminée (17 octobre, décision de l'auteur, reportée ici le 18 octobre)**. Le cockpit lit aussi les sprints : les tâches non faites des stories « en cours » du sprint actif apparaissent avec le motif « dans ton sprint, qui se termine dans N jours ». Ces sept règles sont les seules : l'écran « À faire » (FR-21) n'en ajoute aucune. **Ordre de priorité quand plusieurs règles se déclenchent :** 1, 2, 3, 4, 5, 6 ; la règle 7 et les tâches du sprint passent **après** les six premières ; à priorité égale, la date la plus proche d'abord. `[ASSUMPTION : la règle 7 passe avant les tâches du sprint ; ordre non précisé par l'auteur]`. **Conséquences :** chaque tâche explique « pourquoi aujourd'hui » et affiche son contexte « Client / Mission / Sprint X » quand elle vient d'un sprint ; aucune règle n'est décidée par le modèle de langage ; aucun e-mail n'est envoyé automatiquement (un brouillon est proposé) ; une règle dont la règle réglementaire ou la donnée du profil est « À confirmer » est affichée comme « paramètre manquant », pas ignorée. (18 octobre)

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

### 4.9 Cockpit financier : phase suivante **[APRÈS LE MVP]**
(18 octobre.) Ces trois fonctions complètent le cockpit financier ; elles reposent sur les règles versionnées (FR-10), le profil (FR-25) et les plafonds (FR-11), et ne sont pas construites avant le MVP. Détail : `spec-cockpit-financier.md` (modules A, B et 8).

#### FR-26 : Vue d'ensemble financière
Le cockpit affiche, à partir des données réellement enregistrées (jamais de valeur fictive) : CA encaissé du mois, CA facturé non encaissé, CA cumulé de l'année, objectif mensuel, prévisions de CA à 3, 6 et 12 mois, dépenses professionnelles, cotisations estimées, impôt sur le revenu estimé, TVA à provisionner ou à reverser lorsque le régime le nécessite, trésorerie disponible, réserves recommandées et revenu personnel estimé après provisions. **Conséquences :** chaque indicateur est explicable (calcul, hypothèses, éléments restant à payer) ; le chiffre d'affaires n'est jamais présenté comme un revenu net ; les prévisions sont étiquetées autrement que les données réelles ; tout reste une estimation calculée par le code (§6).

#### FR-27 : Objectifs et progression
Le propriétaire définit un objectif mensuel de CA (2 000 €, 3 000 €, 5 000 € ou montant libre) et voit la progression, l'écart, les jours facturés, le TJM moyen réalisé, le CA nécessaire et une projection. **Conséquences :** si les données sont insuffisantes, l'écran affiche « Données insuffisantes pour établir une prévision fiable. » ; les prévisions se distinguent visuellement des données réelles.

#### FR-28 : Suivi ARE
Le propriétaire qui crée son activité après une période de chômage suit le maintien de son ARE : dates et montants de ses droits, revenus déclarés par période, justificatifs, montants réellement versés, et une estimation mensuelle du complément avec son détail. **Conséquences :** le calcul ne suppose aucune formule universelle (il dépend des règles applicables aux droits, selon leurs dates d'effet, vérifiées à la source) ; les hypothèses sont affichées ; le montant estimé est distingué du montant officiellement notifié, et le montant réellement versé se saisit pour comparer ; des données indispensables manquantes sont signalées ; **aucun montant n'est garanti ni présenté comme une décision administrative** ; le maintien de l'ARE et l'ARCE sont deux dispositifs distincts, documentés sans les mélanger. Dépend de sources et de documents que l'auteur doit fournir (§9, point 14).

## 5. Contraintes, garde-fous et exigences non fonctionnelles

### 5.1 Exigences non fonctionnelles transverses
- **NFR-1 : Performance.** Une page courante s'affiche en moins de 3 secondes ; l'assistant répond en moins de 15 secondes dans la majorité des cas, ou affiche un état d'attente.
- **NFR-2 : Accessibilité.** Écrans principaux utilisables au clavier, contrastes lisibles, libellés de formulaire associés (cible WCAG 2.1 AA sur les parcours UJ-1 à UJ-6). Cibles tactiles d'au moins 44 px sur téléphone ; tout glisser-déposer a son équivalent au clavier avec annonces ; l'interface propose deux thèmes, « Rétro » (clair, pixel art) et « Futur » (sombre, par défaut), changés par le bouton de thème ; la première page est la connexion (17 octobre). Écrans, ton (tutoiement dans l'espace privé, vouvoiement sur le portfolio public) et appareils (ordinateur principal ; téléphone pour la consultation et la saisie légère ; portfolio public lisible sur téléphone) : voir `DESIGN.md` et `EXPERIENCE.md`.
- **NFR-3 : Sécurité.** Voir FR-1 (isolation par ligne), aucune clé secrète côté client, schéma versionné.
- **NFR-4 : Fiabilité et sauvegarde.** Les données du propriétaire peuvent être restaurées après une erreur ; une sauvegarde est vérifiée avant le passage aux vraies données.
- **NFR-5 : Traçabilité de la démarche.** `docs/journal.md` consigne les prompts, les décisions, les bugs et les corrections ; les résultats du jeu de test du RAG sont enregistrés à chaque itération (au moins trois exécutions datées, avec le score), pour montrer l'amélioration ; les essais réels de l'IA de conception sont notés dans `docs/ia-backlog-tests.md` (17 octobre).

### 5.2 Contraintes et garde-fous
- **Pas de conseil fiscal ou juridique généré par l'IA.** Les provisions et cotisations sont des estimations, jamais des montants officiels.
- **Règles réglementaires (18 octobre) :** aucune valeur réglementaire n'est codée en dur sans source officielle identifiée, datée et vérifiée (Légifrance, Entreprendre.Service-Public.fr, Urssaf, Impots.gouv.fr, France Travail) ; une règle historique n'est jamais présentée comme actuelle ; une règle non vérifiée ne produit jamais un calcul présenté comme fiable ; une donnée personnelle inconnue reste « À confirmer » (FR-10, FR-25).
- **Données personnelles et RGPD :** hébergement dans l'Union européenne (base Supabase UE, fonctions Vercel en région Paris) ; les extraits de notes sont envoyés à Anthropic (réponses) et à Mistral AI (embeddings) ; le brief, les notes cochées, les stories, les tâches, les précisions et les objectifs saisis pour l'aide à la conception (FR-23) et la génération de prompt (FR-24) sont envoyés à Anthropic (la mention est affichée dans chaque panneau) ; un prompt généré va ensuite là où le propriétaire le colle (autre outil, autre fournisseur) : à documenter avant toute donnée réelle.
- **Gouvernance des données :** une seule base ; données fictives pendant le Workshop 8 ; au passage à l'outil pro, purge (embeddings et historique de chat inclus), seul le portfolio est conservé ; le MCP Supabase est autorisé tant que la base ne contient que des données fictives (lecture seule hors modification du schéma, approbation manuelle) et débranché avant la première vraie donnée client.
- **Sécurité :** aucune clé secrète côté client, dans le code ou dans un commit ; schéma versionné dans `supabase/migrations/`.
- **Langue :** interface en français, code et commits en anglais.

## 6. Non-objectifs
- Facturation légale ou électronique, calcul officiel de cotisations, d'impôt ou de TVA, agenda complet. Les estimations calculées par le code, expliquées et étiquetées « estimation » restent permises (cotisations au MVP ; impôt sur le revenu et TVA en phase suivante, FR-26). (18 octobre)
- IA qui conseille en fiscal ou en juridique, « précision absolue » promise, mise à jour autonome des taux ; garantie d'un montant d'allocation ou simulation présentée comme une décision administrative (FR-28). (18 octobre)
- Envoi d'e-mails automatique, suivi d'ouverture de liens chez les prospects.
- Estimation des user stories en heures (points seulement) ; exécution du prompt généré par LogMerry ; enregistrement des propositions de l'IA avant accord du propriétaire. (17 octobre)

## 7. Périmètre par phases

### 7.1 Contraintes de calendrier
- La contrainte réelle est la **date**, pas les heures : la formation se termine le 8 février 2027. Les 130 h du Workshop 8 sont une estimation, dépassable.
- Capacité déclarée : 35 h par semaine, hors semaine du 12 octobre 2026 `[ASSUMPTION : déclarée par l'auteur, non vérifiée sur la durée]`. Il reste environ 195 h de travail (Workshop 8, Workshop 9 de 10 h, Workshop 10 de 75 h), à répartir sur environ 17 semaines.
- Option écartée : sacrifier du périmètre pour tenir 130 h.
- **Périmètre ajouté le 18 octobre** (règles versionnées, profil, plafonds multiples, calendrier) : `[ASSUMPTION : non chiffré, à estimer avec les stories des epics 4 et 5 ; la contrainte reste la date du 8 février 2027]`.

### 7.2 Jalon 30 octobre 2026 : tranche RAG de bout en bout
FR-1, FR-2, FR-3, FR-4, FR-5, FR-6, FR-19. S'il n'est pas atteint : aucune nouvelle fonction, correction du RAG d'abord.

### 7.3 MVP, après le RAG
Ordre de livraison : (1) résumé automatique des notes (FR-20), CRM, missions en agile avec backlog, tâches et sprints, aide de l'IA à leur conception et génération de prompt (FR-7, FR-8, FR-23, FR-24), suivi de devis (FR-22) ; (2) profil professionnel et règles versionnées, factures et encaissements, plafonds et estimations (FR-25, FR-10, FR-9, FR-11, FR-12) ; (3) échéances et calendrier, cockpit et éléments à documenter (FR-13 à FR-15, FR-21) ; (4) réalisations (FR-16). Le catalogue d'outils et le brouillon de devis (FR-17, FR-18) sont hors MVP (§7.4). Le calendrier (§7.1) n'impose aucune coupe pour l'instant.

### 7.4 Après le MVP et version 2
- **Phase suivante « cockpit financier » (18 octobre) :** vue d'ensemble financière (FR-26), objectifs et progression (FR-27), suivi ARE (FR-28), décrits en §4.9.
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
5. Valeurs de référence (taux de l'ACRE, seuils de TVA, périodicité de déclaration) : fournies par l'auteur, **non vérifiées**, à confirmer à la source avant usage. (18 octobre) Statut : micro-entreprise BNC, déclaré par l'auteur ; **pas de date d'immatriculation** pour l'instant : le prorata de la première année, la fin de l'ACRE et la règle 4 affichent « paramètre manquant » tant qu'elle n'est pas saisie.
6. ~~Lien entre le backlog ou les sprints et le cockpit~~ : tranché le 17 octobre par l'auteur (septième règle et tâches du sprint, FR-14) et reporté ici le 18 octobre ; l'ordre entre la règle 7 et les tâches du sprint reste une hypothèse (§10).
7. (18 octobre) Règle 5 de FR-14 : alerte sur les devis « envoyés » seulement, ou aussi sur les prospects sans mise à jour depuis 7 jours ? Les critères de la story 5.4 et FR-22 ne parlent que des devis.
8. (18 octobre) Règle 6 de FR-14 : que veut dire « planifié le mois suivant » pour des missions (dates facultatives, sprints) et des prospects (sans date) ?
9. (18 octobre) Devis accepté : « mission créée ou confirmée » (FR-22, UX) : que crée-t-on pour un devis sur un prospect (titre, client, passage du prospect en client) et que veut dire « confirmée » ?
10. (18 octobre) Le suivi ARE (FR-28) reste-t-il après le MVP ? Décision implicite de l'auteur (modules A, B et 8 en phase suivante), à confirmer.
11. (18 octobre) Base de calcul de chaque plafond (hors taxe ou toutes taxes comprises, période, catégories de recettes) : à écrire avec la règle et sa source ; peut exiger des champs sur les factures et les encaissements (FR-9).
12. (18 octobre) Les 6 cas de référence calculés à la main (FR-11) et les règles « prorata de la première année », « bascule de TVA » et fin de l'ACRE, avec leurs sources : à écrire par l'auteur ; ils deviennent les tests associés des règles.
13. (18 octobre) Quel(s) plafond(s) et quel(s) seuil(s) d'alerte (50, 75, 90, 100 %) déclenchent une tâche du cockpit (règle 3) : le seuil de 90 % seul, ou les seuils configurés ?
14. (18 octobre) Suivi ARE : sources officielles et documents France Travail de l'auteur (dates de droits, montants, changements réglementaires applicables) à fournir avant toute spécification de calcul.

## 10. Index des hypothèses
- §7.1 : capacité de 35 h par semaine sur environ 17 semaines, déclarée, non vérifiée.
- §9, point 5 : statut de micro-entreprise (BNC) et valeurs de référence déclarés par l'auteur, non vérifiés ; date d'immatriculation inconnue.
- §7.1 : le périmètre financier ajouté le 18 octobre (règles versionnées, profil, plafonds multiples, calendrier) n'est pas chiffré.
- FR-14 : la règle 7 est placée avant les tâches du sprint, ordre non précisé par l'auteur.

## 11. Évolutions depuis le 13 octobre 2026 (17 octobre)
Décisions de l'auteur prises pendant la construction, reportées ici pour que ce PRD reste la référence :
- **16 octobre : méthode agile.** « Étapes datées » remplacées par backlog, user stories, tâches et sprints (FR-8, glossaire, UJ-4).
- **16 octobre : aide de l'IA à la conception** (FR-23) : backlog (8.16), tâches (8.17) ; relecture, sprint, ordre et tâches avec le backlog à suivre.
- **15 et 16 octobre : interface.** Thème clair « Arcade clair » (pixel art), thème sombre par défaut avec la connexion en première page (l'écran de choix « Rétro » / « Futur » a été retiré le 17 octobre : plus sobre), message du cockpit écrit au clavier, refonte mobile (cibles de 44 px), stories compactes et glisser-déposer (`DESIGN.md`, `EXPERIENCE.md`).
- **17 octobre : prompt de mission** (FR-24), l'IA rédige la consigne et le code recopie le contexte.
- **Idées gardées pour plus tard :** pièces jointes aux notes (§7.4).

## 12. Évolutions du 18 octobre 2026
- **Aide de l'IA à la conception terminée :** tâches avec les stories (8.17b), relecture d'une story (8.18), composition d'un sprint (8.19) et ordre du backlog (8.20) sont livrées (FR-23).
- **Sprints :** glisser-déposer entre le backlog et les sprints, sprint clos figé, noms automatiques « Sprint N » par mission, un sprint appartient toujours à une mission (FR-8). Le cockpit affiche « Client / Mission / Sprint X » et lit les sprints (septième règle, FR-14).
- **Cockpit financier (spec de l'auteur du 18 octobre) :** règles réglementaires versionnées (FR-10), plafonds multiples avec alertes (FR-11), profil professionnel (FR-25) et calendrier administratif (FR-13) entrent dans le MVP ; vue d'ensemble, objectifs et suivi ARE sont une phase suivante (§4.9). Contrainte transverse : aucune valeur réglementaire sans source officielle datée et vérifiée, une donnée inconnue reste « À confirmer ».
- **Décisions de l'auteur :** statut micro-entreprise BNC (à confirmer à la source), pas encore de date d'immatriculation ; les règles de prorata de première année et de bascule de TVA sont à écrire avec leurs sources, pas à deviner.
