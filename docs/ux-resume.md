# LogMerry : résumé de la conception UX

*Source : `DESIGN.md` et `EXPERIENCE.md` (session UX du 11 et 12 octobre 2026).*

## L'objectif
Un cockpit personnel pour piloter une activité de conseil No-Code/IA, avec un assistant qui répond à partir de mes notes en citant ses sources.

## Les écrans principaux
- **Cockpit « Aujourd'hui »** : les tâches du jour avec leur motif, la jauge de plafond.
- **Assistant** : panneau ouvrable depuis toute page, réponses citées, historique.
- **Notes** : la base de connaissances, avec recherche et résumé généré.
- **Clients / prospects / contacts** : le suivi minimal des relations.
- **Missions et Étapes** : le découpage d'un projet et son avancement.
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
- **Ambiance** : sobre, grille nette, fort contraste.
- **Couleurs** : fond Chalk, cartes Dawn, texte Forest, boutons et focus en vert Kyuri. Mode sombre : fond Forest, accent jaune Sneezeweeds. L'orange Tobiko ne marque que les 90 % de la jauge. Quelques dégradés (portfolio, connexion, en-tête du cockpit), jamais derrière les tâches ou les tableaux.
- **Typographie** : Plus Jakarta Sans, chiffres alignés pour les montants et les dates.

## Les points encore ouverts
- Tester le raccourci `⌘K` (recherche et assistant) sur Safari, Chrome et Firefox Mac.
- Fixer la largeur à partir de laquelle l'affichage passe en mode tablette.
- Reporter dans le PRD deux parcours (saisie après un premier rendez-vous ; paiement et plafond) et les décisions de la session.
