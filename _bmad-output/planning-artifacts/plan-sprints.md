# Plan des sprints — LogMerry

Ce plan résume le découpage de `epics.md`. Un sprint est une courte série de 3 à 4 petites tâches (« stories ») qui se termine par une version de l'application qui fonctionne. Les sprints 1 à 6 construisent l'assistant de bout en bout, pour le jalon du 30 octobre 2026. Les sprints 7 à 13 complètent le reste du MVP.

| Sprint | Objectif | Stories | À montrer en fin de sprint | Type |
| --- | --- | --- | --- | --- |
| 1 | Poser les fondations : l'application est en ligne, je m'y connecte et je vois ma première page. | Voir LogMerry en ligne ; Me connecter et me déconnecter ; Voir mon cockpit vide | L'application sur une adresse web, la connexion, puis la page « Aujourd'hui » vide avec sa barre latérale | Standard |
| 2 | Écrire et retrouver mes notes, avec deux comptes bien isolés. | Créer et lister mes notes ; Modifier, classer, supprimer une note ; Deux comptes fictifs ne se voient pas ; Rechercher avec ⌘K | Créer des notes, les retrouver avec ⌘K, et prouver qu'un second compte ne voit rien de l'autre | Standard |
| 3 | Préparer les données pour l'IA : serveur, découpage, embeddings, indexation. | Préparer le serveur pour l'IA ; Découper une note en extraits ; Indexer une note à l'enregistrement ; Indexer mes notes existantes | Une note enregistrée est découpée et indexée, avec son état (indexée, en attente, échec) visible | IA |
| 4 | Retrouver les passages pertinents de mes notes, sans fuite entre comptes. | Fonction de recherche des passages ; Chercher par sens dans mes notes ; La recherche ne fuit pas entre comptes | Une recherche « par sens » qui affiche les bons passages, et un test qui prouve qu'aucun passage d'un autre compte n'apparaît | IA |
| 5 | Poser une question à l'assistant et obtenir une réponse avec sources vérifiées, conservée dans l'historique. | Poser une question à l'assistant ; Citations vérifiées et sources cliquables ; Retrouver mon historique | Une question dans le panneau assistant, une réponse avec ses sources cliquables, et l'historique après reconnexion | IA |
| 6 | Clore le jalon du 30 octobre : refus « je ne trouve pas », jeu de test et test de fuite. | Dire « je ne trouve pas » et créer une note à documenter ; Jeu de test du RAG et score ; Test de fuite sur l'assistant et l'historique | L'assistant qui refuse d'inventer, le score du jeu de test (cible 18 sur 20) et la preuve qu'aucun compte ne voit l'autre | IA |
| 7 | Résumer une note et suivre mes prospects et clients. | Résumé automatique d'une note ; Gérer prospects et clients ; Contacts et passage prospect → client ; Lier une note à un client | Un résumé de note étiqueté « résumé généré », et une liste de clients avec leurs contacts et leurs notes | Standard + IA |
| 8 | Suivre mes missions en agile (backlog, tâches, sprints), mes devis, et tout chercher avec ⌘K. | Créer des missions ; Backlog et user stories ; Tâches ; Sprints ; Suivre mes devis ; Rechercher clients et missions | Une mission avec son backlog et sa progression, un devis avec son statut, et une recherche ⌘K qui trouve notes, clients et missions | Standard |
| 9 | Enregistrer mes paramètres, mes factures et mes encaissements. | Renseigner mes paramètres ; Enregistrer mes factures ; Enregistrer un encaissement | Des paramètres avec source et date, des factures et des encaissements saisis | Standard |
| 10 | Voir mon plafond, mes cotisations estimées, faire expliquer mes estimations à l'assistant, et saisir mes échéances. | Position par rapport au plafond ; Estimation de cotisations ; Garde-fous et explication des estimations ; Enregistrer mes échéances | Une jauge de plafond et une estimation étiquetées « estimation », un assistant qui les explique sans conseiller, et la liste des échéances | Standard + IA |
| 11 | Avoir un cockpit « Aujourd'hui » qui me dit quoi faire et pourquoi. | Tâches du jour (échéances, factures échues) ; Tâches plafond et ACRE ; Tâches devis sans réponse et pipeline vide ; CA encaissé et jauge sur le cockpit | Un cockpit avec des tâches ordonnées, chacune avec son motif, et le CA encaissé avec la jauge | Standard |
| 12 | Lister ce qu'il reste à documenter et publier mon portfolio public. | Écran « À faire » et ligne de synthèse ; Gérer mes réalisations ; Publier avec l'accord du client ; Voir le portfolio public | Une page publique sans connexion qui n'affiche que les réalisations publiées avec accord, et l'écran « À faire » | Standard |
| 13 | Montrer toute l'application : démo, accessibilité, sauvegarde. | Données de démonstration fictives ; Accessibilité des parcours principaux ; Sauvegarde vérifiée ; Parcours de démo complet | Le parcours de démonstration complet, de la connexion au portfolio, avec une sauvegarde restaurée | Standard |

## Totaux

- **13 sprints**, **47 stories** (3 à 4 par sprint).
- Sprints 1 à 6 : jalon du 30 octobre 2026 (assistant de bout en bout). Sprints 7 à 13 : reste du MVP.
- Sprints mixtes : le 7 (résumé de note) et le 10 (assistant qui explique les estimations) contiennent une story IA.

## Points encore ouverts

- **Durée d'un sprint** : à fixer dès le sprint 1. Le jalon du 30 octobre demande 6 sprints en 17 jours, soit environ 3 jours par sprint ; sinon le sprint 6 glisse après le 30 octobre.
- **Notes en deux temps** : les notes existent dès le sprint 2, leur indexation arrive au sprint 3.
- **« À faire » en deux temps** : le bouton « Créer une note à documenter » arrive au sprint 6, l'écran « À faire » au sprint 12 ; entre les deux, les brouillons se retrouvent par un filtre dans la liste des notes.
- **Cas de référence des calculs** (sprint 10) : à fournir et à vérifier à la source avant le code.
- **Comptes de test** : « démo A » et « démo B » créés à la main dans Supabase pendant le sprint 2.
- **Modèle Claude exact** : à valider sur le jeu de test du sprint 6.
- **RGPD** : l'envoi des extraits de notes à deux fournisseurs (Anthropic et Mistral) est à documenter avant toute donnée réelle.
- **Hors MVP** (aucune story) : Vercel Pro, provisions détaillées, dépenses, n8n, import de fichiers, formulaire de contact.

## Mise à jour du 17 octobre 2026

- **Sprint 8 en agile.** « Découper une mission en étapes » est remplacé par le backlog, les user stories, les tâches et les sprints (3.4, 3.5a, 3.5b faites ; 3.5c à venir).
- **Sprint 8b (nouveau), concevoir mes missions avec l'IA :** 8.16 (backlog, faite), 8.17 (tâches, faite), 8.21 (prompt depuis une mission, en cours), puis 8.17b (tâches avec le backlog), 8.18 (relecture d'une story), 8.19 (composer un sprint), 8.20 (ordre logique du backlog). Ces stories IA se glissent après le sprint 8 sans décaler les sprints suivants.
- Totaux : le compte de 47 stories ci-dessus date de la version initiale ; la liste à jour est dans `epics.md` et `sprint-status.yaml`.
