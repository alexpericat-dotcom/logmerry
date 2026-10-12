---
status: final
created: 2026-10-11
updated: 2026-10-12
name: LogMerry
sources:
  - _bmad-output/planning-artifacts/prds/prd-logmerry-2026-10-10/prd.md
---

# LogMerry : Experience Spine

> Guide de lecture : Information Architecture, Component Patterns et Key Flows pour savoir quoi construire et où ; Voice and Tone et State Patterns pour les messages et états ; Interaction Primitives et Accessibility Floor pour le clavier et l'accessibilité ; Open items pour les décisions et hypothèses restantes.

> Termes du glossaire du PRD repris tels quels : Propriétaire, Note, Extrait, Citation, Mission, Étape, Paramètre, Estimation, Encaissement, Échéance, Règle d'adaptation, Réalisation. Les exigences sont référencées par numéro (FR-n), pas recopiées. En cas de conflit, DESIGN.md et EXPERIENCE.md l'emportent sur toute maquette (`mockups/`).

## Foundation

Application web, **ordinateur d'abord (Mac)**, interface en français. shadcn/ui (style new-york, base neutral, icônes lucide, `next-themes` clair/sombre) sur Next.js + Tailwind 3. `DESIGN.md` est la référence visuelle ; les jetons sont cités sous la forme `{colors.primary}`. Ce document ne décrit que le comportement qui s'ajoute aux défauts shadcn. Maquettes de référence : voir `DESIGN.md`, Brand & Style. Un seul utilisateur (le Propriétaire, FR-1) ; le visiteur du portfolio public est anonyme et en lecture seule (FR-16). Téléphone : consultation et saisie légère (voir Responsive & Platform).

## Information Architecture

Barre latérale fixe à gauche, repliable en icônes, le Cockpit en première entrée. L'assistant est un panneau ouvrable depuis toute page.

