# Tests du RAG — LogMerry

Ce fichier regroupe les tests de l'assistant : le test de fuite entre comptes (story 8.7, fait) et le jeu de questions (story 8.14, **à rédiger par toi**).

## 1. Test de fuite de la recherche par sens entre comptes (story 8.7)

**But :** prouver qu'un compte ne reçoit jamais un extrait d'un autre compte quand il cherche par sens. Une seule fuite bloque la livraison.

**Commande :** `npm run test:leak` (fichier `tests/leak-search.test.ts`).

**Prérequis :** les deux comptes fictifs `démo A` et `démo B` (@example.com) dans `.env.test.local`, et `MISTRAL_API_KEY` dans `.env.local`. Le test refuse de tourner avec un compte hors `@example.com`. Il utilise la clé publique de Supabase, jamais `service_role`.

**À rejouer :** après chaque migration qui touche `note_chunks`, `match_chunks` ou leurs droits, et avant chaque livraison (jalon du 30 octobre).

**Ce que fait le test**
1. A et B reçoivent chacun 3 notes fictives sur des thèmes proches (factures, clients, abonnements) mais avec des faits différents ; chaque note est vectorisée par le vrai `mistral-embed` (environ 10 textes envoyés à Mistral, tous fictifs).
2. Chacun pose à `match_chunks` les questions qui portent sur les sujets de **l'autre** compte, avec un seuil à 0 et la limite maximale (20), les conditions les plus favorables à une fuite : il ne doit recevoir que ses propres extraits, jamais le texte ni la note de l'autre.
3. Même chose avec le seuil réel de l'application (aujourd'hui 0,70, importé de `lib/domain/matching.ts`).
4. Lecture directe de `note_chunks` par chaque compte : aucun extrait de l'autre, ni par liste ni par note.
5. Sans connexion : la fonction est refusée (code 42501).
6. Contrôle du détecteur : un petit test vérifie que la fonction qui repère les fuites signale bien un extrait interdit (et un seul suffit) et laisse passer les siens. Il vérifie le détecteur, pas la base.
7. Les notes de test (préfixe `[leak-test]`) sont supprimées à la fin et le test échoue si l'une d'elles reste ; les extraits partent en cascade. Seuls comptent les extraits de l'autre compte : les autres notes éventuelles de démo A ou B ne faussent pas le test.

**Limites connues**
- Le test insère les notes et les extraits directement avec les comptes de test : il ne passe pas par le découpage ni par la Server Action d'indexation, qui écrivent `owner_id` ; ce chemin est couvert par `npm run test:isolation` (insertion au nom d'un autre refusée) et par les vérifications de bout en bout des stories 8.3 et 8.6.
- Les écritures (insérer, modifier, supprimer chez l'autre) sont couvertes par `npm run test:isolation`, pas ici.
- Un échec de Mistral donne « TEST NON CONCLUANT (pas une fuite) » : relancer plus tard.
- Aucun déclenchement automatique : à lancer à la main (pas de CI aujourd'hui).

**Si le test échoue sur une fuite :** la livraison est bloquée ; ne rien déployer ; ne pas corriger en affaiblissant le test ; chercher dans `match_chunks` (filtre `owner_id`, `security invoker`) et dans les policies de `note_chunks`, puis rejouer `npm run test:isolation` et `npm run test:leak`.

**Résultats**

| Date | Résultat | Commentaire |
|---|---|---|
| 2026-10-13 | 8 vérifications sur 8, aucune fuite | Migrations testées jusqu'à `20261013160748_match_chunks` ; vrais vecteurs `mistral-embed` ; aucune note de test restante. |
| (à ajouter à chaque exécution : date, dernière migration testée, résultat) | | |

## 2. Jeu de questions du RAG (story 8.14) — à rédiger

Ce jeu mesure la qualité de l'assistant : 15 à 20 questions, chacune avec la **source attendue**, dont des questions dont la réponse est absente des notes (refus attendu) et des pièges inter-comptes. Il sert aussi à régler le seuil de similarité (aujourd'hui 0,70, provisoire ; il était à 0,76 et refusait des questions légitimes) et à valider le modèle Claude (`AI_CHAT_MODEL`).

Je ne l'invente pas : il doit venir de tes vraies attentes, avec de vraies notes fictives que tu choisis. Quand tu le rédigeras, une ligne par question suffit :

| N° | Question | Source attendue (titre de la note) | Réponse présente ? | Bon extrait retrouvé ? | Réponse fidèle ? |
|---|---|---|---|---|---|
| 1 | | | | | |

Objectif de départ : 18 questions sur 20 (décision de l'auteur, à confirmer avec Richard).
