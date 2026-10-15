---
status: final
created: 2026-10-11
updated: 2026-10-15
name: LogMerry
description: Cockpit personnel de conseil No-Code/IA avec assistant RAG. shadcn/ui (new-york, base neutral, lucide) sur Next.js + Tailwind 3 + next-themes ; ce DESIGN.md ne spécifie que la couche de marque (palette Cobalt, polices Hanken Grotesk et IBM Plex Mono, filets, composants propres). Il l'emporte sur toute maquette. Refonte du 2026-10-14 (direction 2 « Cobalt », polices B) : voir docs/refonte/propositions.md.
colors:
  # Clair, direction « Arcade clair » (2026-10-15, remplace le sable chaud du 2026-10-14) : fond ciel très pâle, encre marine, traits marine de 2 px, accents turquoise, violet, orange, rose, jaune. Jetons sémantiques ; les noms shadcn sont réutilisés, la valeur est surchargée. Source des valeurs : docs/refonte/palettes.py (clé 2-cobalt).
  background: '#F7FAFF'            # papier
  foreground: '#1B1F4B'            # encre
  card: '#FFFFFF'                  # surface (second papier, rare)
  card-foreground: '#1B1F4B'
  popover: '#FFFFFF'
  popover-foreground: '#1B1F4B'
  muted: '#EAF1FB'
  muted-foreground: '#4B4F78'      # texte secondaire
  primary: '#1D3BFF'               # signature : bouton, lien, focus, élément actif. Jamais un statut ni une série de graphique
  primary-foreground: '#FFFFFF'
  action-foreground: '#1B1F4B'    # texte des boutons d'action (dégradé d'action), identique en clair et en sombre
  secondary: '#EAF1FB'
  secondary-foreground: '#1B1F4B'
  accent: '#FFE9A8'                # élément actif / survol / sélection clavier (jamais seul : indicateur non coloré obligatoire, voir EXPERIENCE.md)
  accent-foreground: '#1B1F4B'
  filet: '#C9D6EA'                 # filet décoratif de 1 px (séparation de lignes, de sections) ; pas d'exigence 3:1
  border: '#1B1F4B'                # = filet (nom shadcn)
  input: '#1B1F4B'                 # bordure de champ, de case et de séparation de grande section : 3:1 exigé
  ring: '#1D3BFF'                  # anneau de focus et « néon » de l'élément sélectionné : orange des boutons d'action, ≥ 3:1 sur papier et surface
  marker: '#954F00'                # marqueur 90 % de la jauge, sans texte (même teinte que warning)
  success: '#097145'
  warning: '#954F00'               # statut « attention »
  destructive: '#B3261E'
  destructive-foreground: '#FFFFFF'
  chart-1: '#730D0D'
  chart-2: '#0F8E6E'
  chart-3: '#937210'
  chart-4: '#302060'
  chart-5: '#B814B8'
  # Sombre
  display: '#E4600B'               # titres pixel (texte de grande taille seulement : 3,36:1 sur le fond)
  tone-teal: '#46D9C8'             # accents décoratifs (barres de titre, étoiles, ombres de titre) : jamais du texte
  tone-violet: '#A996F0'
  tone-orange: '#FF9A4D'           # aussi la pastille « sélectionné » et le bouton d'action
  tone-pink: '#FF8FB3'
  tone-yellow: '#FFD95A'
  background-dark: '#0E1014'
  foreground-dark: '#F2F1EC'
  card-dark: '#161A21'
  card-foreground-dark: '#F2F1EC'
  popover-dark: '#161A21'
  popover-foreground-dark: '#F2F1EC'
  muted-dark: '#161A21'
  muted-foreground-dark: '#A6ACBA'
  primary-dark: '#8195FF'
  primary-foreground-dark: '#0E1014'
  action-foreground-dark: '#0F1115'
  secondary-dark: '#161A21'
  secondary-foreground-dark: '#F2F1EC'
  accent-dark: '#2A2F3A'
  accent-foreground-dark: '#F2F1EC'
  filet-dark: '#2A2F3A'
  border-dark: '#2A2F3A'
  input-dark: '#6A7287'
  ring-dark: '#FFA94D'
  marker-dark: '#F5B547'
  success-dark: '#5FD3A0'
  warning-dark: '#F5B547'
  destructive-dark: '#FF8A80'
  destructive-foreground-dark: '#0E1014'
  chart-1-dark: '#75D1F0'
  chart-2-dark: '#CCE6B3'
  chart-3-dark: '#B275F0'
  chart-4-dark: '#EBC247'
  chart-5-dark: '#EB4770'
  display-dark: '#FF9A4D'
  tone-teal-dark: '#46D9C8'
  tone-violet-dark: '#A996F0'
  tone-orange-dark: '#FF9A4D'
  tone-pink-dark: '#FF8FB3'
  tone-yellow-dark: '#FFD95A'
