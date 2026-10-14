---
status: final
created: 2026-10-11
updated: 2026-10-14
name: LogMerry
description: Cockpit personnel de conseil No-Code/IA avec assistant RAG. shadcn/ui (new-york, base neutral, lucide) sur Next.js + Tailwind 3 + next-themes ; ce DESIGN.md ne spécifie que la couche de marque (palette Cobalt, polices Hanken Grotesk et IBM Plex Mono, filets, composants propres). Il l'emporte sur toute maquette. Refonte du 2026-10-14 (direction 2 « Cobalt », polices B) : voir docs/refonte/propositions.md.
colors:
  # Clair. Jetons sémantiques ; les noms shadcn sont réutilisés, la valeur est surchargée. Source des valeurs : docs/refonte/palettes.py (clé 2-cobalt).
  background: '#F7F6F2'            # papier
  foreground: '#0F1115'            # encre
  card: '#EFEDE6'                  # surface (second papier, rare)
  card-foreground: '#0F1115'
  popover: '#EFEDE6'
  popover-foreground: '#0F1115'
  muted: '#EFEDE6'
  muted-foreground: '#4B5160'      # texte secondaire
  primary: '#1D3BFF'               # signature : bouton, lien, focus, élément actif. Jamais un statut ni une série de graphique
  primary-foreground: '#FFFFFF'
  secondary: '#EFEDE6'
  secondary-foreground: '#0F1115'
  accent: '#D9D6CC'                # élément actif / survol / sélection clavier (jamais seul : indicateur non coloré obligatoire, voir EXPERIENCE.md)
  accent-foreground: '#0F1115'
  filet: '#D9D6CC'                 # filet décoratif de 1 px (séparation de lignes, de sections) ; pas d'exigence 3:1
  border: '#D9D6CC'                # = filet (nom shadcn)
  input: '#80858F'                 # bordure de champ, de case et de séparation de grande section : 3:1 exigé
  ring: '#1D3BFF'
  marker: '#9A5200'                # marqueur 90 % de la jauge, sans texte (même teinte que warning)
  success: '#0A7A4B'
  warning: '#9A5200'               # statut « attention »
  destructive: '#B3261E'
  destructive-foreground: '#FFFFFF'
  chart-1: '#730D0D'
  chart-2: '#109372'
  chart-3: '#937210'
  chart-4: '#302060'
  chart-5: '#B814B8'
  # Sombre
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
  secondary-dark: '#161A21'
  secondary-foreground-dark: '#F2F1EC'
  accent-dark: '#2A2F3A'
  accent-foreground-dark: '#F2F1EC'
  filet-dark: '#2A2F3A'
  border-dark: '#2A2F3A'
  input-dark: '#6A7287'
  ring-dark: '#8195FF'
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
gradients:
  # --gradient-* ; angle 160deg, statiques (jamais animés). Gradient-2 : noir, bleu nuit, violet, rose, corail (références d'Alex) ; jamais un statut ni une série : ni statut ni série de graphique. Valeurs sombres entre parenthèses dans les commentaires.
  gradient-1: 'linear-gradient(160deg, #F7F6F2, #EFEDE6)'   # texte encre 16,13 (sombre : #0E1014 › #161A21, texte 15,42)
  gradient-2: 'radial-gradient(90% 75% at 100% 100%, #F0643A, #C2306A 38%, transparent), radial-gradient(85% 75% at 0% 80%, #7A3A9A, #1B1F4A 50%, transparent), linear-gradient(#05070C, #05070C)'   # « couchant », valeur SOMBRE (clair : docs/refonte/palettes.py, GRADIENT_SUNSET) ; texte dans les 45 % du haut, pire pixel 12,01 (clair 11,78)
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
rounded:rounded:
  sm: 4px
  md: 6px
  lg: 8px          # = --radius 0.5rem de globals.css
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

## Colors

Les jetons sont sémantiques et définis ensemble en clair et en sombre (suffixe `-dark`). Les valeurs sont calculées et testées dans `docs/refonte/palettes.py` et `docs/refonte/contrastes.py`.

- **Papier `{colors.background}`** : fond de page. **Surface `{colors.card}`** : cartes, panneaux, lignes de tableau, utilisée avec parcimonie. **Encre `{colors.foreground}`** : texte. **`{colors.muted-foreground}`** : texte secondaire (≥ 4,5:1 sur papier et sur surface).
- **Cobalt `{colors.primary}`** : la **signature**. Bouton primaire (texte `{colors.primary-foreground}`), lien, anneau de focus (`{colors.ring}`), élément actif de la barre latérale. En sombre : `{colors.primary-dark}`, texte de bouton `{colors.primary-foreground-dark}`. Anneau de focus de 2 px décalé de 2 px sur le fond.
- **Filet `{colors.filet}`** (= `{colors.border}`) : séparation décorative de 1 px (lignes, sections). Pas d'exigence de contraste, **jamais seul pour délimiter un champ**. **Bordure de champ `{colors.input}`** : champs, cases, séparations de grande section, ≥ 3:1 sur papier et sur surface.
- **États (toujours icône + mot)** : succès `{colors.success}`, attention `{colors.warning}`, erreur `{colors.destructive}` ; équivalents `-dark` en sombre. Trois jetons séparés, ≥ 4,5:1 en texte, **aucun n'est bleu** : la signature ne se confond avec aucun statut (écart de teinte ≥ 77°).
- **Marqueur `{colors.marker}`** : uniquement le marqueur 90 % de la jauge de plafond (FR-14 règle 3), sans texte, même teinte que l'attention. La jauge repose sur le fond papier, jamais dans une carte Surface.
- **Graphiques `{colors.chart-1}` à `{colors.chart-5}`** (et `-dark`) : séries de graphiques et de jauges de capacité uniquement, **jamais la signature ni un statut**. Écart minimal de 28 (sombre) et 30 (clair) en simulation de daltonisme (Machado 2009, écart Lab ≥ 15 exigé) ; chaque série reste accompagnée d'une légende ou d'une étiquette.

