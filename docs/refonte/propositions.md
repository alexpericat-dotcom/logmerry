# Refonte de l'identité visuelle : propositions (en attente de choix)

Date : 2026-10-14. Branche : `feat/refonte-identite-visuelle`. Aucun fichier du code de l'application n'est modifié. Tout est dans `docs/refonte/`.
Reproduire les calculs : `python3 docs/refonte/contrastes.py` (0 problème) et `python3 docs/refonte/build_previews.py`.

## 1. Audit de l'existant (DESIGN.md + thème appliqué)

1. Une seule couleur vive (olive Kyuri) sur papier crème : cohérent, mais l'olive est un vert, voisin du vert « succès ».
2. Le dark mode est un jeu de jetons à part, ce qui est bien ; les contrastes sont déjà testés automatiquement (`lib/theme.test.ts`).
3. Typographie : Plus Jakarta Sans seule, sans police chiffrée dédiée ; les montants reposent sur `tnum`.
4. Cinq dégradés (scènes A/B/C) décoratifs : ils donnent une identité mais n'ont pas d'usage fonctionnel et coûtent en lisibilité sur les écrans de travail.
5. Statuts (succès, attention, danger) : icône + mot déjà en place pour l'indexation, pas encore généralisé aux futures listes CRM.
6. Aucun jeton de graphique : les jauges et courbes à venir n'ont pas de palette dédiée.
7. Pas de jeton « filet » distinct de la bordure de champ : un seul gris sert aux deux, alors que le filet décoratif n'a pas à atteindre 3:1 et la bordure de champ si.
8. Coins arrondis 4/6/8 et pastilles `full` : plutôt « SaaS générique » que « éditorial ».
9. Le cockpit « Aujourd'hui » n'a pas encore de hiérarchie chiffrée forte (gros chiffres en mono).
10. Les contrôles natifs suivent le thème (`color-scheme`), acquis récent à conserver.

### Contradictions entre le brief collé et DESIGN.md