gradients:
  # --gradient-* ; angle 160deg, statiques (jamais animés). Gradient-2 : noir, bleu nuit, violet, rose, corail (références d'Alex) ; jamais un statut ni une série : ni statut ni série de graphique. Valeurs sombres entre parenthèses dans les commentaires.
  gradient-1: 'linear-gradient(160deg, #F7FAFF, #EAF1FB)'   # texte encre 14,13 (sombre : #0E1014 › #161A21, texte 15,42)
  gradient-2: 'radial-gradient(90% 75% at 100% 100%, #F0643A, #C2306A 38%, transparent), radial-gradient(85% 75% at 0% 80%, #7A3A9A, #1B1F4A 50%, transparent), linear-gradient(#05070C, #05070C)'   # « couchant », valeur SOMBRE (clair : docs/refonte/palettes.py, GRADIENT_SUNSET) ; texte dans les 45 % du haut, pire pixel 12,01 (clair 11,01)
  gradient-action: 'linear-gradient(180deg, #FFB45C 0%, #FF9A4D 100%)'   # boutons d'action, coucher de soleil jaune-orangé ; texte encre #0F1115 ; identique en clair et en sombre
typography:
  # Hanken Grotesk (titres et corps) et IBM Plex Mono (chiffres) remplacent Geist. Chiffres tabulaires sur montants et dates.
  display:
    fontFamily: 'Hanken Grotesk'
    fontSize: 32px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: -0.01em
  heading:
    fontFamily: 'Hanken Grotesk'
    fontSize: 20px
    fontWeight: '600'
    lineHeight: '1.3'
  body:
    fontFamily: 'Hanken Grotesk'
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.5'
  label:
    fontFamily: 'Hanken Grotesk'
    fontSize: 13px
    fontWeight: '500'
    lineHeight: '1.4'
  numeric:
    fontFamily: 'IBM Plex Mono'
    fontSize: 14px
    fontWeight: '500'
    lineHeight: '1.5'
    fontFeatureSettings: '"tnum"'   # font-variant-numeric: tabular-nums
  pixel:
    fontFamily: 'Pixelify Sans'   # titres de bandeau et étiquettes de grande taille seulement (jamais le texte courant) ; capitales, deux tons : display + ombre tone-teal
    fontWeight: '700'
    letterSpacing: 0.02em
  wordmark:
    fontFamily: 'Bricolage Grotesque'   # logotype « LogMerry » uniquement (choix d'Alex, option C)
    fontWeight: '700'
    letterSpacing: -0.02em
rounded:
  sm: 4px
  md: 6px
  lg: 8px          # sombre : --radius 0.5rem ; clair : --radius 0.1875rem (coins presque droits, pixel)
  full: 9999px
