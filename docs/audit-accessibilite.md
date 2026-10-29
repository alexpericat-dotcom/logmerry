# Audit d'accessibilité des parcours principaux (story 7.2)

Réalisé le 29 octobre 2026 sur une version de production locale (`next build` puis `next start`), compte de démo A (données fictives), Chrome piloté par outils. Cible : WCAG 2.1 AA sur les parcours UJ-1 (cockpit), UJ-4 (saisie après un rendez-vous), UJ-5 (paiement, profil, plafonds). Spec : `_bmad-output/implementation-artifacts/spec-accessibilite-parcours.md`. Les scripts de mesure sont versionnés dans `docs/audit-accessibilite-scripts.md` (à coller dans la console d'une page connectée).

## Ce qui a été mesuré, page par page

| Mesure | Pages (liste nominale) | Thèmes | Largeur |
|--------|------------------------|--------|---------|
| Lighthouse accessibilité | cockpit, calendrier, clients, fiche mission, factures | clair ; sombre pour factures seulement | ordinateur |
| Contraste du texte (script) | cockpit, calendrier, clients, nouveau client, fiche client, notes, nouvelle note, missions, fiche mission, factures, plafonds, profil, règles, À faire | clair et sombre | 1280 px |
| Focus visible (script, après une vraie touche Tab) | clients, factures, plafonds, profil, règles, missions, calendrier, notes, cockpit (9 pages) | clair et sombre | 1280 px |
| Ordre de tabulation (document contre visuel) | cockpit, calendrier, clients, nouveau client, fiche client, notes, nouvelle note, missions, fiche mission, factures, profil, règles | clair | 1280 px et 400 px |
| Débordement horizontal et cibles de 44 px | les 14 pages du contraste | clair | 400 px |
| Parcours clavier touche par touche | une facture : Entrée sur le détail, Tab jusqu'à « Ajouter un encaissement », Entrée | clair | 1280 px |
| Où tombe le focus à l'ouverture d'un formulaire | 14 boutons : Nouvelle facture (liste, mission), Ajouter un encaissement, Nouveau devis, Ajouter un contact, Ajouter un sprint, Ajouter une user story, Nouvelle échéance, Nouvelle version (règle), Modifier (profil), Modifier le sprint, la facture, l'encaissement, l'échéance | clair | 1280 px |

Pages non mesurées : connexion, assistant (panneau), panneaux IA (stories, tâches, sprint, ordre du backlog, prompt), détail du kanban et du gantt, palette ⌘K. Lighthouse n'a pas été lancé à 400 px.

## Résultats

**Bon :** Lighthouse accessibilité à 100 sur les 5 pages mesurées (ordinateur) ; aucun débordement horizontal à 400 px sur les 14 pages ; aucun `tabindex` positif ; chaque élément tabulable des pages mesurées a un contour ou un anneau de focus (anneau des champs à 6,43:1 en clair) ; texte sur fond uni à 4,5:1 au moins sur les 14 pages, dans les deux thèmes ; les statuts portent un mot ou une icône en plus de la couleur (« Payée », « Échue », « Devis envoyé », « Prospect »).

| # | Constat | Gravité | Suite |
|---|---------|---------|-------|
| 1 | **Le focus tombait sur la page** à l'ouverture d'un formulaire, parce que le bouton qui l'ouvrait disparaissait. Touchés : « Nouvelle facture » (liste et mission), « Ajouter un encaissement », « Nouveau devis », « Ajouter un contact », « Nouvelle version » d'une règle ; et les formulaires de modification d'une facture, d'un encaissement, d'une échéance, d'un sprint, d'un devis, d'un contact, d'une story. « Nouvelle échéance » laissait le focus sur le bouton. WCAG 2.4.3. | élevée | **corrigé** : `FocusOnMount` (`components/form-helpers.tsx`) ; 14 boutons contrôlés sur le build, un seul cas hors mesure (modification d'une story, d'un devis et d'un contact : bouton non trouvé par le script, couverts par le même composant, non contrôlés au navigateur) |
| 2 | **Titre de page orange sur bleu pâle : 2,73:1** pour 3:1 exigé (grand texte), thème clair, toutes les pages. Le titre a une ombre cyan décorative. | moyenne | **corrigé** (option A choisie par Alex) : `--display` passe de `#E4600B` à `#C44A00` (`app/globals.css`, `DESIGN.md`), 3,77:1 au pire point du bandeau |
| 3 | Après « Annuler » ou un envoi, le focus ne revient pas au bouton d'ouverture (factures, devis, règles). | faible | **corrigé** le 30 octobre 2026 (factures, devis, règles) |
| 4 | Liens d'en-tête de colonne « Nom », « Statut », « Origine » : 44 px de haut, 25 à 40 px de large (téléphone). | faible | dette (le projet vise 44 px ; WCAG 2.1 n'impose pas de taille) |
| 5 | Anneau de focus des champs : trait de 1 px, visible et contrasté mais fin. | faible | dette, à juger à l'usage |
| 6 | Le premier champ d'un formulaire peut être un menu (règle, facture) : sur iOS le focus d'un menu n'a pas d'effet visible. | faible | noté |

