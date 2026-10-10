# PRD Quality Review — LogMerry

## Overall verdict
Le PRD est solide pour un projet solo à enjeu pédagogique : la vision est spécifique, les garde-fous (estimations étiquetées, citations vérifiées, RLS, refus explicite) sont chiffrés ou testables, et le jalon RAG du 30 octobre est clairement isolé. Les risques sont ailleurs : les critères de réussite du court terme (valider le WS8) ne sont pas mesurés, plusieurs FR n'ont aucune conséquence testable, l'index des hypothèses est quasi vide alors que le PRD s'appuie sur des valeurs fiscales non vérifiées, et aucun arbitrage de charge n'est exposé pour un MVP de 16 FR.

## Decision-readiness — adequate
Les décisions sont énoncées comme telles : seuil « 18 sur 20 (décision de l'auteur) » (FR-6, SM-2), chat dans une fonction Supabase et n8n écarté (addendum « Chat et ingestion »), base unique avec purge (§5.2), « Options écartées » dans l'addendum. Les compromis y sont nommés avec ce qui est abandonné (colonne « fictif », second projet Supabase).

Mais certaines tensions sont lissées. §1 affirme que les deux buts (« valider le Workshop 8 » et « piloter l'activité réelle ») « vont dans le même sens » ; or le jalon 30 octobre, la date de soutenance inconnue (§9.1) et un cockpit financier complet tirent dans des directions différentes (démo fictive contre usage réel). Aucun `[NOTE FOR PM]` n'existe, alors que ces tensions en méritent. Les Questions ouvertes mélangent vraies questions (§9.1, §9.3, §9.5) et une décision déjà prise (§9.2 : seuil « fixé à 18 sur 20 par l'auteur »).

### Findings
- **high** Pas d'arbitrage de charge pour le MVP (§7.2) — « FR-7 à FR-16 ; FR-17 et FR-18 si le calendrier le permet » : 10 FR sans ordre interne, sans estimation, sans date butoir, alors que la date de soutenance est inconnue (§9.1). La seule ligne de coupe est le catalogue (§4.8). *Fix:* ordonner FR-7 à FR-16 par priorité (le cockpit FR-14 dépend de FR-8, FR-9, FR-13), reprendre l'enveloppe d'heures et nommer le second bloc à couper (FR-15 ou FR-11).
- **medium** Question ouverte qui n'en est pas une (§9.2) — le seuil est déjà décidé. *Fix:* la sortir des questions ouvertes, ne garder que « réviser si Richard exige autre chose » comme risque.
- **medium** Tension non signalée entre §4.1 « les comptes de démonstration et le compte réel coexistent dans la même base » et FR-2 « aucune donnée réelle… avant la purge » — le PRD ne dit pas ce qui se passe si l'auteur saisit une vraie donnée avant la purge, ni qui déclenche la purge. *Fix:* ajouter une note PM et un critère de déclenchement.
- **medium** Dépendance bloquante peu visible (§9.3) — le choix du modèle d'embeddings fixe la dimension de la première migration (addendum), donc bloque tout le jalon du 30 octobre, mais il est en position 3 d'une liste sans date. *Fix:* date limite explicite.

## Substance over theater — strong
Aucun théâtre : pas de personas décoratifs (un seul utilisateur, les non-utilisateurs sont nommés §2.2), pas de section d'innovation, une vision propre au produit (« structure », « cite ses sources »). Les NFR sont majoritairement chiffrés ou rattachés à des FR (NFR-3 renvoie à FR-1). Les JTBD (§2.1) pilotent réellement FR-13 à FR-16.

### Findings
- **low** NFR-1 et NFR-4 restent adjectivales — « dans la majorité des cas » (NFR-1) sans percentile ; « peuvent être restaurées » (NFR-4) sans objectif de point de restauration ni test. *Fix:* « p90 < 15 s » ; « restauration testée une fois avant les vraies données ».
- **low** NFR-5 (traçabilité du journal) est une exigence de démarche, pas une NFR produit. Acceptable ici car le WS8 l'évalue, mais à étiqueter comme contrainte de projet.

## Strategic coherence — adequate
La thèse existe (la structure rend l'activité atteignable ; l'IA explique et cite, le code calcule) et l'ordre RAG d'abord est justifié par le risque. Les contre-indicateurs SM-C1 et SM-C2 sont un vrai point fort. Le MVP combine toutefois trois logiques : démonstration d'un RAG (WS8), outil de pilotage financier, portfolio public ; le PRD ne dit pas laquelle prime si elles divergent.

### Findings
- **high** Le but prioritaire à court terme n'a pas de métrique (§1 « valider le Workshop 8 (priorité à court terme) ») — SM-1 à SM-5 mesurent l'usage de l'outil ; seul SM-2 touche au WS8, et rien ne mesure « démarche de vibe coding traçable » ni la démo. *Fix:* ajouter un SM de livraison (jalon tenu, démo de bout en bout) ou assumer que le WS8 se juge hors PRD.
- **medium** SM-3 (« sur un trimestre ») et SM-5 (4 jours par semaine) ne sont pas vérifiables avant la soutenance et mesurent l'activité plus que la thèse « structure ». *Fix:* préciser la période d'observation et la source de mesure, ou les marquer « post-WS8 ».
- **medium** SM-4 « Chaque encaissement saisi dans les 7 jours » n'est pas mesurable (aucune date de réception distincte de la date de saisie dans FR-9) et aucune FR ne rappelle l'utilisateur de saisir. *Fix:* ajouter le champ date d'encaissement et un rappel, ou retirer la métrique.
- **low** FR-15 se conclut par « Ce n'est pas un critère de réussite de l'outil » : ce statut contredit sa place dans le MVP (FR-7 à FR-16). *Fix:* justifier ou rétrograder.

## Done-ness clarity — thin
FR-1, FR-4, FR-6, FR-11 et FR-16 sont de bons modèles (conséquences testables, cas limites, seuils). Le reste est inégal, et c'est la dimension dont dépendront les épics.

### Findings
- **high** FR-5, FR-7, FR-12, FR-13 (partiellement) et FR-15 n'ont aucune conséquence vérifiable — FR-5 : « conservés et consultables » (combien de temps ? par conversation ? avec relecture de la source ?) ; FR-7 : « crée et suit » sans statuts définis ; FR-15 : aucun comportement testable. *Fix:* un critère d'acceptation par FR (ex. FR-5 : « rouvrir un échange affiche ses citations avec lien vers la note »).
- **high** FR-14 : ordre et déclencheurs flous — UJ-1 dit « la liste se réordonne » mais le PRD ne définit aucune priorité entre les six règles, ni « J-3 », « J+1 », « M-1 » (jours calendaires ou ouvrés ? déclenchement unique ou répété ?), ni « pipeline vide (moins de deux projets prévus le mois suivant) » (que compte-t-on ?). *Fix:* tableau règle / déclencheur / priorité / données lues, avec un cas de test par règle.
- **high** FR-11 : « 100 % des cas de référence… dont… prorata de la première année, fin de l'ACRE, bascule de TVA » — les cas ne sont ni listés ni sourcés, et les valeurs de référence sont « non vérifiées » (§9.5). La condition de succès (SM-1) dépend donc de données qui n'existent pas encore. *Fix:* annexer les cas de référence (même prévus à 5) ou fixer le moment de leur production.
- **medium** FR-6 : « 15 à 20 questions » mais seuil « 18 sur 20 » — à 15 questions le seuil est incohérent (18/20 = 90 %). *Fix:* exprimer en pourcentage (90 %) ou fixer le nombre à 20.
- **medium** FR-4 : « seuil de similarité » sans valeur ni méthode de calibrage ; FR-3 : « renvoie les notes pertinentes » sans critère. *Fix:* indiquer que le seuil est calibré sur `docs/rag-tests.md` et par qui.
- **medium** FR-12 : seul critère « refusée explicitement » ; la frontière entre « expliquer » et « conseiller » n'est pas illustrée. *Fix:* 3 exemples attendus de refus et 3 exemples d'explication autorisée, intégrés au jeu de test.
- **medium** FR-16 : l'« accord du client » n'a pas de forme (case cochée, document joint, date). *Fix:* définir la trace minimale d'accord, condition de publication.
- **low** UJ-1 : « trois tâches » et FR-14 « six règles » ne disent pas ce qui se passe avec zéro ou plus de dix tâches.

## Scope honesty — adequate
Les non-objectifs (§6) font un vrai travail, et les marqueurs `[OPTIONNEL MVP]` et `[NON-GOAL pour le MVP]` (§4.8, FR-18) sont bien placés. La frontière avec la facturation légale est explicite. En revanche, la discipline de balisage promise en §0 n'est pas tenue.

### Findings
- **high** Aucun `[ASSUMPTION]` inline alors que §0 annonce « Les hypothèses sont balisées `[ASSUMPTION]` et indexées en §10 » — l'index §10 ne contient qu'une ligne (statut BNC et valeurs de référence), renvoyant à §9.5 et non à une balise. Beaucoup d'inférences ne sont pas balisées : les seuils de FR-14 (90 %, 7 jours, 2 projets), le statut avec ACRE et TVA, NFR-1 (3 s, 15 s), la période de 7 jours de SM-4. *Fix:* balises inline sur ces valeurs et index complet.
- **medium** Incohérence entre non-objectif et FR-14 : §6 exclut « le calcul officiel… de TVA », tandis que FR-14 déclenche une règle sur « plafond de TVA atteint à 90 % » et FR-11 teste une « bascule de TVA ». La distinction (estimation versus officiel) est dans le glossaire mais pas rappelée ici. *Fix:* une phrase de rattachement dans §6.
- **medium** Densité de points ouverts : 5 questions ouvertes, dont 2 bloquantes pour la fiabilité (§9.3, §9.5), contre 0 `[NOTE FOR PM]`. Pour un PRD qui engage un jalon à 3 semaines, c'est acceptable seulement si les échéances de résolution sont fixées.
- **low** Le périmètre horaire (estimation de 130 h dans le plan du projet) n'apparaît pas dans le PRD ; la faisabilité du MVP n'est pas discutée.

## Downstream usability — adequate
Glossaire présent et plutôt bien tenu, IDs FR-1 à FR-18, NFR-1 à NFR-5, SM-1 à SM-5 / SM-C1 / SM-C2 contigus et sans doublon, renvois UJ vers fonctionnalités résolus (« Réalise UJ-1/2/3 »). L'addendum sépare proprement les choix techniques.

### Findings
- **medium** Termes métier utilisés sans entrée de glossaire : Prospect, Client, Facture, Devis, Tâche, Jauge, Cockpit, Pipeline, ACRE, CA. Les épics et l'architecture en auront besoin (surtout Facture, Devis, Tâche). *Fix:* compléter le glossaire.
- **medium** Dérive de vocabulaire — « CA encaissé » (FR-15) / « CA facturé » (SM, FR-9) / « Encaissement » (glossaire) ; FR-13 parle de « fiche de paramètre » alors que le glossaire définit **Paramètre** sans notion de fiche ; « étapes »/« Étape » ; « extrait » côté PRD, « chunk » absent mais « découpé en extraits » implicite côté addendum. *Fix:* un terme par concept.
- **medium** Couverture des parcours — seulement 3 UJ pour 16 FR de MVP ; aucun parcours pour finances/échéances (FR-9, FR-11, FR-13) alors que SM-1, SM-3 et SM-4 en dépendent. *Fix:* un UJ « Alex saisit un encaissement et lit sa position de plafond ».
- **low** UJ-3 : protagoniste « Un visiteur » / « un prospect », non nommé et sans contexte (d'où vient le lien ?). 
- **low** SM-2 duplique FR-6 (seuil 18/20, zéro fuite) ; en cas de changement du seuil il y a deux endroits à corriger.

## Shape fit — strong
Outil mono-opérateur à finalité de démonstration, structuré en capacités avec trois UJ, des métriques opérationnelles et un addendum technique séparé : la forme convient. L'effort de formalisation est proportionné, sauf pour la partie « Version future » (§7.4, Strava/Coros) qui n'a pas à figurer dans un PRD de MVP et fait du bruit pour les étapes suivantes (la logique RGPD est dans l'addendum, ce qui suffit).

### Findings
- **low** §7.3 et §7.4 occupent de la place et introduisent des décisions de principe (données de santé) sans lien avec l'usage du PRD par l'UX et l'architecture. *Fix:* réduire à une ligne chacune ou déplacer dans l'addendum.

## Mechanical notes
- IDs : FR-1 à FR-18, NFR-1 à NFR-5, UJ-1 à UJ-3, SM-1 à SM-5 et SM-C1/C2 contigus. Aucun renvoi cassé : « voir §5 » (FR-2) pointe bien sur la purge en §5.2 ; « Dépend de FR-17 » (FR-18) correct.
- Index des hypothèses : échec de l'aller-retour. §10 contient une entrée qui renvoie à §9.5, aucune balise `[ASSUMPTION]` n'apparaît inline (voir Scope honesty).
- Fichiers cités non vérifiés ici : `docs/brief.md`, `_bmad-output/forge/logmerry-mvp/forged-idea.md`, `docs/rag-tests.md`.
- Protagonistes : UJ-1 et UJ-2 sont portés par Alex ; UJ-3 flottant.
- Sections requises présentes : vision, utilisateurs, FR, NFR, non-objectifs, phases, SM, questions ouvertes. Manquent : estimation/enveloppe de charge et risques.
