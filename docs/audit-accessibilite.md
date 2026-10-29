# Audit d'accessibilité des parcours principaux (story 7.2)

Réalisé le 29 octobre 2026 sur une version de production locale (`next build` puis `next start`), compte de démo A (données fictives), Chrome piloté par outils. Cible : WCAG 2.1 AA sur les parcours UJ-1 (cockpit), UJ-4 (saisie après un rendez-vous), UJ-5 (paiement, profil, plafonds). Spec : `_bmad-output/implementation-artifacts/spec-accessibilite-parcours.md`.

## Ce qui a été mesuré

| Mesure | Méthode | Pages |
|--------|---------|-------|
| Règles WCAG automatiques (libellés, noms, rôles, contrastes) | Lighthouse accessibilité, ordinateur | cockpit, calendrier, clients, fiche mission, factures (clair et sombre) |
| Contraste du texte affiché | script dans la page : couleur du texte contre le fond réel (couches semi-transparentes, pire point d'un dégradé), seuil 4,5:1 (3:1 pour le grand texte) | 14 pages, clair et sombre |
| Focus visible | chaque élément tabulable reçoit le focus après une vraie touche Tab ; contour ou anneau présent, contraste 3:1 | 9 pages, clair et sombre |
| Ordre de tabulation | ordre du document contre ordre visuel | 12 pages, 1280 px et 400 px |
| Téléphone (400 px) | débordement horizontal, cibles tactiles de 44 px | 14 pages |
| Parcours au clavier, touche par touche | Entrée, Tab sur une facture : détail, modifier, supprimer, « Ajouter un encaissement » | UJ-5 |
| Ouverture d'un formulaire au clavier | où tombe le focus après le clic sur chaque bouton « Nouveau… » | 10 boutons |

## Résultats

**Bon :** score Lighthouse accessibilité à 100 sur toutes les pages mesurées ; aucun débordement horizontal à 400 px ; aucun `tabindex` positif ; chaque élément tabulable a un contour ou un anneau de focus visible (clair et sombre) ; anneau des champs à 6,43:1 (clair) ; texte courant à 4,5:1 au moins sur toutes les pages, hors dégradés, dans les deux thèmes ; les statuts portent un mot ou une icône en plus de la couleur (« Payée », « Échue », « Devis envoyé », « Prospect »).

| # | Constat | Gravité | Page, thème | Suite |
|---|---------|---------|-------------|-------|
| 1 | **Le focus tombait sur la page** quand un bouton qui ouvre un formulaire disparaissait : « Nouvelle facture » (liste et mission), « Ajouter un encaissement », « Nouveau devis », « Ajouter un contact », « Nouvelle version » (règles). Un utilisateur au clavier perdait sa place (WCAG 2.4.3). « Nouvelle échéance » laissait le focus sur le bouton, sans entrer dans le formulaire. | élevée | 7 écrans, les deux thèmes | **corrigé** : `FocusOnMount` (`components/form-helpers.tsx`), premier champ focalisé à l'ouverture ; 10 boutons contrôlés sur le build |
| 2 | **Titre de page orange sur fond bleu pâle : 2,73:1** pour 3:1 exigé (grand texte). Le titre a une ombre cyan décorative. | moyenne | toutes les pages, thème clair | **décision d'Alex** : voir la proposition ci-dessous ; non modifié |
| 3 | Après « Annuler » ou un envoi, le focus ne revient pas au bouton qui avait ouvert le formulaire (sauf contacts, calendrier, sprint, story). | faible | factures, devis, règles | dette (retour du focus) |
| 4 | Liens d'en-tête de colonne « Nom », « Statut », « Origine » : 44 px de haut, 25 à 40 px de large (téléphone). | faible | clients, missions, 400 px | dette (la norme WCAG 2.1 n'impose pas de taille ; le projet vise 44 px) |
| 5 | Anneau de focus des champs : trait de 1 px. Visible et contrasté, mais fin. | faible | formulaires | dette, à juger à l'usage |

## Faux positifs écartés (pour ne pas les refaire)

- **Bouton « Comment ça marche ? » 24 × 24 px** : sa zone tactile est étendue à 44 px sur téléphone par un pseudo-élément ; la mesure du cadre ne la voit pas.
- **Éléments « sans focus » du profil** : champs dans des blocs `<details>` repliés, qui ne peuvent pas être focalisés tant que le bloc est fermé.
- **« Changer de thème » avant le contenu** : le menu latéral précède le contenu dans le document (un lien « Aller au contenu » existe).
- **Bouton de détail d'une facture « avant » ses liens sur téléphone** : il est centré verticalement dans la ligne ; l'ordre réel est titre, liens, montant, bouton.
- **Contour de focus « faible » du champ de recherche des notes (sombre)** : contour transparent (mode contrastes forcés) ; le vrai anneau est un trait orange à fort contraste.

## Proposition pour le constat 2 (à valider par Alex)

Seul le **titre de page en thème clair** est sous le seuil. Couleur actuelle : orange `rgb(228, 96, 11)`. Valeurs proposées, mesurées contre le point le plus clair du fond (`rgb(207, 230, 245)`) :

| Option | Couleur | Contraste (pire point) | Contraste (fond de page) |
|--------|---------|------------------------|---------------------------|
| actuelle | `rgb(228, 96, 11)` | 2,73:1 | 3,36:1 |
| A | `rgb(196, 74, 0)` | 3,77:1 | 4,64:1 |
| B | `rgb(184, 66, 0)` | 4,27:1 | 5,26:1 |
| C | `rgb(170, 60, 0)` | 4,85:1 | 5,98:1 |

A suffit pour le seuil (grand texte, 3:1) en restant proche de l'orange de la charte ; C dépasse 4,5:1. Le thème sombre n'est pas concerné : le titre blanc se trouve sur la partie sombre du dégradé.

## Ce que ces mesures ne prouvent pas (contrôles d'Alex)

- Lecture réelle au lecteur d'écran (VoiceOver) : annonces, ordre de lecture.
- Glisser-déposer au toucher sur un vrai téléphone.
- Parcours complet au clavier sur ton poste, sans souris, de la connexion à l'encaissement.
- Le texte posé sur les dégradés des bandeaux est jugé sur le point le plus défavorable ; seul le titre sort sous le seuil, les autres textes y sont lisibles à l'œil.