## Faux positifs écartés (pour ne pas les refaire)

- **Bouton « Comment ça marche ? » 24 × 24 px** : zone tactile étendue à 44 px sur téléphone par un pseudo-élément, que la mesure du cadre ne voit pas.
- **Éléments « sans focus » du profil** : champs dans des blocs `<details>` repliés, non focalisables tant que le bloc est fermé ; même cause pour « Modifier le sprint » d'un sprint clos (rangé dans un bloc replié).
- **« Changer de thème » avant le contenu** : le menu latéral précède le contenu (un lien « Aller au contenu » existe).
- **Bouton de détail d'une facture « avant » ses liens sur téléphone** : centré verticalement dans la ligne ; l'ordre réel est titre, liens, montant, bouton.
- **Contour de focus « faible » du champ de recherche des notes (sombre)** : contour transparent (mode contrastes forcés) ; l'anneau réel est un trait orange à fort contraste.

## Décision pour le constat 2 (option A retenue par Alex le 29 octobre 2026)

Seul le **titre de page en thème clair** est sous le seuil. Couleur actuelle : orange `rgb(228, 96, 11)`. Contrastes mesurés contre le point le plus clair du fond (`rgb(207, 230, 245)`) :

| Option | Couleur | Contraste (pire point) | Contraste (fond de page) |
|--------|---------|------------------------|---------------------------|
| actuelle | `rgb(228, 96, 11)` | 2,73:1 | 3,36:1 |
| A | `rgb(196, 74, 0)` | 3,77:1 | 4,64:1 |
| B | `rgb(184, 66, 0)` | 4,27:1 | 5,26:1 |
| C | `rgb(170, 60, 0)` | 4,85:1 | 5,98:1 |

Un titre de 30 px en gras est un « grand texte » (seuil 3:1) : A suffit, en restant proche de l'orange de la charte ; C dépasse aussi le seuil de 4,5:1 du texte courant. Le thème sombre n'est pas concerné (titre blanc sur la partie sombre du dégradé, vérifié à l'écran).

## Limites de la méthode (ce que ces mesures ne prouvent pas)

- **Un seul parcours au clavier a été fait touche par touche** (une facture, UJ-5). Pour UJ-1 et UJ-4, on a établi que chaque élément est atteignable (tabulable, avec un focus visible) et que le focus entre dans chaque formulaire, mais pas qu'un utilisateur peut enchaîner tout le parcours sans souris : à faire par Alex (`docs/controles-visuels.md`, section 11). Échap sur ces formulaires n'a pas été testé.
- **Contraste, script maison** : il ne voit pas le texte en `opacity`, les `::placeholder` et pseudo-éléments, le texte sur image, les états `:hover` et `:disabled`, les blocs `<details>` repliés, les panneaux fermés (assistant, confirmations), ni les états que le compte A ne présente pas (alertes absentes). Le texte posé sur un dégradé est jugé sur le point le plus défavorable ; seul le titre sort sous le seuil.
- **Focus** : seuls les éléments déjà tabulables sont testés ; un `div` cliquable sans `tabindex` n'est pas détecté. Le contour est comparé au fond de l'élément, sans tenir compte d'un fond de page différent.
- **Ordre de tabulation** : comparé à la position visuelle avec une tolérance de 60 px ; le script ignore `order` en flex ou grid et les colonnes multiples (d'où des faux positifs listés plus haut), et pourrait laisser passer un saut qui reste dans la tolérance.
- **Automatique** : l'outil `axe-core` n'a pas pu être chargé dans la page connectée (refus d'autorisation sur un script externe) : l'audit automatique se limite à Lighthouse (qui embarque les mêmes règles) et aux scripts maison. Un audit automatique ne détecte qu'une partie des défauts.
- **Non testés** : lecteur d'écran réel (VoiceOver), glisser-déposer au toucher, panneaux IA, assistant, connexion.
- **Correctifs** : le câblage de `FocusOnMount` dans chaque conteneur a été vérifié à la main une fois, sur le build, sans test automatique par conteneur.
