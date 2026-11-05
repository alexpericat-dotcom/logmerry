# LogMerry : résumé de la conception UX

*Source : `DESIGN.md` et `EXPERIENCE.md` (session UX du 11 et 12 octobre 2026).*

## L'objectif
Un cockpit personnel pour piloter une activité de conseil No-Code/IA, avec un assistant qui répond à partir de mes notes en citant ses sources.

## Les écrans principaux
- **Cockpit « Aujourd'hui »** : les tâches du jour avec leur motif, la jauge de plafond.
- **Assistant** : panneau ouvrable depuis toute page, réponses citées, historique.
- **Notes** : la base de connaissances, avec recherche et résumé généré.
- **Clients / prospects / contacts** : le suivi minimal des relations.
- **Missions** : backlog agile (user stories, tâches, glisser-déposer), avec l'aide de l'IA pour proposer stories et tâches et pour générer un prompt à confier à un autre assistant.
- **Factures et Encaissements** : payé ou non, sommes reçues.
- **Échéances** : obligations datées, avec leur source.
- **Paramètres** : valeurs (dont le plafond) avec source et date de vérification.
- **Réalisations** : édition du portfolio, accord du client, publication.
- **À faire** : les éléments à documenter plus tard.
- **Portfolio public** : vitrine en lecture seule, avec un lien « m'écrire ».
- **Connexion** : accès sécurisé.

## Les 3 parcours les plus importants
**1. Alex ouvre son cockpit un lundi à 8 h, sur son Mac.**
1. Il se connecte et arrive sur « Aujourd'hui ».
2. Il lit ses tâches ; chacune dit pourquoi elle est là (« facture échue depuis 1 jour »).
3. Il coche la première : retour de satisfaction, la liste se réordonne.
4. Il continue jusqu'à la dernière.
5. « Bravo, tu as fait toutes tes tâches du jour. » (Proposer de prendre de l'avance viendra après le MVP.)

**2. Alex retrouve une procédure pendant une visio avec un client.**
1. Le client pose une question pointue ; Alex ouvre l'assistant dans un coin de l'écran.
2. Il tape des mots-clés (« procédure transfert n8n client »).
3. La réponse arrive d'abord, en 2 ou 3 puces ; les sources s'affichent dessous.
4. « Copier le texte » le colle dans le chat de la visio ; après l'appel, « Ouvrir » affiche le document complet.
5. Si l'assistant ne trouve rien, il le dit, et « Créer une note à documenter plus tard » garde la question.

**3. Camille, gérante d'agence (personnage fictif), consulte une réalisation.**
1. Elle ouvre sur ordinateur le lien reçu par e-mail.
2. En dix secondes, elle perçoit quelqu'un de rigoureux, efficace, soigné et réfléchi.
3. Elle ouvre une réalisation : description, captures, chiffre de résultat, outils utilisés.
4. Elle écrit à Alex par le lien « m'écrire ». Le nom du client n'apparaît jamais sans son accord.

## Le style visuel
*Mis à jour le 5 novembre 2026 d'après `DESIGN.md` (statut « final », 18 octobre 2026) et `docs/ui-rules.md`. La palette de la session du 11 octobre (Chalk, Dawn, Forest, Kyuri, Sneezeweeds, Tobiko) a été remplacée.*

- **Ambiance** : sobre, grille nette, fort contraste. Thème **sombre par défaut** (« Cobalt »), thème clair « Arcade clair » (choix du 15 octobre 2026) disponible par le bouton « Changer de thème » ; le choix est mémorisé.
- **Thème sombre** : fond `#0E1014`, cartes `#161A21`, texte `#F2F1EC`, signature cobalt clair `#8195FF`, focus orange `#FFA94D`, succès `#5FD3A0`, attention `#F5B547`, erreur `#FF8A80`.
- **Thème clair** : fond ciel très pâle `#F7FAFF`, encre marine `#1B1F4B`, signature cobalt `#1D3BFF`, traits marine de 2 px et ombre dure, succès `#097145`, attention `#954F00`, erreur `#B3261E`. Accents décoratifs turquoise, violet, orange, rose et jaune, jamais en texte.
- **Règles de couleur** : le cobalt est la signature (lien, élément actif, case cochée), jamais un statut ni une série de graphique. Un statut = icône + mot + couleur. Cinq jetons de série pour les graphiques. Aucune valeur de couleur dans un composant : uniquement des jetons.
- **Dégradés** : connexion, bandeau du cockpit et portfolio ; jamais derrière les tâches ou les tableaux.
- **Typographie** : Hanken Grotesk (texte et titres), IBM Plex Mono (chiffres alignés : montants, dates), Pixelify Sans (titres de bandeau en capitales, thème clair seulement), Bricolage Grotesque (logotype « LogMerry » en sombre).

## Les points encore ouverts
- Tester le raccourci `⌘K` (recherche et assistant) sur Safari, Chrome et Firefox Mac.
- Fixer la largeur à partir de laquelle l'affichage passe en mode tablette.
- Reporter dans le PRD deux parcours (saisie après un premier rendez-vous ; paiement et plafond) et les décisions de la session.
