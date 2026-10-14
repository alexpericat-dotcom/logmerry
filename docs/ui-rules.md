# Règles d'interface de LogMerry

Contrat court, lisible par un développeur ou une IA avant d'écrire un écran. La référence complète est `DESIGN.md` (aspect) et `EXPERIENCE.md` (comportement) dans `_bmad-output/planning-artifacts/ux-designs/ux-logmerry-2026-10-11/`. En cas de conflit, ces deux fichiers l'emportent. Identité : direction « Cobalt », polices Hanken Grotesk + IBM Plex Mono (choix du 2026-10-14).

## Règles

1. **Aucune valeur de couleur, de police ou de rayon dans un composant.** Uniquement des jetons (`bg-background`, `text-muted-foreground`, `border-filet`, `text-chart-1`…). Vérifié par `lib/theme.test.ts`.
2. **Le cobalt (`primary`) est la signature** : lien, élément actif, case cochée. **Le focus a sa propre couleur** (`ring`, orange des boutons d'action), avec un décalage de 2 px. **L'élément sélectionné (catégorie de la barre latérale, filtre actif) s'allume en « néon »** (classe `.neon`), en plus du gras et de `aria-current`. **Les boutons d'action portent le dégradé d'action** (`bg-gradient-action text-action-foreground`), jamais un aplat cobalt. Jamais un statut, jamais une série de graphique.
3. **Un statut = une icône + un mot + sa couleur** (`success`, `warning`, `destructive`). Aucune information portée par la couleur seule.
4. **Les graphiques n'utilisent que `chart-1` à `chart-5`**, avec légende ou étiquette directe.
5. **Texte ≥ 4,5:1, éléments d'interface ≥ 3:1**, en clair et en sombre. Le filet (`filet`) est décoratif : il ne délimite jamais un champ ; un champ utilise `input` (≥ 3:1).
6. **Séparer par des filets de 1 px**, pas par des ombres ni des aplats. Bandeau d'en-tête (`PageBanner`) sur chaque écran principal, titre en haut et, si besoin, une explication courte au bas dans son cartouche et les filtres en pastilles à fond presque opaque (jamais de texte posé directement sur le bas coloré). Dégradés `gradient-1` (discret) et `gradient-2` « couchant » (noir, bleu nuit, violet, rose, corail), texte uniquement dans les 45 % du haut limités aux scènes A (portfolio), B (connexion, avec texte), C (bandeau du cockpit), avec les paires texte validées ; jamais derrière tâches, tableaux, jauge ou chat ; jamais animés. Ombre réservée aux popovers et dialogues.
7. **Tout montant, date et durée en mono tabulaire** (`font-mono`, `tabular-nums`), aligné à droite dans les tableaux. Tout montant calculé porte l'étiquette « estimation ».
8. **Chaque jeton existe en clair et en sombre.** Un jeton sans pendant ne passe pas la revue.
9. **Focus visible partout** : anneau `ring` orange de 2 px décalé de 2 px ; navigation complète au clavier.
10. **Composants shadcn par défaut** (Dialog, Sheet, Command, Popover, Toast, Tabs, Skeleton, Separator, Table), recolorés par les jetons ; on ne redessine pas sans raison de marque.
11. **Le nom « LogMerry » s'écrit en Bricolage Grotesque 700 (`font-brand`) avec le logo, et nulle part ailleurs.**
12. **Les contrôles natifs suivent le thème** (`color-scheme`, options de `select`).
13. **`prefers-reduced-motion` et `forced-colors` respectés.**

## Les 5 règles les plus risquées et comment les tester sur un vrai écran

| Règle | Test |
|---|---|
| 2 : la signature n'est pas un statut | Liste des clients avec un prospect (cobalt) et un client (succès) : les distinguer à bout de bras sur téléphone, sans lire. |
| 3 : icône + mot | Filtre de couleur en niveaux de gris du système : relire la liste des statuts. |
| 5 : contrastes | Luminosité minimale ou près d'une fenêtre : lire le texte secondaire, clair puis sombre. |
| 4 : graphiques | Filtres de daltonisme du système (deutéranopie, protanopie, tritanopie) : chaque série reste identifiable avec sa légende. |
| 9 : focus et natifs | Parcourir le cockpit à la touche Tab ; ouvrir un menu déroulant natif dans chaque thème. |

## Découpage de la refonte (une branche, un commit par story)

Branche `feat/refonte-identite-visuelle`. Voir `docs/refonte/stories.md`.
