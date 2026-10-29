# Contrôles visuels à faire (lot D4)

Ce que les tests ne voient pas : l'écran, le toucher, le clavier. Compte de démo, thème sombre puis thème clair, ordinateur puis téléphone (largeur 400 px ou vrai téléphone). Coche au fur et à mesure ; note à droite ce qui cloche.

Aperçu sur téléphone : `https://logmerry-git-<branche>-new-team-adce.vercel.app` (ou l'adresse de production). Connexion : `/auth/login`.

**Règle du jeu :** un défaut = une ligne dans `docs/journal.md` ou à dire à Claude ; pas besoin de tout cocher en une fois.

## 1. Formulaires refusés (lot D2)

Envoie le formulaire **vide** (ou avec une erreur volontaire). Attendu partout : un encadré rouge « N erreurs à corriger » en tête, un lien par erreur, le focus sur l'encadré ; un clic sur un lien met le focus sur le champ ; la ligne d'erreur sous chaque champ.

- [ ] Client : `/clients/nouvelle`
- [ ] Mission : `/missions/nouvelle`
- [ ] Note : `/notes/nouvelle`
- [ ] Échéance (« Nouvelle échéance » sur `/calendrier`) : une erreur dans « Plus de champs » ouvre ce bloc
- [ ] Facture et encaissement (`/factures`) : l'aide de la taxe est encore lue en plus de l'erreur
- [ ] Contact, devis, story, sprint, règle : un envoi vide
- [ ] Téléphone : après un clic sur un lien d'erreur, le champ n'est pas caché sous l'en-tête fixe

## 2. Page Clients (`/clients`)

- [ ] Une seule rangée de filtres (elle passe à la ligne sur téléphone sans déborder)
- [ ] « Devis en attente » : n'affiche que les fiches avec un devis envoyé ; un second clic retire le filtre
- [ ] Pastille « Devis envoyé » ; au survol (ordinateur) : montant HT et date ; « 2 devis envoyés » si plusieurs
- [ ] Cockpit : la tuile « Devis » mène à ce filtre et son chiffre est celui du cockpit
- [ ] Thème clair : pastille et pastilles de filtre lisibles
- [ ] Téléphone : le détail du devis n'est pas lisible au toucher (limite connue, dis si ça gêne)

## 3. Cockpit (`/aujourd-hui`)

- [ ] Tuiles, anneaux de plafond, lignes d'échéance : rien de cassé après le refactor (clair et sombre)
- [ ] Le bandeau et les tuiles tiennent sur téléphone sans défilement horizontal
- [ ] « À confirmer » n'apparaît que là où une donnée manque

## 4. Calendrier (`/calendrier`)

- [ ] Vues Toutes / Aujourd'hui / Cette semaine / Ce mois-ci / En retard : le compteur « en retard » suit
- [ ] « À confirmer » seulement en vue Toutes
- [ ] Affichage Liste, Kanban, Gantt en thème clair puis sombre
- [ ] **Gantt, ordinateur :** échéance faite récemment = grisée et barrée ; Tab jusqu'à un jalon, Entrée ouvre la fiche, **Échap la ferme** et le focus revient au jalon
- [ ] **Gantt, téléphone :** les jalons se touchent au doigt sans viser (44 px), le diagramme défile à l'horizontale
- [ ] Un jalon de facture ouvre `/factures`
- [ ] Lecteur d'écran (facultatif, VoiceOver) : changer d'affichage annonce « Affichage : … »

## 5. Palette de recherche (⌘K ou « Rechercher »)

- [ ] ⌘K l'ouvre ; flèches haut/bas bouclent ; Entrée ouvre le résultat
- [ ] Ligne « assistant » en dernier choix ; « Aucun résultat » quand rien ne correspond
- [ ] Échap la ferme et rend le focus

## 6. Factures et encaissements (`/factures`)

- [ ] Clair et sombre, ordinateur et téléphone
- [ ] Supprimer un encaissement **avec le formulaire d'ajout ouvert** : le focus va au champ « Montant », annonce « Encaissement supprimé. »
- [ ] Date d'encaissement : aujourd'hui par défaut, jamais dans le futur

## 7. Missions, stories, tâches, IA

- [ ] Panneaux de relecture (stories proposées), de composition de sprint, d'ordre du backlog, des tâches proposées : thème clair, ordinateur
- [ ] Supprimer une mission : la confirmation cite stories **et** sprints
- [ ] Devis : « Mission liée » ne propose que les missions ouvertes (plus la mission déjà liée)
- [ ] **Glisser-déposer des stories et des tâches sur un vrai téléphone** (jamais testé) : on peut déplacer, le défilement de la page ne se bloque pas, une erreur de dépôt s'efface à la saisie suivante
- [ ] Ligne de story repliée sur téléphone (412 px) : lisible, pas coupée

## 8. Notes et assistant

- [ ] Notes : un filtre par type ou « brouillons » est gardé quand on ouvre une note puis « Annuler » ou « Enregistrer »
- [ ] Assistant : une question avec sources citées ; thème clair
- [ ] Session expirée (déconnecte-toi dans un autre onglet, puis pose une question) : « Ta session a expiré. Recharge la page pour te reconnecter. »

## 9. Accès (navigation privée)

- [ ] `/auth/login` s'affiche sans connexion
- [ ] Sans connexion : `/authors`, `/login`, `/clients`, `/` renvoient à la connexion
- [ ] Connecté : `/` mène au cockpit

## 10. Contrastes et lisibilité (thème clair surtout)

- [ ] Texte sur les dégradés des bandeaux : lisible partout
- [ ] Texte secondaire (gris) lisible au soleil ; pastilles d'état : l'icône et le mot, jamais la couleur seule
- [ ] Aucun défilement horizontal de page sur téléphone (hors gantt et kanban)
- [ ] Zoom du navigateur à 200 % : rien ne se chevauche

## 11. Clavier seul (story 7.2)

- [ ] Sans souris, sur ordinateur : `/factures`, détail d'une facture (Entrée), « Ajouter un encaissement » (Entrée) : le focus arrive dans le champ « Montant », Échap ou « Annuler » referme
- [ ] Même contrôle pour « Nouvelle facture », « Nouveau devis », « Ajouter un contact », « Nouvelle échéance », « Nouvelle version » d'une règle : le premier champ du formulaire est actif à l'ouverture
- [ ] Un contour de focus est visible à chaque Tab, thème clair puis sombre
- [ ] Lecteur d'écran (facultatif, VoiceOver) : à l'ouverture d'un formulaire, il lit le nom du premier champ

## Quand c'est fini

Dis à Claude ce qui ne va pas : une ligne par défaut suffit (« page, appareil, thème, ce que tu vois »). Les limites déjà connues sont dans `_bmad-output/implementation-artifacts/deferred-work.md`.
