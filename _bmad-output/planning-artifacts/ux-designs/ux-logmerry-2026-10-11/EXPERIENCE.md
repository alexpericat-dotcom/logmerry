---
status: final
created: 2026-10-11
updated: 2026-10-18
name: LogMerry
sources:
  - _bmad-output/planning-artifacts/prds/prd-logmerry-2026-10-10/prd.md
---

# LogMerry : Experience Spine

> Guide de lecture : Information Architecture, Component Patterns et Key Flows pour savoir quoi construire et où ; Voice and Tone et State Patterns pour les messages et états ; Interaction Primitives et Accessibility Floor pour le clavier et l'accessibilité ; Open items pour les décisions et hypothèses restantes.

> Termes du glossaire du PRD repris tels quels : Propriétaire, Note, Extrait, Citation, Mission, Backlog, User story, Tâche, Paramètre, Règle réglementaire, Profil professionnel, « À confirmer », Plafond, Estimation, Encaissement, Échéance, Règle d'adaptation, Tâche du jour, Réalisation (18 octobre : règle réglementaire, profil, « À confirmer », plafond et tâche du jour ajoutés). Les exigences sont référencées par numéro (FR-n), pas recopiées. En cas de conflit, DESIGN.md et EXPERIENCE.md l'emportent sur toute maquette (`mockups/`).

## Foundation

Application web, **ordinateur d'abord (Mac)**, interface en français. shadcn/ui (style new-york, base neutral, icônes lucide, `next-themes` clair/sombre) sur Next.js + Tailwind 3. `DESIGN.md` est la référence visuelle ; les jetons sont cités sous la forme `{colors.primary}`. Ce document ne décrit que le comportement qui s'ajoute aux défauts shadcn. Maquettes de référence : voir `DESIGN.md`, Brand & Style. Un seul utilisateur (le Propriétaire, FR-1) ; le visiteur du portfolio public est anonyme et en lecture seule (FR-16). Téléphone : consultation et saisie légère (voir Responsive & Platform).

## Information Architecture

Barre latérale fixe à gauche, repliable en icônes, le Cockpit en première entrée. L'assistant est un panneau ouvrable depuis toute page.

