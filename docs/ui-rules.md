# Règles d'interface de LogMerry

Contrat court, lisible par un développeur ou une IA avant d'écrire un écran. La référence complète est `DESIGN.md` (aspect) et `EXPERIENCE.md` (comportement) dans `_bmad-output/planning-artifacts/ux-designs/ux-logmerry-2026-10-11/`. En cas de conflit, ces deux fichiers l'emportent. Identité : direction « Cobalt » en sombre, direction « Arcade clair » en clair (choix du 2026-10-15, voir DESIGN.md), polices Hanken Grotesk + IBM Plex Mono, Pixelify Sans pour les titres.

## Règles

1. **Aucune valeur de couleur, de police ou de rayon dans un composant.** Uniquement des jetons (`bg-background`, `text-muted-foreground`, `border-filet`, `text-chart-1`…). Vérifié par `lib/theme.test.ts`.
2. **Le cobalt (`primary`) est la signature** : lien, élément actif, case cochée. **Le focus a sa propre couleur** (`ring` : cobalt en clair, orange en sombre), avec un décalage de 2 px. **Sélection** : en clair, une pastille orange cernée de marine à ombre dure (`.neon`), la catégorie active de la barre latérale sur fond `accent` avec filet marine ; en sombre, le néon : dans la barre latérale l'icône s'allume au survol, au focus et pour la catégorie active (`.neon-icon`, sans cadre) ; un filtre actif a son contour allumé (`.neon`) ; dans les deux cas le gras et `aria-current` portent aussi l'état. **Les boutons d'action portent le dégradé d'action** (`bg-gradient-action text-action-foreground`, orange à plat en clair), jamais un aplat cobalt ; en clair ils ont un trait marine et une ombre dure (`shadow-hard`). Jamais un statut, jamais une série de graphique.
3. **Un statut = une icône + un mot + sa couleur** (`success`, `warning`, `destructive`). Aucune information portée par la couleur seule.
4. **Les graphiques n'utilisent que `chart-1` à `chart-5`**, avec légende ou étiquette directe.
5. **Texte ≥ 4,5:1, éléments d'interface ≥ 3:1**, en clair et en sombre. Le filet (`filet`) est décoratif : il ne délimite jamais un champ ; un champ utilise `input` (≥ 3:1).
6. **Traits marine de 2 px et ombre dure en clair** (`--border-w`, `shadow-hard`, jamais d'ombre floue) ; 1 px et sans ombre en sombre. Séparer les lignes d'un tableau par un filet doux (`border-filet`). Bandeau d'en-tête (`PageBanner`) sur chaque écran principal, titre en haut et, si besoin, une explication courte au bas dans son cartouche et les filtres en pastilles à fond presque opaque (jamais de texte posé directement sur le bas coloré). Dégradés `gradient-1` (discret) et `gradient-2` « couchant » (noir, bleu nuit, violet, rose, corail), texte uniquement dans les 45 % du haut limités aux scènes A (portfolio), B (connexion, avec texte), C (bandeau du cockpit), avec les paires texte validées ; jamais derrière tâches, tableaux, jauge ou chat ; jamais animés. Ombre réservée aux popovers et dialogues.
7. **Tout montant, date et durée en mono tabulaire** (`font-mono`, `tabular-nums`), aligné à droite dans les tableaux. Tout montant calculé porte l'étiquette « estimation ».
8. **Chaque jeton existe en clair et en sombre.** Un jeton sans pendant ne passe pas la revue.
9. **Focus visible partout** : anneau `ring` orange de 2 px décalé de 2 px ; navigation complète au clavier.
10. **Composants shadcn par défaut** (Dialog, Sheet, Command, Popover, Toast, Tabs, Skeleton, Separator, Table), recolorés par les jetons ; on ne redessine pas sans raison de marque.
11. **Le nom « LogMerry » s'écrit en Bricolage Grotesque 700 (`font-brand`) avec le logo vectoriel en sombre ; en clair, le logo est en pixels (`public/images/logo-pixel.svg`, `LogoMark` choisit selon le thème) et le nom en Pixelify Sans (`font-pixel`, bicolore sur la connexion), partout (barre latérale, barre du haut, connexion).** Les titres de bandeau sont en Pixelify Sans capitales (`font-pixel text-display`, ombre `tone-teal`) ; jamais pour le texte courant.
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

## Direction « Arcade clair » (story R9)

- Accents décoratifs : `tone-teal`, `tone-violet`, `tone-orange`, `tone-pink`, `tone-yellow` (jamais du texte ; texte marine dessus ≥ 4,5:1, vérifié par `lib/theme.test.ts`). Une carte de note porte une barre de 6 px par type (violet, turquoise, orange, rose) ; le type reste écrit.
- Le bandeau du cockpit (`PageBanner hero`) n'a plus de décor (étoile et écran au portrait retirés à la demande d'Alex) : `hero` garde l'écriture au clavier de l'explication et, en sombre, son placement à droite. La connexion (`AuthShell`) a la même construction dans les deux thèmes : carte centrée sur le dégradé, nom et logo en haut à gauche, sans illustration (le nom et le logo sont en pixels en clair).
- Images dans `public/images/` (portrait, `scene-tshirt`, `logo-pixel.svg`), décoratives (`alt=""`), `image-rendering: pixelated`. Le slogan de la connexion est aussi en pixel en clair. Au survol, une icône de la barre latérale garde sa couleur (pas de bleu).

## Première page : la connexion (2026-10-17)

`/` ne montre plus d'écran de choix du thème (décision d'Alex : plus sobre et plus pro). Elle redirige vers la connexion (`/auth/login`), ou vers le cockpit pour une personne déjà connectée. Le thème par défaut est le **sombre** (« Futur ») ; le thème clair (« Rétro ») reste disponible par le bouton « Changer de thème » de la barre latérale, et le choix est mémorisé. L'ancien écran (rideau animé, deux moitiés « Rétro » et « Futur ») et ses deux scènes ont été retirés.

## Téléphone (sous 768 px, story R8)

- Barre du haut fixe (menu, logo) ; la barre latérale devient un tiroir avec libellés, fermé par défaut, refermé à la navigation, au clic sur le fond, par Échap ou à l'ouverture de l'assistant ; fermé, il est invisible (hors parcours clavier et lecteur d'écran).
- Cibles tactiles de 44 px au moins : boutons, champs, menus, pastilles de filtre, liens e-mail et téléphone, « Annuler », lignes de la palette ⌘K (variante `max-md:`). Exception : un lien dans une phrase.
- Marges de page et de bandeau réduites (16 px), bandeau de titre seul plus bas, tableau sans colonne de date (`hideOnMobile`), date d'une carte de note au-dessus du titre.
- Vérification : émulation Pixel 6a (412 × 915, ×2,625) dans Chrome, clair et sombre, puis essai sur le vrai téléphone.

## Découpage de la refonte (une branche, un commit par story)

Branche `feat/refonte-identite-visuelle`. Voir `docs/refonte/stories.md`.