spacing:
  '1': 4px
  '2': 8px
  '3': 12px
  '4': 16px
  '6': 24px
  '8': 32px
  '12': 48pxcomponents:
  button-primary:
    background: '{colors.primary}'
    foreground: '{colors.primary-foreground}'
    radius: '{rounded.md}'
  task-row:
    background: '{colors.card}'
    foreground: '{colors.card-foreground}'
    border: '{colors.border}'
    radius: '{rounded.md}'
    padding: '{spacing.3}'
  task-motif:
    foreground: '{colors.muted-foreground}'
    typography: '{typography.label}'
  plafond-bar:
    fill: '{colors.primary}'
    track-border: '{colors.input}'
    track-background: '{colors.background}'
    marker: '{colors.marker}'
    radius: '{rounded.full}'
    height: '{spacing.3}'
  assistant-panel:
    background: '{colors.popover}'
    foreground: '{colors.popover-foreground}'
    border: '{colors.border}'
    radius: '{rounded.lg}'
  citation-chip:
    background: '{colors.muted}'
    foreground: '{colors.foreground}'
    border: '{colors.border}'
    radius: '{rounded.full}'
  status-badge:
    radius: '{rounded.full}'
    typography: '{typography.label}'
  estimation-label:
    foreground: '{colors.muted-foreground}'
    border: '{colors.border}'
    radius: '{rounded.sm}'
  data-table:
    background: '{colors.card}'
    foreground: '{colors.card-foreground}'
    border: '{colors.border}'
  backlog-summary:
    foreground: '{colors.muted-foreground}'
    link: '{colors.foreground}'
    typography: '{typography.label}'
  contact-form:
    foreground: '{colors.foreground}'
    border: '{colors.input}'
    radius: '{rounded.sm}'
---

## Brand & Style