| Surface | Accessible depuis | But | Exigences |
|---|---|---|---|
| Connexion, inscription, mot de passe oublié | Lien d'accès, déconnexion | Accès sécurisé (scène B : panneau dégradé avec nom du produit) | FR-1 |
| Cockpit « Aujourd'hui » | Première entrée, ouverture de l'application | Tâches du jour avec motif et contexte, ligne de synthèse des éléments à documenter, lignes « paramètre manquant », jauges de plafond et repère « CA encaissé », chiffres étiquetés ([maquette](mockups/key-cockpit.html), antérieure au 18 octobre : une jauge, six règles ; la spec l'emporte) (18 octobre) | FR-14, FR-15 |
| Assistant (panneau) + Historique | Bouton ou raccourci, toute page ; historique dans le panneau | Question, réponse citée, échanges conservés ([maquette](mockups/key-assistant.html)) | FR-4, FR-5, FR-12 |
| Notes (liste, éditeur, recherche) | Barre latérale | Base de connaissances, résumé généré | FR-3, FR-19, FR-20 |
| Clients / prospects / contacts | Barre latérale ; création depuis une Note | CRM minimal | FR-7 |
| Missions (backlog, user stories, tâches) | Barre latérale ; fiche client | Backlog compact, tâches, glisser-déposer, aide de l'IA, prompt de mission | FR-8, FR-23, FR-24 |
| Factures et Encaissements | Barre latérale | Montants hors taxe et taxe, statut « payée » déduit des Encaissements, saisie des Encaissements (18 octobre) | FR-9 |
| Devis | Fiche d'un prospect, d'un client ou d'une Mission | Suivi (montants, date d'envoi, statut) et acceptation en une action (18 octobre) | FR-22 |
| Calendrier (Échéances) | Barre latérale ; Cockpit | Source unique des obligations : vues Aujourd'hui, Cette semaine, Ce mois-ci, En retard ; chaque ligne avec catégorie, priorité, statut, source (18 octobre) | FR-13 |
| Profil | Barre latérale (groupe Finances, à confirmer : Open items) ; lien « paramètre manquant » | Données personnelles qui décident des règles, chacune avec son état À confirmer / Déclaré / Confirmé ; seuils d'alerte actifs (18 octobre) | FR-25 |
| Règles | Barre latérale (groupe Finances) ; lien « paramètre manquant » | Règles réglementaires versionnées avec source, date de vérification et statut ; remplace l'écran Paramètres (18 octobre) | FR-10 |
| Plafonds | Barre latérale (groupe Finances) ; jauges du Cockpit | Une jauge par plafond suivi, avec sa base, sa source et ses seuils (18 octobre) | FR-11 |
| Finances | Barre latérale (groupe Finances) | Estimation de cotisations avec règles, versions, sources et détail du calcul ; livrée après la story 4.5 (18 octobre) | FR-11 |
| Réalisations (gestion) | Barre latérale | Édition, accord client, publication | FR-16 |
| À faire | Barre latérale ; bouton de l'assistant ; ligne de synthèse du Cockpit | Éléments à documenter plus tard (Notes brouillons) | UJ-2 |
| Portfolio public (lien « m'écrire » au MVP ; formulaire de contact après MVP) | Lien public, sans connexion | Vitrine en lecture seule (scène A, [maquette](mockups/key-portfolio.html)) | FR-16 |

Catalogue d'outils (FR-17/18) : hors MVP et hors navigation. (18 octobre) Les jauges de plafond se trouvent sur la page Plafonds et, avec exactement les mêmes chiffres, dans le Cockpit (un seul calcul, FR-15) ; pas d'autre écran « revenus ». Vue d'ensemble financière, objectifs et suivi ARE (FR-26 à FR-28) : après le MVP, hors navigation. Une modale s'ouvre sur une page, jamais sur une autre modale.

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
| Paramètre absent | « paramètre manquant : {ce qui manque} » suivi d'un lien vers la page qui le règle (Profil ou Règles) ; jamais un chiffre à la place |
| Chiffre calculé | étiquette « estimation » |
| Données du profil (18 octobre) | États « À confirmer », « Déclaré », « Confirmé le JJ/MM/AAAA » |
| Calcul sur une donnée déclarée (18 octobre) | Bandeau « calcul basé sur une donnée déclarée, non confirmée » |
| Règle ou résultat d'essai (18 octobre) | Étiquette « DEMO, non officielle », partout où la règle ou un résultat calculé avec elle s'affiche |
| Règle dont la revérification est dépassée (18 octobre) | « périmée » avec icône |
| Taxe inconnue (18 octobre) | « taxe à confirmer » ; le toutes taxes comprises n'est pas affiché |
| Échéance dont la date dépend d'une règle inconnue (18 octobre) | Pas de date, mention « À confirmer » |
| Tâches de sprint au-delà de trois (18 octobre) | « {n} autres tâches dans ton sprint » (lien vers la page de la Mission) |
| Devis accepté sur un prospect (18 octobre) | Annonce : « Devis accepté : {nom} est maintenant client, mission « {titre} » créée. » |
| Résumé de Note | étiquette « résumé généré » |
| Refus hors périmètre (fiscal, juridique) | « Je préfère ne pas te répondre là-dessus : c'est du conseil fiscal ou juridique, et je pourrais me tromper sur ta situation. Un comptable ou un juriste saura te guider. Je peux en revanche t'expliquer d'où viennent les chiffres affichés dans LogMerry. » Aucune recommandation (FR-12). |

Portfolio public : vouvoiement, texte sobre, aucune donnée privée ni nom de client sans accord.

## Component Patterns

Comportement ; l'aspect est dans `DESIGN.md`, Components.

| Composant | Règles de comportement |
|---|---|
| `task-row` | **Comportement.** Ordre fixé par les Règles d'adaptation (FR-14), pas par l'IA. Chaque ligne montre son **motif visible** (« pourquoi aujourd'hui »), en texte avec icône. Cocher = retour de satisfaction (coche + titre barré), la ligne se réordonne. Décocher est possible. Un clic sur le titre ouvre l'élément source (Échéance, facture, devis).<br>**Réordonnancement et focus.** Le focus reste sur la case actionnée, qui suit sa ligne (même nœud DOM déplacé, `key` stable, pas de remontage). Annonce en `role="status"` : « {titre} terminée, {n} restantes, déplacée en position {k} » ; à la réouverture : « {titre} rouverte, {n} restantes ». Règle unique, reprise par renvoi dans Interaction Primitives et UJ-1.<br>**Dernière tâche.** Le bloc « Bravo » reçoit `role="status"`, le focus reste sur la case ; (après MVP) les deux boutons de la proposition sont les arrêts de tabulation suivants.<br>**Cible.** Zone cliquable de la case ≥ 24 px (`::after` étendu), sans chevauchement avec le lien du titre.<br>**Tâches issues d'un sprint (18 octobre).** Sous le titre : le contexte « Client / Mission / Sprint X » (texte, en `{typography.label}`), puis le motif « dans ton sprint, qui se termine dans N jours ». Trois tâches au plus, dans l'ordre du sprint ; la ligne « {n} autres tâches dans ton sprint » est un lien vers la page de la Mission, sans case ni motif (même pattern que `backlog-summary`). La tâche de règle 7 (sprint à J-2 avec au moins une story non terminée) vient avant ces tâches. Une tâche de plafond ou de calcul fait avec une règle d'essai porte `demo-label`, et avec une donnée « Déclaré » le bandeau « à confirmer ».<br>**Cocher selon l'origine (18 octobre).** Échéance : l'échéance est marquée « faite » dans le Calendrier (un seul statut). Tâche de story : la tâche de la story est cochée. Facture échue : la tâche est masquée pour la journée seulement, la facture ne change pas et revient le lendemain si elle est toujours échue. Alerte de plafond : cocher la tâche à 90 % ne masque pas celle à 100 %. Une tâche par entité source. Décocher reste possible dans tous les cas. |
| `backlog-summary` | Ligne de synthèse **sous** la liste des tâches du Cockpit : icône + « {n} procédure(s) à documenter », le texte est un lien vers l'écran À faire. Au singulier pour 1, **masquée à 0** (règle unique, citée aussi dans Voice and Tone). Ce n'est **pas une tâche** : pas de case, hors liste du jour et hors ordre FR-14 (sept règles depuis le 18 octobre), pas de motif. Le comptage se met à jour au retour sur le Cockpit. |
| `plafond-bar` | **Comportement.** Piste, remplissage, **marqueur 90 %** (FR-14 règle 3). Le chiffre et le seuil sont en texte, jamais la couleur seule. Accompagnée de `estimation-label` et des Paramètres sources ; « estimation » et date de vérification du plafond affichées. Au franchissement du seuil, le texte adjacent affiche « seuil de 90 % atteint » précédé d'une icône.<br>**Accessibilité.** `role="meter"`, `aria-label="{nom du plafond} (estimation)"`, `aria-valuemin=0`, `aria-valuemax={plafond}`, `aria-valuenow={cumul}`, `aria-valuetext="{cumul} € sur {plafond} €, soit {p} % ; seuil de 90 % : {seuil} €"`. Marqueur `aria-hidden` (information portée par `aria-valuetext` et le texte adjacent). Si la valeur a changé depuis la dernière visite : `role="status"` « Plafond mis à jour : {p} % (estimation) ».<br>**États et mise à jour.** Paramètre absent : aucun `meter`, seulement le message d'état. Plafond absent ou périmé : voir État « paramètre manquant ». Mise à jour **au retour sur le Cockpit** après saisie d'un Encaissement ou d'un Paramètre : pas de temps réel entre onglets, pas de bouton d'actualisation ; calcul serveur identique à FR-11, aucun second calcul.<br>**Plusieurs plafonds (18 octobre).** Une jauge par plafond suivi, chacune calculée sur **sa** base (hors taxe ou taxe, période, catégorie de recettes) : le nom du plafond et sa base sont écrits au-dessus ; deux jauges n'ont jamais le même montant par défaut. Autour de la piste, en texte : seuil, montant consommé, pourcentage, montant restant, période de référence, date de dernière mise à jour, source officielle (lien), date d'effet de la règle, `estimation-label`. Le marqueur reste celui du seuil de 90 % (aucun autre marqueur dessiné). À chaque seuil **actif au profil** (50, 75, 90, 100 %) franchi, une ligne d'état en texte et icône apparaît (« seuil de 50 % atteint », « de 75 % », « de 90 % », « de 100 % atteint ») ; un seuil non actif n'émet rien. `aria-valuetext` cite le dernier seuil franchi ; l'annonce `role="status"` « Plafond mis à jour » est unique par retour sur la page. Aucun e-mail ni notification.<br>**Paramètre manquant.** Pas de `meter` : la ligne « paramètre manquant : {règle ou champ du profil} » avec son lien. **Donnée déclarée.** Le calcul s'affiche avec le bandeau « calcul basé sur une donnée déclarée, non confirmée » placé avant la jauge. **Essai.** `demo-label` à côté du nom. |
| `estimation-label` | Présente sur tout montant calculé (FR-11, FR-15) ; lien vers les règles (version, source, date de vérification) utilisées (18 octobre : « Paramètres » devient « Règles »). |
| `assistant-panel` | **Comportement.** Ouvert en un geste depuis toute page (bouton, raccourci). **Non modal** : `<aside aria-label="Assistant">` placé après `main` dans le DOM, pas de piège de focus, fond non inerte ; à l'ouverture le focus va au champ de saisie. Il réduit la largeur de `main` (colonne de grille) sans le recouvrir (poussé plutôt que superposé, voir Open items). Accepte les requêtes courtes en mots-clés, sans reformulation. Conserve la conversation quand l'utilisateur change de page ; en dessous de 1024 px il occupe toute la largeur.<br>**Réponse.** 1) texte d'abord, résumé en 2 à 3 puces lisibles en diagonale ; 2) sources dessous, une `citation-chip` par Citation ; 3) par source, « Copier le texte » (copie l'Extrait, confirmation brève en `role="status"`) et « Ouvrir » (document complet, à consulter après le rendez-vous).<br>**Accessibilité.** Les puces gardent chacune une Citation valide (FR-4) : vrais `<ul><li>`, chaque puce porte un repère « [1] » (lien « Source 1 : {titre de la Note} ») ; les sources forment une `<ol>` nommée « Sources ». Annonces : pendant la génération `role="status"` « Recherche dans tes notes… » ; à la fin un seul message « Réponse prête, 3 sources » ; le texte de la réponse n'est pas dans une région live et le focus ne bouge pas.<br>**États.** Erreur ou attente > 15 s : `role="status"` + « Réessayer ». |
| `citation-chip` | Lien (navigation) ou bouton (copie), jamais un `div` cliquable ; cible ≥ 24 px. Ouvre la Note source à l'Extrait, dans le même onglet (sinon « (nouvel onglet) » dans le nom accessible) ; le focus va à l'Extrait (`tabindex="-1"`), surligné par fond + contour (pas la couleur seule) ; le panneau reste ouvert. La source est relue en base par identifiant (FR-4). |
| `gradient-banner` | Voir `DESIGN.md`, Components. Décoratif, au-dessus de la liste des tâches uniquement ; ne porte que le titre de page. |
| `data-table` | Tri, filtre (statut, étiquette d'origine, FR-7), recherche ; chiffres et dates tabulaires alignés à droite ; `<table>` natif avec `<caption>` masquée visuellement ; `th scope="col"` ; colonne triable = `<button>` dans le `th` portant `aria-sort="ascending|descending"` (un seul `th` actif), colonnes non triables sans bouton ; focus et ordre conservés après tri. Ligne cliquable : le lien (nom du client) est dans la 1re cellule, étendu à la ligne par CSS ; pas de `role` ni d'`onClick` sur `tr`. Après filtre ou recherche : `role="status"` « 12 clients sur 40 ». Défilement horizontal dans un conteneur focalisable (`tabindex="0"`) nommé. Pas de dégradé. |
| `etat-confirmation` (18 octobre) | Affiché à côté de **chaque champ du Profil**, en icône + mot, jamais en couleur seule : « À confirmer » (champ vide), « Déclaré » (rempli, non confirmé), « Confirmé le JJ/MM/AAAA ». Aucune valeur n'est jamais préremplie. On peut enregistrer un champ sans le confirmer (« Enregistrer ») puis le confirmer plus tard (« Confirmer ») ; modifier une valeur confirmée la repasse en « Déclaré » et l'annonce en `role="status"`. Au départ : statut « micro-entreprise, BNC » en « Déclaré » ; date de début d'activité en « À confirmer ». Listes courtes sans règle fiscale plus « Autre » qui ouvre un champ libre (`aria-expanded`) ; objectifs financiers et taux de réserve : champs libres, sans calcul au MVP. Les seuils d'alerte 50, 75, 90, 100 % se cochent dans le profil (quatre cases, libellé « Alerter à {n} % »). La page Profil précise que les données peuvent être transmises à l'assistant quand il explique une estimation (mention RGPD, FR-12). |
| Page Règles (18 octobre) | `data-table` : règle (nom en lien), valeur et unité, version, date d'effet, date de fin, statut en `status-badge` (« À vérifier », « Vérifiée », « Essai »), date de vérification, source (lien). Une règle en vigueur dont la date de revérification est dépassée affiche en plus « périmée » (icône + texte, jamais la couleur seule) ; une version close n'est jamais « périmée ». Action « Nouvelle version » : formulaire prérempli avec la valeur actuelle, avec **date d'effet** obligatoire ; l'ancienne version reçoit sa date de fin et l'historique des versions reste lisible. Passer en « Vérifiée » exige un lien officiel et une date de vérification (erreur en ligne sinon) ; une règle « Essai » (compte de démonstration) accepte une source « DEMO » sans lien. Les paramètres de chaque règle (durée de l'ACRE, base d'un plafond : période, catégorie de recettes, hors taxe ou taxe) sont des champs du formulaire, avec contrôle de format. `demo-label` sur toute règle d'essai. |
| `demo-label` (18 octobre) | Étiquette « DEMO, non officielle », même forme que `estimation-label`, sur toute règle d'essai et sur tout résultat, jauge ou tâche calculé avec elle. Le compte de démonstration ne montre jamais un chiffre présenté comme officiel. |
| Page Plafonds (18 octobre) | Une `plafond-bar` par plafond suivi sous le titre de page, en lecture seule (aucune écriture, aucun second calcul). Si aucun plafond n'est suivi : état vide + lien vers Règles. |
| Page Finances (18 octobre, livrée avec la story 4.5) | Estimation de cotisations avec `estimation-label`, **règles utilisées** (nom, version, source, date de vérification), détail du calcul pas à pas. Si une règle est absente, non vérifiée ou périmée, ou si un champ du profil dont elle dépend est vide : **aucun montant**, la liste de ce qui manque avec ses liens. Avec une donnée « Déclaré » : calcul + bandeau « à confirmer ». |
| Calendrier (18 octobre) | Quatre vues sous forme de **liste groupée par date** : « Aujourd'hui », « Cette semaine », « Ce mois-ci », « En retard » (onglets, `role="tablist"`, flèches), chaque ligne : titre, date, catégorie (Urssaf, France Travail, fiscale, TVA, CFE, justificatifs, renouvellements, personnalisée), priorité, statut en `status-badge`, lien vers la source officielle, retard en jours pour « En retard ». Une échéance récurrente est **une ligne par occurrence**, cochée une par une. Une échéance qu'une règle devrait calculer mais dont la règle ou le profil manque apparaît **sans date**, marquée « À confirmer », avec le lien qui la débloque ; jamais estimée en silence. Les factures à émettre ou à relancer sont des lignes calculées (étiquetées ainsi), pas des échéances modifiables. Obligations seulement, pas de rendez-vous. Cocher « faite » est la même action que sur le Cockpit. |
| Ligne « paramètre manquant » du Cockpit (18 octobre) | Sous la liste des tâches, avec le même pattern plat que `backlog-summary` : icône d'avertissement + « paramètre manquant : {ce qui manque} » + lien. Ce n'est **pas une tâche** (pas de case, hors ordre de priorité) : une règle dont la règle réglementaire ou la donnée du profil est « À confirmer » n'est ni ignorée ni classée. Les jauges et le repère « CA encaissé (hors taxe, année en cours) » du Cockpit ne sont pas des tâches non plus. |
| Acceptation d'un devis (18 octobre) | Bouton « Marquer comme accepté » sur la fiche du devis : **une seule action, tout ou rien**. Sur un prospect, une boîte de confirmation (`Dialog`) énonce les conséquences (« {nom} deviendra client et une mission « Devis du JJ/MM/AAAA — {nom} » sera créée ») avec « Confirmer » et « Annuler ». Sur un devis déjà lié à une Mission, rien d'autre ne change et il n'y a pas de boîte. Après réussite : annonce `role="status"` (voir Voice and Tone), la fiche affiche le statut « accepté » et le lien vers la mission créée dont le titre se modifie ensuite comme celui de toute mission ; le focus va au lien de la mission. Pendant l'envoi, le bouton passe en `aria-disabled` avec garde (pas de double envoi, le focus n'est pas perdu). Un devis accepté est **définitif** : plus de changement de statut ; le texte dit « pour corriger, crée un nouveau devis ». « Refusé » retire la tâche du Cockpit. |
| Formulaires | **Champs obligatoires (minimum)** : prospect = nom + origine ; Mission = client + titre ; User story = titre ; Tâche = titre ; devis = montant hors taxe + date d'envoi, rattaché à un client ou prospect et, si elle existe, à une Mission (montant de taxe facultatif ; statut « envoyé » par défaut ; « accepté », « refusé » ; remarque facultative ; acceptation : voir « Acceptation d'un devis » ; pas de document) ; facture = Mission + montant hors taxe + date d'échéance (montant de taxe facultatif, lien facultatif vers le devis d'origine) ; Encaissement = facture + montant hors taxe + date (taxe facultative) ; Règle = clé de règle, valeur et unité, date d'effet, source (lien), date de vérification, date de revérification ; Échéance = date + source (FR-13 ; enregistrement refusé si la source manque). Tout le reste en divulgation progressive (« Plus de champs », modifiable plus tard). Libellé associé à chaque champ, erreur en ligne + récapitulatif. Champs requis : « (obligatoire) » dans le libellé + `aria-required`. Erreur : `aria-invalid` + `aria-describedby`, récapitulatif en tête (focus dessus, sans `role="alert"` en plus), ses liens déplacent le focus sur le champ. Date : saisie texte JJ/MM/AAAA, format indiqué dans le libellé, sélecteur `Calendar` optionnel navigable aux flèches ; date de vérification d'un Paramètre préremplie à aujourd'hui. Montant : `inputmode="decimal"`, virgule acceptée. **Hors taxe et taxe (18 octobre) :** deux champs distincts ; une taxe laissée vide veut dire « inconnue », jamais 0, et le texte d'aide le dit ; le toutes taxes comprises s'affiche, calculé, **seulement quand la taxe est connue** ; une facture à taxe inconnue affiche « taxe à confirmer ». La taxe d'un encaissement partiel se saisit, elle n'est jamais répartie automatiquement. Le statut d'une facture (« non payée », « partiellement payée », « payée ») se **déduit** des encaissements, jamais saisi ; un encaissement qui dépasse la facture est signalé par un message en ligne non bloquant. Une facture porte le rappel « ce n'est pas une facture légale ». `autocomplete` sur les champs d'identité. « Plus de champs » : `aria-expanded`/`aria-controls`. Toute information déjà saisie dans le parcours (client, Mission) est préremplie, jamais redemandée. |
| Contact (portfolio public) | **MVP : `mailto-link`.** Lien « m'écrire » (`mailto:`), souligné, `{colors.primary}`, cible ≥ 24 px, focus visible `{colors.ring}`. Aucune écriture en base : la page reste en lecture seule (FR-16), aucun e-mail automatique. Vouvoiement autour (« Vous pouvez m'écrire »).<br>**Après MVP : `contact-form`.** Vouvoiement. Champs : nom, e-mail, message, tous avec libellé visible, `aria-required`, `autocomplete="name"`/`"email"`. Erreurs : récapitulatif en tête (focus) + erreur en ligne reliée par `aria-describedby`, saisie conservée. Envoi : bouton désactivé seulement pendant l'envoi ; succès dans une région `role="status"` (« Message envoyé. ») ; échec : message d'erreur + « Réessayer ». Anti-spam sans test cognitif : champ piège masqué (`aria-hidden`, `tabindex="-1"`), délai minimal de soumission, limitation de débit côté serveur ; aucun CAPTCHA à image, énigme ou calcul. Destination : table de demandes en insertion seule (voir Open items). |
| `status-badge` | Voir `DESIGN.md`, Components (icône + texte, la couleur n'est qu'un renfort). |
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
| Paramètre manquant | Jauge de plafond, Règles d'adaptation, estimations, échéances calculées | Pas de chiffre : « paramètre manquant : {règle absente, non vérifiée ou périmée, ou champ du profil à confirmer} » + lien vers la page qui le règle (Règles ou Profil) (FR-10, FR-11, FR-14). Icône d'avertissement + texte. Sur le Cockpit : ligne sous les tâches, pas une tâche. |
| Refus de l'assistant | Panneau assistant | Message chaleureux et explicite, qui renvoie vers un professionnel, aucune recommandation (FR-12). |
| Estimation | Tout montant calculé | `estimation-label` + règles sources, versions et dates (FR-11). Jamais un montant officiel. |
| À confirmer / Déclaré / Confirmé (18 octobre) | Chaque champ du Profil | `etat-confirmation` : icône + mot. Une règle qui dépend d'un champ « À confirmer » : « paramètre manquant » ; qui dépend d'un champ « Déclaré » : calcul + bandeau « calcul basé sur une donnée déclarée, non confirmée ». |
| Règle périmée (18 octobre) | Page Règles, calculs | Badge « périmée » (icône + texte) sur une règle en vigueur dont la revérification est dépassée ; elle n'est plus utilisée en silence : le calcul concerné affiche « paramètre manquant ». |
| Essai / DEMO (18 octobre) | Règles, jauges, tâches, estimations du compte de démonstration | `demo-label` « DEMO, non officielle » ; rien d'officiel n'est affiché à partir d'elles. |
| Seuil atteint (18 octobre) | Jauge | Ligne d'état en texte + icône pour chaque seuil actif franchi (50, 75, 90, 100 %), jamais la couleur seule. |
| Sans date (18 octobre) | Calendrier | Échéance calculée dont la règle ou le profil manque : « À confirmer », pas de date inventée. |
| Résumé généré | Éditeur de Note | Étiquette « résumé généré », lien vers la Note source, actions Régénérer / Ignorer ; jamais enregistré à la place de la Note (FR-20). |
| Aucun résultat | Assistant ; recherche (FR-19) | Assistant : message exact de Voice and Tone + « Créer une note à documenter plus tard ». Recherche : « Aucun résultat » explicite. Jamais de règle inventée. |
| Vide (public) | Portfolio | Aucune Réalisation publiée : message sobre, vouvoiement. |