**Contrastes mesurés** (ratio ; une valeur double = papier / surface).

| Paire | Clair | Sombre |
|---|---|---|
| Texte / fond | 17,47 | 16,84 |
| Texte / surface | 16,13 | 15,42 |
| Texte secondaire / fond | 7,34 | 8,37 |
| Texte secondaire / surface | 6,78 | 7,67 |
| Signature en texte ou lien | 6,22 / 5,74 | 6,96 / 6,38 |
| Bouton (texte / signature) | 6,73 | 6,96 |
| Succès | 4,98 / 4,60 | 10,26 / 9,40 |
| Attention | 5,42 / 5,01 | 10,50 / 9,62 |
| Erreur | 6,04 / 5,58 | 8,34 / 7,64 |
| Bordure de champ | 3,43 / 3,16 | 3,96 / 3,63 |
| Focus (signature) | 6,22 / 5,74 | 6,96 / 6,38 |
| Ratio le plus bas, texte | 4,60 (succès sur surface) | 6,38 |
| Ratio le plus bas, non-texte | 3,16 (bordure de champ sur surface) | 3,63 |

### Dégradés (`--gradient-*`)

Deux dégradés linéaires à 160°, statiques, **dégradé « couchant »** (noir, bleu nuit, violet, rose, corail, d'après l'image de référence d'Alex ; en clair : papier, lavande, rose, corail) (aucune couleur de statut ni de graphique). Seules les paires texte/dégradé validées sont autorisées (`gradient-1` : pire extrémité mesurée par `docs/refonte/contrastes.py` ; `gradient-2` : pixels du rendu mesurés par `docs/refonte/degrades.py`).

| Jeton | Clair | Sombre | Texte autorisé | Usage |
|---|---|---|---|---|
| `{gradients.gradient-1}` | papier › surface | #0E1014 › #161A21 | encre (16,13 ; sombre 15,42) | Bandeau discret |
| `{gradients.gradient-2}` | papier › lavande › rose › corail #FF8A5C (en bas à droite) | noir #05070C › bleu nuit › violet › magenta › corail #F0643A | encre / texte clair, **uniquement dans les 45 % du haut** (pire pixel mesuré 11,78 clair, 12,01 sombre) | Portfolio public, bandeau du Cockpit, panneau de connexion (avec texte) |

Trois scènes, et pas d'autre : **A** portfolio public (`{gradients.gradient-2}`) ; **B** page de connexion (panneau `{gradients.gradient-2}` portant le nom du produit et une phrase en encre, jamais un panneau sans texte) ; **C** bandeau d'en-tête du Cockpit (`{gradients.gradient-2}`). Jamais derrière tâches, tableaux, jauge ou chat. Règles du « couchant » : le **texte se place toujours dans les 45 % du haut** du panneau (la zone calme) ; le bas, coloré, reste sans texte ni icône. Risque connu : le corail et le magenta ressemblent à la teinte « erreur » et à `chart-5` ; ils restent un grand fond doux, sans icône ni mot d'état posés dessus, et les statuts gardent leur icône et leur mot. Pas d'animation ; s'ils étaient un jour animés, l'animation ne tournerait que sous `prefers-reduced-motion: no-preference`, la version statique restant la valeur par défaut.

Le filet (1,34 en clair, 1,42 en sombre) est volontairement sous 3:1 : il décore, il ne délimite aucun contrôle.

## Typography

**Hanken Grotesk** pour l'interface, les titres (graisse 700 en `{typography.display}`) et le corps ; **IBM Plex Mono** pour les chiffres (`{typography.numeric}`), tous deux sous licence SIL OFL, auto-hébergés par `next/font` (aucune requête vers Google à l'exécution). Ils remplacent Geist du gabarit. Les chiffres tabulaires de Hanken Grotesk n'ont pas été vérifiés : c'est pourquoi les montants sont en mono. Rôles : `{typography.display}` (titres de page, portfolio), `{typography.heading}`, `{typography.body}`, `{typography.label}` (motifs, badges, en-têtes de colonnes). `{typography.numeric}` (IBM Plex Mono) : **chiffres tabulaires** (`font-variant-numeric: tabular-nums`) sur tous les montants, dates et durées, alignés à droite dans les tableaux. Tailles de police exprimées en `rem` (zoom et préférences du navigateur respectés). Langue : `<html lang="fr">` (voir EXPERIENCE.md, Accessibility Floor).

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
| `button-primary` | Fond `{colors.primary}`, texte `{colors.primary-foreground}`, rayon `{rounded.md}`, hauteur minimale 36 px. |
| `task-row` | Fond `{colors.card}`, bordure `{colors.filet}`, rayon `{rounded.md}`. Case à cocher à gauche (bordure `{colors.input}`), titre en `{typography.body}` gras, **motif** (`task-motif`) sous le titre : icône lucide + texte `{typography.label}` en `{colors.muted-foreground}`. Tâche cochée : titre barré et icône de coche, pas seulement une teinte. |
| `plafond-bar` | Barre type bullet chart : remplissage `{colors.primary}`, marqueur vertical 90 % `{colors.marker}` de 3 px, entouré d'un liseré de 2 px `{colors.background}` et dépassant de 4 px de chaque côté de la piste (marqueur contre fond : 5,42 en clair, 10,50 en sombre). La barre ne contient aucun texte. Fond de piste `{colors.background}` ; piste à bordure `{colors.input}`. Le chiffre et le seuil s'affichent à côté, en `{typography.numeric}`. Marqueur `aria-hidden`. Jamais dans une carte Surface. En `forced-colors: active`, piste, remplissage et marqueur passent par `border`/`outline` (`Highlight`/`CanvasText`), pas seulement `background`. |
| `estimation-label` | Étiquette « estimation » : bordure `{colors.border}`, rayon `{rounded.sm}`, icône + texte `{typography.label}`. Accompagne tout montant calculé. |
| `status-badge` | Pastille `{rounded.full}` : icône + mot, couleur d'état en complément (succès, attention, erreur) ; le statut « prospect » utilise la signature avec une icône distincte, jamais une couleur de statut. |
| `assistant-panel` | Panneau ancré à droite, fond `{colors.popover}`, bordure `{colors.border}`, rayon `{rounded.lg}`. Réponse en `{typography.body}`, puces lisibles en diagonale, sources dessous. |
| `citation-chip` | Puce `{rounded.full}`, fond `{colors.muted}`, bordure `{colors.border}`, titre de la Note source ; focus visible `{colors.ring}`. |
| `gradient-banner` | Bandeau d'en-tête du Cockpit : `{gradients.gradient-2}`, texte `{colors.foreground}` ; hors de la zone des tâches. |
| `data-table` | Shadcn Table sur `{colors.card}`, lignes séparées par `{colors.border}`, en-têtes `{typography.label}`, chiffres tabulaires alignés à droite. |
| `backlog-summary` | Ligne plate sous la liste des tâches du Cockpit : icône lucide + texte `{typography.label}` en `{colors.muted-foreground}` (7,34 sur papier en clair, 8,37 en sombre) ; le libellé est un lien `{colors.foreground}` souligné. Sans fond, sans bordure, sans case : ce n'est pas une tâche. |
| `contact-form` | **Après MVP** (au MVP : simple lien « m'écrire » `{colors.primary}`, souligné, focus `{colors.ring}`). Formulaire du portfolio public : shadcn Input, Textarea et Button, libellés visibles au-dessus des champs, bordures `{colors.input}`, rayon `{rounded.sm}`, erreurs en `{colors.destructive}` avec icône + texte. Comportement : EXPERIENCE.md, Component Patterns. |

## Do's and Don'ts

| Do | Don't |
|---|---|
| Doubler chaque information d'état d'une icône et d'un mot | Utiliser la couleur seule (jauge, statut, succès, erreur, case cochée) |
| Réserver le cobalt à la signature (bouton, lien, focus, actif) | Utiliser le cobalt pour un statut ou une série de graphique |
| Réserver le marqueur 90 % à la jauge, sans texte, sur fond papier | Placer la jauge dans une carte Surface |
| Séparer par des filets de 1 px | Ajouter des ombres décoratives ou des aplats colorés |
| Limiter les dégradés aux scènes A, B, C avec les paires validées | Placer un dégradé derrière tâches, tableaux, jauge ou chat, ou y mettre une couleur de statut |
| Délimiter un champ avec `{colors.input}` (≥ 3:1) | Délimiter un champ avec le seul filet |
| Utiliser les jetons `chart-*` pour les séries, avec légende | Réutiliser la signature ou un statut dans un graphique |
| Mettre en mono tabulaire tout montant, date et durée | Laisser des chiffres proportionnels dans un tableau ou la jauge |
| Définir chaque jeton en clair et en sombre ensemble | Livrer un thème sans son pendant |
| Étiqueter « estimation » tout montant calculé | Présenter un montant calculé comme officiel |
| Hériter des composants shadcn par défaut | Redessiner Dialog, Sheet, Command sans raison de marque |
| Respecter `prefers-reduced-motion` et `forced-colors`, ne jamais animer un dégradé | Ignorer `prefers-reduced-motion` ou `forced-colors`, animer un dégradé |