| Surface | Accessible depuis | But | Exigences |
|---|---|---|---|
| Connexion, inscription, mot de passe oublié | Lien d'accès, déconnexion | Accès sécurisé (scène B, dégradé décoratif) | FR-1 |
| Cockpit « Aujourd'hui » | Première entrée, ouverture de l'application | Tâches du jour avec motif, ligne de synthèse des éléments à documenter, jauge de plafond, chiffres étiquetés ([maquette](mockups/key-cockpit.html)) | FR-14, FR-15 |
| Assistant (panneau) + Historique | Bouton ou raccourci, toute page ; historique dans le panneau | Question, réponse citée, échanges conservés ([maquette](mockups/key-assistant.html)) | FR-4, FR-5, FR-12 |
| Notes (liste, éditeur, recherche) | Barre latérale | Base de connaissances, résumé généré | FR-3, FR-19, FR-20 |
| Clients / prospects / contacts | Barre latérale ; création depuis une Note | CRM minimal | FR-7 |
| Missions et Étapes | Barre latérale ; fiche client | Découpage et avancement | FR-8 |
| Factures et Encaissements | Barre latérale | Statut payé ou non, saisie des Encaissements | FR-9 |
| Échéances | Barre latérale ; Cockpit | Obligations datées avec source | FR-13 |
| Paramètres | Barre latérale | Valeurs avec source et date de vérification | FR-10 |
| Réalisations (gestion) | Barre latérale | Édition, accord client, publication | FR-16 |
| À faire | Barre latérale ; bouton de l'assistant ; ligne de synthèse du Cockpit | Éléments à documenter plus tard (Notes brouillons) | UJ-2 |
| Portfolio public (lien « m'écrire » au MVP ; formulaire de contact après MVP) | Lien public, sans connexion | Vitrine en lecture seule (scène A, [maquette](mockups/key-portfolio.html)) | FR-16 |

Catalogue d'outils (FR-17/18) : hors MVP et hors navigation. Pas d'écran revenus séparé : la jauge de plafond se trouve uniquement dans le Cockpit. Une modale s'ouvre sur une page, jamais sur une autre modale.

## Voice and Tone

Ce chapitre fixe le microcopy. La voix de marque (rigoureux, efficace, soigné, réfléchi) est dans `DESIGN.md`, Brand & Style. **Tutoiement** dans l'espace privé (Cockpit, assistant, Notes) ; **vouvoiement** sur le portfolio public. Phrases courtes, verbes d'action, pas de point d'exclamation hors félicitation.

| Situation | Message |
|---|---|
| Toutes les tâches du jour faites | « Bravo, tu as fait toutes tes tâches du jour. » (MVP). Proposition « Tu veux prendre de l'avance sur ce qui arrive ? » (après MVP) avec deux boutons de même poids visuel « Oui, voir la suite » et « Non, c'est bon pour aujourd'hui » (après MVP). Si la source des tâches futures n'est pas décidée : félicitation seule, sans proposition. |
| Aucun résultat de l'assistant | « Je n'ai trouvé aucune procédure documentée correspondant à cette requête. » |
| Bouton après aucun résultat | « Créer une note à documenter plus tard » |
| Ligne de synthèse des éléments à documenter (Cockpit) | « 2 procédures à documenter » (lien vers À faire ; règle d'affichage : `backlog-summary`, Component Patterns) |
| Élément à documenter créé | « À faire : rédiger procédure transfert n8n » (titre dérivé de la requête initiale) |
| Boutons de source | « Copier le texte », « Ouvrir » |
| Paramètre absent | « paramètre manquant » (jamais un chiffre à la place) |
| Chiffre calculé | étiquette « estimation » |
| Résumé de Note | étiquette « résumé généré » |
| Refus hors périmètre (fiscal, juridique) | « Je préfère ne pas te répondre là-dessus : c'est du conseil fiscal ou juridique, et je pourrais me tromper sur ta situation. Un comptable ou un juriste saura te guider. Je peux en revanche t'expliquer d'où viennent les chiffres affichés dans LogMerry. » Aucune recommandation (FR-12). |

Portfolio public : vouvoiement, texte sobre, aucune donnée privée ni nom de client sans accord.

## Component Patterns

Comportement ; l'aspect est dans `DESIGN.md`, Components.

| Composant | Règles de comportement |
|---|---|
| `task-row` | **Comportement.** Ordre fixé par les Règles d'adaptation (FR-14), pas par l'IA. Chaque ligne montre son **motif visible** (« pourquoi aujourd'hui »), en texte avec icône. Cocher = retour de satisfaction (coche + titre barré), la ligne se réordonne. Décocher est possible. Un clic sur le titre ouvre l'élément source (Échéance, facture, devis).<br>**Réordonnancement et focus.** Le focus reste sur la case actionnée, qui suit sa ligne (même nœud DOM déplacé, `key` stable, pas de remontage). Annonce en `role="status"` : « {titre} terminée, {n} restantes, déplacée en position {k} » ; à la réouverture : « {titre} rouverte, {n} restantes ». Règle unique, reprise par renvoi dans Interaction Primitives et UJ-1.<br>**Dernière tâche.** Le bloc « Bravo » reçoit `role="status"`, le focus reste sur la case ; (après MVP) les deux boutons de la proposition sont les arrêts de tabulation suivants.<br>**Cible.** Zone cliquable de la case ≥ 24 px (`::after` étendu), sans chevauchement avec le lien du titre. |
| `backlog-summary` | Ligne de synthèse **sous** la liste des tâches du Cockpit : icône + « {n} procédure(s) à documenter », le texte est un lien vers l'écran À faire. Au singulier pour 1, **masquée à 0** (règle unique, citée aussi dans Voice and Tone). Ce n'est **pas une tâche** : pas de case, hors liste du jour et hors ordre FR-14 (qui reste à six règles), pas de motif. Le comptage se met à jour au retour sur le Cockpit. |
| `plafond-bar` | **Comportement.** Piste, remplissage, **marqueur 90 %** (FR-14 règle 3). Le chiffre et le seuil sont en texte, jamais la couleur seule. Accompagnée de `estimation-label` et des Paramètres sources ; « estimation » et date de vérification du plafond affichées. Au franchissement du seuil, le texte adjacent affiche « seuil de 90 % atteint » précédé d'une icône.<br>**Accessibilité.** `role="meter"`, `aria-label="Plafond de chiffre d'affaires (estimation)"`, `aria-valuemin=0`, `aria-valuemax={plafond}`, `aria-valuenow={cumul}`, `aria-valuetext="{cumul} € sur {plafond} €, soit {p} % ; seuil de 90 % : {seuil} €"`. Marqueur `aria-hidden` (information portée par `aria-valuetext` et le texte adjacent). Si la valeur a changé depuis la dernière visite : `role="status"` « Plafond mis à jour : {p} % (estimation) ».<br>**États et mise à jour.** Paramètre absent : aucun `meter`, seulement le message d'état. Plafond absent ou périmé : voir État « paramètre manquant ». Mise à jour **au retour sur le Cockpit** après saisie d'un Encaissement ou d'un Paramètre : pas de temps réel entre onglets, pas de bouton d'actualisation ; calcul serveur identique à FR-11, aucun second calcul. |
| `estimation-label` | Présente sur tout montant calculé (FR-11, FR-15) ; lien vers les Paramètres et dates de vérification utilisés. |
| `assistant-panel` | **Comportement.** Ouvert en un geste depuis toute page (bouton, raccourci). **Non modal** : `<aside aria-label="Assistant">` placé après `main` dans le DOM, pas de piège de focus, fond non inerte ; à l'ouverture le focus va au champ de saisie. Il réduit la largeur de `main` (colonne de grille) sans le recouvrir (poussé plutôt que superposé, voir Open items). Accepte les requêtes courtes en mots-clés, sans reformulation. Conserve la conversation quand l'utilisateur change de page ; en dessous de 1024 px il occupe toute la largeur.<br>**Réponse.** 1) texte d'abord, résumé en 2 à 3 puces lisibles en diagonale ; 2) sources dessous, une `citation-chip` par Citation ; 3) par source, « Copier le texte » (copie l'Extrait, confirmation brève en `role="status"`) et « Ouvrir » (document complet, à consulter après le rendez-vous).<br>**Accessibilité.** Les puces gardent chacune une Citation valide (FR-4) : vrais `<ul><li>`, chaque puce porte un repère « [1] » (lien « Source 1 : {titre de la Note} ») ; les sources forment une `<ol>` nommée « Sources ». Annonces : pendant la génération `role="status"` « Recherche dans tes notes… » ; à la fin un seul message « Réponse prête, 3 sources » ; le texte de la réponse n'est pas dans une région live et le focus ne bouge pas.<br>**États.** Erreur ou attente > 15 s : `role="status"` + « Réessayer ». |
| `citation-chip` | Lien (navigation) ou bouton (copie), jamais un `div` cliquable ; cible ≥ 24 px. Ouvre la Note source à l'Extrait, dans le même onglet (sinon « (nouvel onglet) » dans le nom accessible) ; le focus va à l'Extrait (`tabindex="-1"`), surligné par fond + contour (pas la couleur seule) ; le panneau reste ouvert. La source est relue en base par identifiant (FR-4). |
| `data-table` | Tri, filtre (statut, étiquette d'origine, FR-7), recherche ; chiffres et dates tabulaires alignés à droite ; `<table>` natif avec `<caption>` masquée visuellement ; `th scope="col"` ; colonne triable = `<button>` dans le `th` portant `aria-sort="ascending|descending"` (un seul `th` actif), colonnes non triables sans bouton ; focus et ordre conservés après tri. Ligne cliquable : le lien (nom du client) est dans la 1re cellule, étendu à la ligne par CSS ; pas de `role` ni d'`onClick` sur `tr`. Après filtre ou recherche : `role="status"` « 12 clients sur 40 ». Défilement horizontal dans un conteneur focalisable (`tabindex="0"`) nommé. Pas de dégradé. |
| Formulaires | **Champs obligatoires (minimum)** : prospect = nom + origine ; Mission = client + titre ; Étape = titre + date ; devis = montant + date d'envoi (statut « envoyé » par défaut ; « accepté », « refusé » ; remarque facultative ; accepté = Mission créée ou confirmée, refusé = tâche du Cockpit retirée ; pas de document) ; Échéance = date + source (FR-13 ; enregistrement refusé si la source manque). Tout le reste en divulgation progressive (« Plus de champs », modifiable plus tard). Libellé associé à chaque champ, erreur en ligne + récapitulatif. Champs requis : « (obligatoire) » dans le libellé + `aria-required`. Erreur : `aria-invalid` + `aria-describedby`, récapitulatif en tête (focus dessus, sans `role="alert"` en plus), ses liens déplacent le focus sur le champ. Date : saisie texte JJ/MM/AAAA, format indiqué dans le libellé, sélecteur `Calendar` optionnel navigable aux flèches ; date de vérification d'un Paramètre préremplie à aujourd'hui. Montant : `inputmode="decimal"`, virgule acceptée. `autocomplete` sur les champs d'identité. « Plus de champs » : `aria-expanded`/`aria-controls`. Toute information déjà saisie dans le parcours (client, Mission) est préremplie, jamais redemandée. |
| Contact (portfolio public) | **MVP : `mailto-link`.** Lien « m'écrire » (`mailto:`), souligné, `{colors.primary}`, cible ≥ 24 px, focus visible `{colors.ring}`. Aucune écriture en base : la page reste en lecture seule (FR-16), aucun e-mail automatique. Vouvoiement autour (« Vous pouvez m'écrire »).<br>**Après MVP : `contact-form`.** Vouvoiement. Champs : nom, e-mail, message, tous avec libellé visible, `aria-required`, `autocomplete="name"`/`"email"`. Erreurs : récapitulatif en tête (focus) + erreur en ligne reliée par `aria-describedby`, saisie conservée. Envoi : bouton désactivé seulement pendant l'envoi ; succès dans une région `role="status"` (« Message envoyé. ») ; échec : message d'erreur + « Réessayer ». Anti-spam sans test cognitif : champ piège masqué (`aria-hidden`, `tabindex="-1"`), délai minimal de soumission, limitation de débit côté serveur ; aucun CAPTCHA à image, énigme ou calcul. Destination : table de demandes en insertion seule (voir Open items). |
| `status-badge` | Voir `DESIGN.md`, Components (icône + texte, la couleur n'est qu'un renfort). |
| `gradient-banner` | Voir `DESIGN.md`, Components. Décoratif, au-dessus de la liste des tâches uniquement ; ne porte que le titre de page en Forest. |
| Sidebar | Libellé visible en texte ; quand la barre est repliée, `aria-label` ; page courante `aria-current="page"` + indicateur non coloré (règle F-03, Interaction Primitives) ; bouton de repli `aria-expanded`, état mémorisé ; infobulle au survol et au focus, survolable et fermable par Esc (WCAG 1.4.13). Téléphone (`Sheet`) : focus sur le premier lien à l'ouverture, retour au bouton à la fermeture. |
| Toasts | Informatif : `role="status"`, 6 s minimum, pause au survol et au focus ; avec action : persistant jusqu'à fermeture ; fermables au clavier ; coin bas gauche, hors panneau et hors zone de focus. |
| Éditeur de Note | `role="textbox"` multiligne nommé ; barre d'outils `role="toolbar"` à tabindex itinérant ; Tab sort de l'éditeur (pas de piège) ; Esc ne le quitte que sans menu ouvert ; fin de génération du résumé : `role="status"` « résumé généré ». |
| Réalisation (édition) | Champs : titre (obligatoire), description courte (obligatoire), captures (facultatives, texte alternatif obligatoire), chiffre de résultat (facultatif, publiable seulement avec l'accord), stack en étiquettes (facultative), accord du client (obligatoire ; bloque la publication tant qu'il manque), nom du client (facultatif ; « Client, secteur X » tant que l'accord manque), étiquette d'origine (obligatoire : client réel, formation, ami, démo). |
| Réalisation (publiée) | Chaque capture publiée exige un texte alternatif saisi dans l'éditeur (bloquant à la publication), d'une phrase décrivant ce que la capture montre ; capture décorative marquée `alt=""` explicitement. Le chiffre de résultat est du texte, pas une image. |

## State Patterns

| État | Où | Traitement |
|---|---|---|
| Vide | Toute liste (Notes, clients, Missions…) | Phrase d'explication + une action principale. Cockpit sans tâche : message de félicitation (au MVP : félicitation seule, sans proposition). |
| Chargement | Chargement initial, réponse de l'assistant | `Skeleton` aux dimensions de la liste ; assistant : indicateur d'attente statique avec texte « Recherche dans tes notes… » (NFR-1 : état d'attente si > 15 s). |
| Erreur | Réseau, enregistrement, assistant | Message en texte + icône d'erreur, action « Réessayer », saisie conservée ; formulaire : récapitulatif d'erreurs en tête, focus dessus. |
| Paramètre manquant | Jauge de plafond, Règles d'adaptation, estimations | Pas de chiffre : « paramètre manquant : plafond non renseigné » + lien vers Paramètres (FR-10, FR-11, FR-14). Icône d'avertissement + texte. |
| Refus de l'assistant | Panneau assistant | Message chaleureux et explicite, qui renvoie vers un professionnel, aucune recommandation (FR-12). |
| Estimation | Tout montant calculé | `estimation-label` + Paramètres sources et dates (FR-11). Jamais un montant officiel. |
| Résumé généré | Éditeur de Note | Étiquette « résumé généré », lien vers la Note source, actions Régénérer / Ignorer ; jamais enregistré à la place de la Note (FR-20). |
| Aucun résultat | Assistant ; recherche (FR-19) | Assistant : message exact de Voice and Tone + « Créer une note à documenter plus tard ». Recherche : « Aucun résultat » explicite. Jamais de règle inventée. |
| Vide (public) | Portfolio | Aucune Réalisation publiée : message sobre, vouvoiement. |

## Interaction Primitives

Raccourcis **dans l'application** (une application web n'a pas de raccourci système global) :

| Raccourci | Action |
|---|---|
| `⌘K` | Ouvrir la palette de commandes : recherche (FR-19) et assistant |
| Dans la palette | Entrée « Demander à l'assistant : {requête} » : Entrée l'envoie au panneau assistant ; les résultats de recherche (Notes, clients, Missions) suivent en dessous `[ASSUMPTION : ordre des entrées et action d'Entrée par défaut à confirmer par Alex]` |
| `Esc` | Ferme d'abord le niveau le plus haut (menu ou popover > modale > panneau > mode édition) ; ne supprime jamais de saisie (brouillon conservé, ou confirmation si modifications non enregistrées) |
| `Espace` sur une `task-row` | Cocher/décocher |

- **Raccourcis** : chacun a un bouton équivalent visible, dont le nom accessible est « Rechercher » ou « Ouvrir l'assistant » et `aria-keyshortcuts` ; inactif pendant une composition IME ; liste dans le menu d'aide. Réserves de navigateur (`⌘K`) : `preventDefault` écrase une fonction du navigateur ; à valider sur Safari, Chrome et Firefox Mac (voir Open items).
- **Élément actif, survol, sélection clavier (F-03)** : fond `{colors.accent}`, **toujours** doublé d'un indicateur non coloré : barre de 3 px `{colors.primary}` dans la barre latérale, sinon gras ou coche. Jamais la teinte seule.
- **Focus** : visible partout (`{colors.ring}`), jamais masqué par la barre latérale, le panneau assistant ou un élément sticky (`scroll-padding` égal à la hauteur des éléments sticky). À l'ouverture du panneau le focus va au champ de saisie ; à la fermeture il revient à l'élément qui avait le focus avant l'ouverture (y compris quand l'ouverture vient du raccourci) ; s'il n'existe plus, au `h1` de la page.
- **Réordonnancement** : voir `task-row`, Component Patterns (règle unique : focus sur la case, annonce `role="status"`).
- Pas de glisser-déposer obligatoire ; pas de survol comme seule affordance.
- Dégradés non animés ; `@media (prefers-reduced-motion: reduce)` : aucune animation : réordonnancement, panneau, `Skeleton` (sans pulsation), toasts et défilement doux changent d'état instantanément ; retour de satisfaction = coche + titre barré, sans mouvement ; indicateur d'attente en texte statique.

## Accessibility Floor

Comportement ; les contrastes mesurés sont dans `DESIGN.md`, Colors (NFR-2).

- WCAG 2.1 AA sur tous les écrans, au minimum UJ-1 à UJ-3.
- Langue : `<html lang="fr">` sur toutes les pages, y compris le portfolio public ; tout passage ou terme en anglais porte `lang="en"`.
- Titres et navigation : un seul `h1` par page = titre de page (`{typography.display}`), sections en `h2`, sans saut de niveau (le niveau est sémantique, indépendant de la taille) ; `<title>` = « {Page} · LogMerry » ; à chaque navigation le focus va au `h1` (`tabindex="-1"`) et le titre est annoncé.
- Cibles : toute cible interactive ≥ 24 × 24 px (hors texte courant), 32 px recommandé sur ordinateur.
- Reflow : contenu utilisable sans défilement bidirectionnel à 320 px (hors tableaux, qui défilent dans un conteneur focalisable nommé).
- Authentification : e-mail + mot de passe avec `autocomplete="username|current-password|new-password"`, collage autorisé, gestionnaires de mots de passe supportés, bouton « Afficher le mot de passe » (`aria-pressed`) ; aucune énigme ni CAPTCHA, réinitialisation sans test cognitif ; erreurs qui nomment le champ. Expiration de session : brouillon de Note conservé localement, message `role="alert"`.
- Mode contraste forcé : `outline: 2px solid Highlight` ; ne jamais supprimer `outline` sans équivalent ; jauge, marqueur et case cochée via `border`/`outline`.
- Texte 4,5:1 ; non-texte (bordures de champs, focus, jauge, marqueur) 3:1, clair et sombre.
- Jamais la couleur seule : états, jauge, coche, statuts portent icône et texte.
- Focus visible et non masqué ; ordre de tabulation = ordre de lecture.
- Lien d'évitement « Aller au contenu » en premier arrêt sur toutes les pages, y compris la page publique (cible `#main` focalisable, `tabindex="-1"`) ; repères (`nav`, `main`, `aside`).
- Formulaires : libellés associés, erreur en ligne, **récapitulatif d'erreurs** en tête de formulaire avec liens vers les champs.
- `prefers-reduced-motion` respecté ; dégradés `aria-hidden` quand décoratifs.
- Panneau assistant : région nommée (`aside`), annonces limitées à l'état (voir `assistant-panel`) ; sources en liens ou boutons à cible d'au moins 24 px.

## Responsive & Platform

| Largeur | Comportement |
|---|---|
| Ordinateur (≥ 1024 px, cible Mac) | Barre latérale fixe (repliable), panneau assistant à droite, tableaux pleine largeur |
| Tablette | Barre latérale en icônes, nom accessible sur chaque entrée. [ASSUMPTION : valeur du point de rupture tablette à fixer à l'implémentation] |
| Téléphone | **Consultation** (Cockpit, Notes) et saisie légère, sans optimisation de la saisie lourde au MVP ; barre latérale en `Sheet` ; le portfolio public reste lisible |

## Key Flows

### UJ-1 : Alex ouvre son Cockpit un lundi matin (Alex, 8 h, Mac)

1. Alex se connecte et arrive sur le Cockpit « Aujourd'hui ».
2. Il regarde d'abord les tâches du jour ; chacune porte son motif (« échéance administrative dans 3 jours », « facture échue depuis 1 jour », « devis sans réponse depuis 7 jours »). Sous la liste, la ligne de synthèse `backlog-summary` (« 2 procédures à documenter », lien vers À faire ; règles dans Component Patterns).
3. Il coche la première ; retour de satisfaction, la liste se réordonne (annonce et focus : voir `task-row`).
4. Il continue jusqu'à la dernière tâche.
5. **Climax :** toutes les tâches du jour sont faites ; le message « Bravo, tu as fait toutes tes tâches du jour » s'affiche, suivi (après MVP) d'une proposition de prendre de l'avance sur des tâches futures avec ses deux boutons (opt-in : jamais imposée, jamais décidée par l'IA, SM-C1). Au MVP : félicitation seule.

Cas limite : si un Paramètre fiscal est absent, la jauge de plafond affiche « paramètre manquant » au lieu d'un chiffre.

### UJ-2 : Alex retrouve une procédure pendant un rendez-vous (Alex, visio Google Meet)

1. Un client pose une question pointue sur la procédure (transfert de propriété du serveur n8n, dépassement du quota d'heures) ; Alex ouvre le panneau assistant dans un coin de l'écran.
2. Il saisit en mots-clés : « procédure transfert n8n client », « CGV dépassement heures ».
3. Le texte arrive d'abord, en 2 à 3 puces lisibles en diagonale.
4. Les sources s'affichent dessous.
5. **Climax :** Alex clique sur « Copier le texte » sur une source et le colle dans le chat de la visio ; après l'appel, « Ouvrir » affiche le document complet.

Cas limite : la base ne contient rien ; « Je n'ai trouvé aucune procédure documentée correspondant à cette requête. » Alex clique sur « Créer une note à documenter plus tard » ; la requête initiale entre dans À faire comme élément à documenter (« À faire : rédiger procédure transfert n8n »), à traiter en fin de journée, et la conversation reste ouverte. Le lendemain, le Cockpit rappelle cet élément par la ligne « 1 procédure à documenter » (`backlog-summary`).

### UJ-3 : Une visiteuse consulte une Réalisation publiée (Camille, gérante d'une petite agence qui cherche à automatiser sa facturation ; personnage fictif)

1. Camille ouvre sur ordinateur le lien reçu par e-mail.
2. En dix secondes elle perçoit : rigoureux, efficace, soigné, réfléchi (scène A).
3. Elle ouvre une Réalisation : description, captures d'écran, chiffre de résultat, stack utilisée.
4. **Climax :** elle contacte Alex depuis la page publique : lien « m'écrire » (`mailto-link`) au MVP, sans formulaire ; formulaire de contact (`contact-form`) après MVP.

Elle ne voit jamais le nom du client sans son accord ni une donnée privée (FR-16).

### UJ-4 : Alex saisit son activité après un premier rendez-vous (Alex) `[NOTE FOR UX : absent du PRD]`

1. Alex crée le prospect depuis la Note de rendez-vous (nom + origine).
2. Le prospect devient client, puis Alex crée la ou les Missions (client + titre).
3. Il ajoute des Étapes datées (titre + date), puis le devis (montant + date d'envoi, statut « envoyé » par défaut ; « accepté » ou « refusé » ensuite), puis les Échéances (date + source).
4. Chaque formulaire n'exige que ses champs minimaux ; le reste reste en divulgation progressive.
5. **Climax :** il ouvre le Cockpit et voit l'effet de sa saisie : les tâches issues de ses Étapes et Échéances apparaissent avec leur motif.

### UJ-5 : Alex enregistre un paiement et règle son plafond (Alex) `[NOTE FOR UX : absent du PRD]`

1. Alex marque une facture payée et saisit l'Encaissement (la seule base du calcul, FR-9).
2. Il ouvre Paramètres et renseigne le plafond, avec source et date de vérification.
3. **Climax :** il retourne au Cockpit et voit la jauge de plafond se mettre à jour, étiquetée « estimation » (mise à jour au retour sur le Cockpit, sans bouton d'actualisation).

Cas limite : si le plafond manque, la jauge est en état « paramètre manquant », sans chiffre.

## Open items

- `[NOTE FOR UX]` UJ-4 et UJ-5 absents du PRD (qui s'arrête à UJ-3) : à reporter par bmad-prd.
- `[ASSUMPTION]` Raccourci `⌘K` (palette de commandes unique : recherche et assistant) : à tester sur Safari, Chrome et Firefox Mac ; ordre des entrées de la palette et action d'Entrée par défaut à confirmer (détail : Interaction Primitives).
- `[DECISION]` Panneau assistant poussé plutôt que superposé : confirmé par Alex.
- **À reporter dans le PRD** :
  - écran « À faire » (éléments à documenter, Note brouillon) et ligne de synthèse du Cockpit (FR-14 reste à six règles) ;
  - suivi de devis (montant, date d'envoi, statut envoyé/accepté/refusé) ;
  - champs de Réalisation (accord, nom du client masqué, étiquette d'origine) ;
  - contact = lien mailto au MVP, formulaire après MVP ;
  - « prendre de l'avance » après MVP, avec les deux boutons, marqués « après MVP » (tâches futures = Étapes à venir et Échéances des 30 jours, date la plus proche, 3 au plus, étiquetées « à venir », opt-in strict SM-C1) ;
  - import Notion/PDF après MVP ;
  - catalogue d'outils (FR-17/18) hors MVP, le rappel d'Échéance (FR-13) ne s'applique pas au catalogue.