## Interaction Primitives

Raccourcis **dans l'application** (une application web n'a pas de raccourci système global) :

| Raccourci | Action |
|---|---|
| `⌘K` | Ouvrir la palette de commandes : recherche (FR-19) et assistant |
| Dans la palette | Entrée « Demander à l'assistant : {requête} » : Entrée l'envoie au panneau assistant ; les résultats de recherche (Notes, clients, Missions) suivent en dessous |
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
- `prefers-reduced-motion` respecté .
- Panneau assistant : région nommée (`aside`), annonces limitées à l'état (voir `assistant-panel`) ; sources en liens ou boutons à cible d'au moins 24 px.
- **Pages financières (18 octobre).** Mêmes règles que le reste : cibles de 44 px sur téléphone, libellés associés, `aria-required`, erreurs en ligne + récapitulatif en tête, clavier complet. Les annonces (état d'un champ du profil qui change, plafond mis à jour, devis accepté, échéance cochée) passent par une région `role="status"` **montée en permanence** ; un bouton qui devient inactif pendant un envoi (« Confirmer », « Marquer comme accepté », « Enregistrer ») utilise `aria-disabled` avec une garde dans le gestionnaire, pour que le focus ne soit pas perdu. Les états À confirmer / Déclaré / Confirmé, « périmée », les seuils et « DEMO, non officielle » sont toujours en icône + texte. Tableau des règles et vues du calendrier : défilement dans un conteneur focalisable nommé, onglets de vues aux flèches.

## Responsive & Platform

| Largeur | Comportement |
|---|---|
| Ordinateur (≥ 1024 px, cible Mac) | Barre latérale fixe (repliable), panneau assistant à droite, tableaux pleine largeur |
| Tablette | Barre latérale en icônes, nom accessible sur chaque entrée. [ASSUMPTION : valeur du point de rupture tablette à fixer à l'implémentation] |
| Téléphone | **Consultation** (Cockpit, Notes) et saisie légère, sans optimisation de la saisie lourde au MVP ; barre latérale en `Sheet` ; le portfolio public reste lisible. (18 octobre) Plafonds, Calendrier et Profil se **consultent** et se corrigent légèrement ; les jauges s'empilent, la page Règles défile dans un conteneur nommé ; la saisie d'une nouvelle version de règle se fait de préférence sur ordinateur |

## Key Flows

### UJ-1 : Alex ouvre son Cockpit un lundi matin (Alex, 8 h, Mac)

1. Alex se connecte et arrive sur le Cockpit « Aujourd'hui ».
2. Il regarde d'abord les tâches du jour ; chacune porte son motif (« échéance administrative dans 3 jours », « facture échue depuis 1 jour », « devis sans réponse depuis 7 jours »). (18 octobre) Une tâche venue de son sprint porte « Client / Mission / Sprint X » et « dans ton sprint, qui se termine dans 2 jours » ; trois au plus, puis « 4 autres tâches dans ton sprint ». Sous la liste, la ligne `backlog-summary` (« 2 procédures à documenter », lien vers À faire), puis une éventuelle ligne « paramètre manquant » ; plus bas, le repère « CA encaissé » et les jauges (ce ne sont pas des tâches). Règles dans Component Patterns.
3. Il coche la première ; retour de satisfaction, la liste se réordonne (annonce et focus : voir `task-row`).
4. Il continue jusqu'à la dernière tâche.
5. **Climax :** toutes les tâches du jour sont faites ; le message « Bravo, tu as fait toutes tes tâches du jour » s'affiche, suivi (après MVP) d'une proposition de prendre de l'avance sur des tâches futures avec ses deux boutons (opt-in : jamais imposée, jamais décidée par l'IA, SM-C1). Au MVP : félicitation seule.

Cas limite : si une règle ou un champ du profil manque, la jauge de plafond affiche « paramètre manquant » (avec ce qui manque et son lien) au lieu d'un chiffre ; une règle du Cockpit dans ce cas apparaît en ligne « paramètre manquant » sous les tâches, jamais ignorée. (18 octobre)

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

### UJ-4 : Alex saisit son activité après un premier rendez-vous (Alex)

1. Alex crée le prospect depuis la Note de rendez-vous (nom + origine).
2. Le prospect devient client, puis Alex crée la ou les Missions (client + titre).
3. Il construit le Backlog de la mission (User stories, puis Tâches ; l'IA peut les proposer, il relit), puis le devis (montant hors taxe + date d'envoi, taxe si elle est connue, statut « envoyé » par défaut ; « accepté » ou « refusé » ensuite, voir UJ-8), puis les Échéances (date + source).
4. Chaque formulaire n'exige que ses champs minimaux ; le reste reste en divulgation progressive.
5. **Climax :** il ouvre le Cockpit et voit l'effet de sa saisie : les tâches issues de ses Échéances, factures, devis et sprints apparaissent avec leur motif et, pour un sprint, « Client / Mission / Sprint X » (PRD §9, point 6, tranché le 18 octobre).

### UJ-5 : Alex enregistre un paiement et règle son plafond (Alex)

1. Alex saisit l'Encaissement d'une facture (hors taxe, taxe si connue, date) ; le statut de la facture se déduit (FR-9).
2. Il ouvre Règles et Profil pour que la jauge ait de quoi calculer (voir UJ-7).
3. **Climax :** il ouvre la page Plafonds ou retourne au Cockpit et voit les jauges se mettre à jour, étiquetées « estimation » (au retour sur la page, sans bouton d'actualisation).

Cas limites : si la règle du plafond ou un champ du profil manque, la jauge est en état « paramètre manquant », sans chiffre, avec le lien qui règle le problème ; si un champ est seulement « Déclaré », le calcul s'affiche avec le bandeau « calcul basé sur une donnée déclarée, non confirmée ». (18 octobre)

## Open items

- ~~UJ-4 et UJ-5 absents du PRD~~ : reportés dans le PRD. `[NOTE FOR UX]` (18 octobre) UJ-7 et UJ-8 ci-dessous sont absents du PRD : à reporter par bmad-prd.
- `[ASSUMPTION]` Raccourci `⌘K` (palette de commandes unique : recherche et assistant) : à tester sur Safari, Chrome et Firefox Mac .
- `[DECISION]` Panneau assistant poussé plutôt que superposé : confirmé par Alex.
- **À reporter dans le PRD** :
  - écran « À faire » (éléments à documenter, Note brouillon) et ligne de synthèse du Cockpit (FR-14 reste à six règles) ;
  - suivi de devis (montant, date d'envoi, statut envoyé/accepté/refusé) ;
  - champs de Réalisation (accord, nom du client masqué, étiquette d'origine) ;
  - contact = lien mailto au MVP, formulaire après MVP ;
  - « prendre de l'avance » après MVP, avec les deux boutons, marqués « après MVP » (tâches futures = sprints ou stories à venir, à redéfinir, et Échéances des 30 jours, date la plus proche, 3 au plus, étiquetées « à venir », opt-in strict SM-C1) ;
  - import Notion/PDF après MVP ;
  - catalogue d'outils (FR-17/18) hors MVP, le rappel d'Échéance (FR-13) ne s'applique pas au catalogue.

### UJ-6 : Alex conçoit une mission en agile avec l'IA (Alex) (17 octobre)

1. Sur la page d'une mission, le Backlog liste les User stories en une ligne chacune (poignée, titre, points, avancement des tâches, statut) ; une story se déplie pour montrer sa phrase « En tant que… », ses critères et ses tâches.
2. **Proposer des user stories avec l'IA** : il colle un brief et/ou coche des notes liées au client ; les propositions arrivent dans un panneau, à garder, modifier puis garder, ou rejeter ; la mention dit que le contenu part chez Anthropic.
3. Dans une story dépliée, **Proposer des tâches avec l'IA** (précision facultative) : tâches ordonnées, à garder une par une ou **Tout garder**.
4. Il réordonne stories et tâches par **glisser-déposer** (souris, doigt par la poignée, ou clavier : Espace, flèches, Espace, Échap annule) ; chaque déplacement est annoncé.
5. **Générer un prompt avec l'IA** : contenu (la mission seule, ou tout le contexte), ce qu'il veut obtenir (en citant l'outil : n8n, Claude Code…), case « sans le nom du client » (le nom est remplacé par « le client » partout) ; le prompt est modifiable, avec un bouton « Copier le prompt ».
6. **Climax :** il colle le prompt dans Claude Code ou Claude relié à n8n et l'assistant commence par poser ses questions.

Cas limites : un chiffre inventé écarte la proposition (dit à l'écran) ; « Annuler » libère l'écran pendant la génération ; une mission d'un autre compte ne se charge jamais.

### UJ-7 : Alex remplit son profil et ses règles (Alex) (18 octobre)

1. Alex ouvre Profil. Le statut « micro-entreprise, BNC » est en « Déclaré » ; la date de début d'activité est en « À confirmer » ; aucun autre champ n'est prérempli.
2. Il remplit ce qu'il sait et choisit ses seuils d'alerte actifs ; il confirme à la source les champs qu'il a vérifiés (« Confirmé le JJ/MM/AAAA »), laisse les autres en « Déclaré » ou « À confirmer ».
3. Il ouvre Règles : sa règle de plafond, avec valeur, date d'effet, lien officiel et date de vérification ; elle passe en « Vérifiée ».
4. **Climax :** sur Plafonds, la jauge affiche son chiffre, étiqueté « estimation » avec ses sources. S'il reste une donnée « Déclaré », le bandeau « calcul basé sur une donnée déclarée, non confirmée » reste en tête ; s'il manque la date de début d'activité, les lignes qui en dépendent disent « paramètre manquant » avec le lien vers Profil.

Cas limite : un changement de valeur (nouveau plafond) = « Nouvelle version » avec sa date d'effet ; l'ancienne garde sa date de fin et les calculs d'une période passée l'utilisent.

### UJ-8 : Alex accepte un devis (Alex) (18 octobre)

1. Alex ouvre le devis d'un prospect (statut « envoyé ») après un accord oral.
2. Il choisit « Marquer comme accepté » ; la boîte de confirmation dit : « {Nom} deviendra client et une mission « Devis du JJ/MM/AAAA — {Nom} » sera créée. »
3. Il confirme (une seule action, tout ou rien).
4. **Climax :** annonce « Devis accepté : {Nom} est maintenant client, mission créée. » ; le focus va au lien de la mission créée, dont il corrige le titre ; le devis n'a plus de bouton de statut (« pour corriger, crée un nouveau devis »). Sur le Cockpit, la tâche « devis sans réponse » a disparu et la nouvelle mission compte dans le pipeline.

Cas limite : un devis lié à une mission existante : rien d'autre ne change et il n'y a pas de boîte de confirmation.

### Interface : thèmes et première page (17 octobre)
- Deux thèmes : **Rétro** (clair, pixel art « Arcade clair ») et **Futur** (sombre, par défaut). **La première page est la connexion** (décision d'Alex : plus sobre, plus professionnelle) ; l'écran de choix du thème a été retiré. Le thème se change par le bouton de la barre latérale et le choix est mémorisé. Le message du cockpit s'écrit au clavier une fois par session. Détail visuel : `DESIGN.md`.
- Mobile : cibles de 44 px, aucune barre de défilement horizontale ; une story dépliée se glisse mal au doigt (la replier avant).

### Questions UX ouvertes après la mise à jour du 18 octobre
- `[ASSUMPTION]` États du profil : icônes proposées « À confirmer » (cercle avec point d'interrogation, teinte `{colors.warning}`), « Déclaré » (crayon, teinte `{colors.muted-foreground}`), « Confirmé » (coche, teinte `{colors.success}`) ; aucun jeton nouveau (voir `DESIGN.md`, Components). À valider par Alex à l'implémentation.
- `[ASSUMPTION]` Calendrier en liste groupée par date, avec onglets pour les quatre vues, pas de grille mensuelle au MVP.
- `[ASSUMPTION]` Boîte de confirmation à l'acceptation d'un devis sur un prospect (action définitive) ; l'auteur n'a pas décidé de l'écran de confirmation.
- `[ASSUMPTION]` Une seule ligne « paramètre manquant » par règle concernée sous les tâches du Cockpit, regroupées si elles dépassent trois ; à confirmer.
- `[OPEN]` Emplacement de Profil, Règles, Plafonds et Finances dans la barre latérale (groupe « Finances » proposé) et place de l'ancien écran Paramètres.
- `[OPEN]` Ordre exact entre la tâche de règle 7 et les tâches du sprint : hypothèse du PRD (§10), reprise telle quelle.
- `[OPEN]` Libellé « taxe » ou « TVA » dans les formulaires ; aujourd'hui « taxe », comme dans la décision de l'auteur.
- `[OPEN]` Maquette `mockups/key-cockpit.html` : antérieure (une jauge, six règles), à refaire avant la story 5.5 si Alex veut un visuel ; la spec l'emporte.
- Phase suivante (FR-26 à FR-28, vue d'ensemble, objectifs, suivi ARE) : aucun écran spécifié ici ; à traiter par bmad-ux après le MVP.