LogMerry projette quatre qualités, dans cet ordre de lecture en dix secondes : **rigoureux, efficace, soigné, réfléchi**. Le style retenu est **éditorial suisse** : papier chaud, encre quasi noire, **une seule couleur vive** (le cobalt), hiérarchie par la typographie et par des **filets** de 1 px plutôt que par des ombres ou des aplats décoratifs. Pas de glassmorphism, des **dégradés cobalt** comme accent ponctuel (conservés à la demande d'Alex, voir Colors), jamais une surface de travail. Les chiffres (montants, dates, durées) sont en police mono, gros dans le cockpit.

Maquettes de référence : les aperçus de la refonte ([cobalt](../../../../docs/refonte/apercu-2-cobalt.html), avec bascule clair/sombre) et le dossier [docs/refonte/propositions.md](../../../../docs/refonte/propositions.md). Les maquettes `mockups/` datent de la palette olive et sont **périmées** pour les couleurs et les dégradés ; elles restent valables pour la structure des écrans. DESIGN.md et EXPERIENCE.md l'emportent en cas de conflit.

Le produit hérite de shadcn/ui (style `new-york`, base `neutral`, icônes `lucide`, `next-themes`). Ce document ne décrit que la couche de marque. Les composants shadcn non listés (Dialog, Sheet, Command, Popover, Toast, Tabs, Skeleton, Separator, Table) gardent leurs spécifications par défaut, recolorés par les jetons ci-dessous.

## Direction « Arcade clair » (thème clair, 2026-10-15)

Le thème clair adopte un style web rétro en pixel art (référence d'Alex), en clair. Combinaison retenue : le bandeau d'accueil et la connexion de « Arcade clair », les listes et formulaires de « Pixel sobre ».

- **Fond et encre** : fond ciel très pâle `background`, cartes blanches, texte et traits en marine `foreground` / `border`.
- **Traits** : bordures de 2 px marine (`--border-w`), ombre dure de 3 px sans flou (`shadow-hard`) sur boutons, cartes, tableaux, bandeaux ; coins presque droits (`--radius` 3 px). En sombre : 1 px, pas d'ombre, rayon 8 px (inchangé).
- **Accents** : `tone-teal`, `tone-violet`, `tone-orange`, `tone-pink`, `tone-yellow`, décoratifs, jamais du texte. Une carte de note porte une barre de 6 px par type : note violet, procédure turquoise, modèle orange, FAQ rose (le type reste écrit dans la pastille).
- **Titres** : Pixelify Sans en capitales, deux tons (`display` et ombre `tone-teal`), texte de grande taille seulement. Le texte courant reste Hanken Grotesk ; le logotype de la barre latérale reste Bricolage Grotesque.
- **Bandeau** (`gradient-2` en clair) : ciel pâle à grille fine de 16 px (`--banner-size`) ; `hero` (cockpit) ajoute une étoile violette et un petit écran qui affiche le portrait. Décor absent en sombre.
- **Sélection** : une pastille orange cernée de marine à ombre dure (`.neon` en clair) ; le gras et `aria-current` portent aussi l'état. En sombre, le néon d'origine.
- **Focus** : anneau cobalt (`ring`) de 2 px décalé de 2 px.
- **Images** (`public/images/`) : portrait (barre latérale), scène « chemise bleue » (premier écran et connexion, clair), scène « t-shirt » (écran du bandeau du cockpit, image entière), scène de nuit (premier écran, côté futur), logo en pixels `logo-pixel.svg` (36 × 36 tiré du vecteur ; remplace le logo vectoriel en clair seulement). Décoratives (`alt=""`), `image-rendering: pixelated`. Le nom « LogMerry » et le slogan de la connexion sont en Pixelify Sans en clair.
- Les règles de contraste ne changent pas : texte 4,5:1, éléments d'interface 3:1 ; `display` est limité à 3:1 (grand texte).

## Colors

Les jetons sont sémantiques et définis ensemble en clair et en sombre (suffixe `-dark`). Les valeurs sont calculées et testées dans `docs/refonte/palettes.py` et `docs/refonte/contrastes.py`.

- **Papier `{colors.background}`** : fond de page. **Surface `{colors.card}`** : cartes, panneaux, lignes de tableau, utilisée avec parcimonie. **Encre `{colors.foreground}`** : texte. **`{colors.muted-foreground}`** : texte secondaire (≥ 4,5:1 sur papier et sur surface).
- **Cobalt `{colors.primary}`** : la **signature**. Lien, case cochée, élément actif de la barre latérale (le focus a sa propre couleur, voir ci-dessous). En sombre : `{colors.primary-dark}`. **Néon** : dans la barre latérale, c'est **l'icône** qui s'allume (couleur `{colors.ring}` et halo de même couleur, classe `.neon-icon`), au survol, au focus et pour la catégorie active, sans cadre ni fond ; le libellé de la catégorie active est en gras et porte `aria-current`, jamais le halo seul. Pour un filtre actif (bandeaux), le **contour** s'allume : 1 px `{colors.ring}` et halo extérieur et intérieur, classe `.neon`. **Focus** : anneau `{colors.ring}` (orange des boutons d'action) de 2 px décalé de 2 px sur le fond, pour rester visible autour d'un bouton orange ; 3,54 sur papier clair, 10,00 en sombre.
- **Filet `{colors.filet}`** (= `{colors.border}`) : séparation décorative de 1 px (lignes, sections). Pas d'exigence de contraste, **jamais seul pour délimiter un champ**. **Bordure de champ `{colors.input}`** : champs, cases, séparations de grande section, ≥ 3:1 sur papier et sur surface.
- **États (toujours icône + mot)** : succès `{colors.success}`, attention `{colors.warning}`, erreur `{colors.destructive}` ; équivalents `-dark` en sombre. Trois jetons séparés, ≥ 4,5:1 en texte, **aucun n'est bleu** : la signature ne se confond avec aucun statut (écart de teinte ≥ 77°).
- **Marqueur `{colors.marker}`** : uniquement le marqueur 90 % de la jauge de plafond (FR-14 règle 3), sans texte, même teinte que l'attention. La jauge repose sur le fond papier, jamais dans une carte Surface.
- **Graphiques `{colors.chart-1}` à `{colors.chart-5}`** (et `-dark`) : séries de graphiques et de jauges de capacité uniquement, **jamais la signature ni un statut**. Écart minimal de 28 (sombre) et 30 (clair) en simulation de daltonisme (Machado 2009, écart Lab ≥ 15 exigé) ; chaque série reste accompagnée d'une légende ou d'une étiquette.

**Contrastes mesurés** (ratio ; une valeur double = papier / surface).

| Paire | Clair | Sombre |
|---|---|---|
| Texte / fond | 15,65 | 16,84 |
| Texte / surface | 14,13 | 15,42 |
| Texte secondaire / fond | 6,58 | 8,37 |
| Texte secondaire / surface | 5,94 | 7,67 |
| Signature en texte ou lien | 5,57 / 5,03 | 6,96 / 6,38 |
| Bouton (texte / signature) | 6,73 | 6,96 |
| Succès | 5,03 / 4,54 | 10,26 / 9,40 |
| Attention | 5,12 / 4,62 | 10,50 / 9,62 |
| Erreur | 5,41 / 4,89 | 8,34 / 7,64 |
| Bordure de champ | 3,37 / 3,04 | 3,96 / 3,63 |
| Focus et « néon » (anneau orange) | 3,54 / 3,19 | 10,00 / 9,17 |
| Ratio le plus bas, texte | 4,54 (succès sur surface) | 6,38 |
| Ratio le plus bas, non-texte | 3,04 (bordure de champ sur surface) | 3,63 |

### Dégradés (`--gradient-*`)

Deux dégradés linéaires à 160°, statiques, **dégradé « couchant »** (noir, bleu nuit, violet, rose, corail, d'après l'image de référence d'Alex ; en clair : papier, lavande, rose, corail) (aucune couleur de statut ni de graphique). Seules les paires texte/dégradé validées sont autorisées (`gradient-1` : pire extrémité mesurée par `docs/refonte/contrastes.py` ; `gradient-2` : pixels du rendu mesurés par `docs/refonte/degrades.py`).

| Jeton | Clair | Sombre | Texte autorisé | Usage |
|---|---|---|---|---|
| `{gradients.gradient-1}` | papier › surface | #0E1014 › #161A21 | encre (14,13 ; sombre 15,42) | Bandeau discret |
| `{gradients.gradient-2}` | papier › lavande › rose › corail #FF8A5C (en bas à droite) | noir #05070C › bleu nuit › violet › magenta › corail #F0643A | encre / texte clair, **uniquement dans les 45 % du haut** (pire pixel mesuré 11,01 clair, 12,01 sombre) | Portfolio public, bandeau du Cockpit, panneau de connexion (avec texte) |

Quatre usages, et pas d'autre : **boutons d'action** (`{gradients.gradient-action}`) ; et les trois scènes suivantes : **A** portfolio public (`{gradients.gradient-2}`) ; **B** page de connexion (panneau `{gradients.gradient-2}` portant le nom du produit et une phrase en encre, jamais un panneau sans texte) ; **C** bandeau d'en-tête de chaque écran principal (`{gradients.gradient-2}`, voir `gradient-banner`). Jamais derrière tâches, tableaux, jauge ou chat. Règles du « couchant » : le **texte se place toujours dans les 45 % du haut** du panneau (la zone calme) ; le bas, coloré, reste sans texte ni icône. Risque connu : le corail et le magenta ressemblent à la teinte « erreur » et à `chart-5` ; ils restent un grand fond doux, sans icône ni mot d'état posés dessus, et les statuts gardent leur icône et leur mot. Pas d'animation ; s'ils étaient un jour animés, l'animation ne tournerait que sous `prefers-reduced-motion: no-preference`, la version statique restant la valeur par défaut.

Le filet (1,36 en clair, 1,42 en sombre) est volontairement sous 3:1 : il décore, il ne délimite aucun contrôle.

## Typography

**Hanken Grotesk** pour l'interface, les titres (graisse 700 en `{typography.display}`) et le corps ; **IBM Plex Mono** pour les chiffres (`{typography.numeric}`), tous deux sous licence SIL OFL, auto-hébergés par `next/font` (aucune requête vers Google à l'exécution). Ils remplacent Geist du gabarit. **Bricolage Grotesque 700** sert uniquement au logotype « LogMerry » (`{typography.wordmark}`, classe `font-brand`) : barre latérale, page de connexion, page d'accueil ; jamais dans le corps ni les titres de page. Le logo (bateau dans une boussole) l'accompagne (`LogoMark`). Les chiffres tabulaires de Hanken Grotesk n'ont pas été vérifiés : c'est pourquoi les montants sont en mono. Rôles : `{typography.display}` (titres de page, portfolio), `{typography.heading}`, `{typography.body}`, `{typography.label}` (motifs, badges, en-têtes de colonnes). `{typography.numeric}` (IBM Plex Mono) : **chiffres tabulaires** (`font-variant-numeric: tabular-nums`) sur tous les montants, dates et durées, alignés à droite dans les tableaux. Tailles de police exprimées en `rem` (zoom et préférences du navigateur respectés). Langue : `<html lang="fr">` (voir EXPERIENCE.md, Accessibility Floor).

**Liens dans le texte** : soulignés en permanence, couleur `{colors.primary}` (clair) / `{colors.primary-dark}` (sombre) ; soulignement conservé au survol et au focus. **Placeholder** : `{colors.muted-foreground}` (≥ 4,5:1), jamais seul comme libellé. **Désactivé** : opacité 50 % + `aria-disabled`, jamais le seul moyen d'indiquer un état.

## Layout & Spacing

Échelle 4/8 (`{spacing.1}` à `{spacing.12}`), héritée de Tailwind. Ordinateur d'abord : barre latérale fixe à gauche (repliable en icônes), contenu en grille ; le Cockpit privilégie la densité lisible (lignes de `{spacing.3}` de padding). Pas de largeur maximale unique : les tableaux CRM utilisent la largeur disponible, le portfolio public se lit en colonne centrée. Points de rupture : voir EXPERIENCE.md, Responsive & Platform.

## Elevation & Depth

Profondeur tonale et **filets**, pas d'ombres décoratives (les dégradés des scènes A, B, C sont des accents, pas de la profondeur) : papier, puis surface `{colors.card}` rare, séparés par un filet `{colors.filet}`. Ombre shadcn par défaut réservée aux popovers et dialogues. Aucune ombre sur les lignes de tâches.

## Shapes

Rayons : `{rounded.sm}` pour champs et étiquettes d'estimation, `{rounded.md}` pour boutons, lignes de tâche et cartes, `{rounded.lg}` pour panneaux et dialogues (valeur `--radius` existante), `{rounded.full}` pour badges, puces de citation et barre de la jauge.

## Components

Seuls les composants propres à LogMerry sont spécifiés ; leur comportement est dans EXPERIENCE.md, Component Patterns.

| Composant | Spécification visuelle |
|---|---|
| `button-primary` | **Bouton d'action** : fond `{gradients.gradient-action}` (jaune › orange › orange vif, 135°), texte `{colors.action-foreground}` (6,77 au pire pixel), rayon `{rounded.md}`, hauteur minimale 36 px ; survol : légèrement éclairci ; désactivé : opacité 50 %. Le cobalt ne sert plus de fond de bouton. |
| `task-row` | Fond `{colors.card}`, bordure `{colors.filet}`, rayon `{rounded.md}`. Case à cocher à gauche (bordure `{colors.input}`), titre en `{typography.body}` gras, **motif** (`task-motif`) sous le titre : icône lucide + texte `{typography.label}` en `{colors.muted-foreground}`. Tâche cochée : titre barré et icône de coche, pas seulement une teinte. |
| `plafond-bar` | Barre type bullet chart : remplissage `{colors.primary}`, marqueur vertical 90 % `{colors.marker}` de 3 px, entouré d'un liseré de 2 px `{colors.background}` et dépassant de 4 px de chaque côté de la piste (marqueur contre fond : 5,12 en clair, 10,50 en sombre). La barre ne contient aucun texte. Fond de piste `{colors.background}` ; piste à bordure `{colors.input}`. Le chiffre et le seuil s'affichent à côté, en `{typography.numeric}`. Marqueur `aria-hidden`. Jamais dans une carte Surface. En `forced-colors: active`, piste, remplissage et marqueur passent par `border`/`outline` (`Highlight`/`CanvasText`), pas seulement `background`. |
| `estimation-label` | Étiquette « estimation » : bordure `{colors.border}`, rayon `{rounded.sm}`, icône + texte `{typography.label}`. Accompagne tout montant calculé. |
| `status-badge` | Pastille `{rounded.full}` : icône + mot, couleur d'état en complément (succès, attention, erreur) ; le statut « prospect » utilise la signature avec une icône distincte, jamais une couleur de statut. |
| `assistant-panel` | Panneau ancré à droite, fond `{colors.popover}`, bordure `{colors.border}`, rayon `{rounded.lg}`. Réponse en `{typography.body}`, puces lisibles en diagonale, sources dessous. |
| `citation-chip` | Puce `{rounded.full}`, fond `{colors.muted}`, bordure `{colors.border}`, titre de la Note source ; focus visible `{colors.ring}`. |
| `gradient-banner` | **Bandeau d'en-tête de chaque écran principal** (Aujourd'hui, Notes, Paramètres, Nouvelle note, Modifier la note) : `{gradients.gradient-2}`, rayon `{rounded.lg}`, filet `{colors.filet}`, titre de page en `{colors.foreground}` posé **en haut** (zone calme, 45 % du haut) ; hauteur d'environ 170 px pour que le dégradé se voie ; titre sur une ligne, en haut ; une **explication courte facultative** (état vide, cockpit sans tâche) se place au bas du bandeau, dans un cartouche presque opaque (`{colors.background}` à 90 %, texte `{colors.foreground}`) ; les **filtres** (pastilles) sont posés directement sur le bandeau, chacune avec son propre fond `{colors.background}` à 90 % : le texte ne repose jamais directement sur la zone colorée du dégradé. Au-dessus du contenu, jamais derrière. |
| `client-card` | Carte de la **fiche** (page d'un client ou prospect) : grande (`{rounded.lg}`, bordure de 2 px `{colors.filet}`, fond `{gradients.gradient-1}`), tuile d'icône (bâtiment) de 56 px, nom en `{typography.heading}` gras, puis statut, origine et dates. Bouton « Modifier » (lien vers la page de modification). |
| `contact-card` | Carte d'un **contact**, plus petite que la fiche : `{rounded.md}`, fond `{colors.card}`, **avatar rond** d'initiales (`{colors.primary}` à 15 %), nom, fonction, e-mail, téléphone, adresse, boutons « Modifier » et « Supprimer » ; en grille de deux colonnes sous le titre « Contacts ». La différence de taille, de forme (tuile carrée contre avatar rond) et de fond permet de distinguer la fiche et ses contacts d'un coup d'œil. |
| `data-table` | Shadcn Table sur `{colors.card}`, lignes séparées par `{colors.border}`, en-têtes `{typography.label}`, chiffres tabulaires alignés à droite. |
| `backlog-summary` | Ligne plate sous la liste des tâches du Cockpit : icône lucide + texte `{typography.label}` en `{colors.muted-foreground}` (7,34 sur papier en clair, 8,37 en sombre) ; le libellé est un lien `{colors.foreground}` souligné. Sans fond, sans bordure, sans case : ce n'est pas une tâche. |
| `contact-form` | **Après MVP** (au MVP : simple lien « m'écrire » `{colors.primary}`, souligné, focus `{colors.ring}`). Formulaire du portfolio public : shadcn Input, Textarea et Button, libellés visibles au-dessus des champs, bordures `{colors.input}`, rayon `{rounded.sm}`, erreurs en `{colors.destructive}` avec icône + texte. Comportement : EXPERIENCE.md, Component Patterns. |

## Do's and Don'ts

| Do | Don't |
|---|---|
| Doubler chaque information d'état d'une icône et d'un mot | Utiliser la couleur seule (jauge, statut, succès, erreur, case cochée) |
| Réserver le cobalt à la signature (lien, focus, élément actif, case cochée) | Utiliser le cobalt pour un statut ou une série de graphique |
| Réserver le marqueur 90 % à la jauge, sans texte, sur fond papier | Placer la jauge dans une carte Surface |
| Séparer par des filets de 1 px | Ajouter des ombres décoratives ou des aplats colorés |
| Limiter les dégradés aux boutons d'action et aux scènes A, B, C avec les paires validées | Placer un dégradé derrière tâches, tableaux, jauge ou chat, ou y mettre une couleur de statut |
| Délimiter un champ avec `{colors.input}` (≥ 3:1) | Délimiter un champ avec le seul filet |
| Utiliser les jetons `chart-*` pour les séries, avec légende | Réutiliser la signature ou un statut dans un graphique |
| Mettre en mono tabulaire tout montant, date et durée | Laisser des chiffres proportionnels dans un tableau ou la jauge |
| Définir chaque jeton en clair et en sombre ensemble | Livrer un thème sans son pendant |
| Étiqueter « estimation » tout montant calculé | Présenter un montant calculé comme officiel |
| Hériter des composants shadcn par défaut | Redessiner Dialog, Sheet, Command sans raison de marque |
| Respecter `prefers-reduced-motion` et `forced-colors`, ne jamais animer un dégradé | Ignorer `prefers-reduced-motion` ou `forced-colors`, animer un dégradé |