- Brief : « signature jamais confondue avec un statut » ; DESIGN.md : l'olive sert de signature et le vert de succès est proche. À trancher : la direction 1 garde l'olive et réduit l'écart avec un succès turquoise, les directions 2 et 3 le suppriment.
- Brief : variables shadcn conservées + nouvelles (`filet`, statuts, graphiques) ; DESIGN.md ne définit ni filet ni graphiques (le test de conformité les refuserait tant que DESIGN.md n'est pas mis à jour d'abord).
- Brief : police d'affichage + mono ; DESIGN.md : une seule famille. Ajouter une famille change le poids de page (voir §3).
- Brief : style éditorial (filets, peu d'ombres) ; DESIGN.md prévoit des dégradés décoratifs et des pastilles arrondies : à retirer ou à garder pour la seule page de connexion.
- Brief : « une direction peut garder l'olive » ; DESIGN.md dit « fait foi » : la mise à jour de DESIGN.md passera par le workflow BMAD, comme demandé.

## 2. Trois directions de palette

Seuils vérifiés par script : texte ≥ 4,5:1, éléments d'interface ≥ 3:1, écart de teinte signature / statut ≥ 40°, graphiques distincts pour les trois formes de daltonisme (écart Lab ≥ 15, matrices de Machado 2009). Résultats : tout passe, clair et sombre.

| | 1 · Olive affinée | 2 · Cobalt | 3 · Ultraviolet |
|---|---|---|---|
| Signature clair / sombre | #4B5D16 / #BFD35F | #1D3BFF / #8195FF | #5B21D6 / #B49BFF |
| Papier clair / sombre | #F6F4F1 / #12160B | #F7F6F2 / #0E1014 | #F8F6F3 / #100E16 |
| Encre / papier | 15,75 / 15,64 | 17,47 / 16,84 | 17,29 / 16,98 |
| Signature en texte / papier | 6,65 / 11,09 | 6,22 / 6,96 | 7,39 / 8,28 |
| Texte du bouton / signature | 6,65 / 11,09 | 6,73 / 6,96 | 7,97 / 8,28 |
| Bordure de champ / papier | 3,72 / 4,84 | 3,43 / 3,96 | 3,33 / 3,64 |
| Écart de teinte min. signature / statut | 46° (attention) | 77° (succès) | 101° (succès) |
| Graphiques, écart daltonisme min. | 30,1 clair / 28,0 sombre (jeu commun aux trois) | idem | idem |

- **1 · Olive** : continuité, aucun travail de marque perdu. Réserve : écart de 46° (clair) et 41° (sombre) avec « attention » : réussi mais juste. La séparation repose surtout sur l'icône et le mot, pas sur la couleur seule.
- **2 · Cobalt** : le plus « outil sérieux », aucun statut bleu. Réserve : bleu électrique très saturé, fatigue possible sur de grandes surfaces ; l'usage reste limité (bouton, lien, focus, filet actif).
- **3 · Ultraviolet** : le plus reconnaissable et le plus éloigné des statuts. Réserve : violet associé à beaucoup de produits d'IA, donc moins distinctif en soi.

Statuts séparés (succès, attention, danger) : chacun a son jeton, toujours accompagné d'une icône et d'un mot. Les graphiques ont leurs propres jetons (`chart-1` à `chart-5`), jamais la signature.

## 3. Deux associations de polices

| | A | B |
|---|---|---|
| Interface | Inter | Hanken Grotesk |
| Affichage | Fraunces (empattement) | Hanken Grotesk, graisse 600-700 |
| Chiffres | JetBrains Mono | IBM Plex Mono |
| Ton | éditorial, contraste fort | sobre, homogène |
| Poids | 3 familles | 2 familles (plus léger) |

Toutes sont sous licence SIL OFL (libre, usage commercial autorisé), distribuées par Google Fonts et chargeables avec `next/font/google`, qui les auto-héberge au build (aucune requête vers Google à l'exécution).

À ne pas prendre pour acquis, non vérifié ici :
- les chiffres tabulaires (`tnum`) de Hanken Grotesk : à contrôler sur écran ; les polices mono les garantissent par construction ;
- le rendu sur Windows et Android (je n'ai testé que Chrome sur macOS) ;
- la licence exacte de chaque version publiée : relire le fichier de licence du paquet au moment de l'intégration ;
- les aperçus HTML chargent les polices depuis Google Fonts ; l'application, elle, les auto-héberge.

## 4. Les 5 règles les plus risquées et leur test sur écran réel

1. **La signature n'est jamais un statut** (olive vs succès/attention) : afficher la liste des clients avec un prospect (signature) et un client (succès) ; vérifier à bout de bras sur téléphone qu'on les distingue sans lire.
2. **Statut = icône + mot, jamais la couleur seule** : passer l'écran en niveaux de gris (Réglages d'accessibilité macOS/iOS « filtres de couleur ») et relire la liste.
3. **Texte secondaire ≥ 4,5:1 en clair ET en sombre** : à la luminosité minimale, en extérieur ou près d'une fenêtre, lire une ligne secondaire de la liste.
4. **Graphiques sans confusion en daltonisme** : afficher le graphique et appliquer le filtre daltonisme du système (deutéranopie, protanopie, tritanopie) ; chaque barre doit rester identifiable avec sa légende.
5. **Focus visible et contrôles natifs cohérents** : parcourir le cockpit au clavier seul (Tab) et ouvrir un menu déroulant natif dans chaque thème ; l'anneau de focus doit rester visible sur papier et sur surface.

## 5. Les aperçus

Ouvrir dans un navigateur (boutons en haut : thème clair/sombre, typo A/B) :
- `docs/refonte/apercu-1-olive.html`
- `docs/refonte/apercu-2-cobalt.html`
- `docs/refonte/apercu-3-ultraviolet.html`

Chacun montre le cockpit « Aujourd'hui », la liste des clients et une fiche client, avec données fictives.

## Décision attendue

Choisis une direction (1, 2 ou 3) et une association de polices (A ou B), ou demande un mélange. Je n'écris rien dans le code, DESIGN.md ni `docs/ui-rules.md` avant ta réponse.
