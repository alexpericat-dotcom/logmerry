---
status: final
created: 2026-10-11
updated: 2026-10-12
name: LogMerry
description: Cockpit personnel de conseil No-Code/IA avec assistant RAG. shadcn/ui (new-york, base neutral, lucide) sur Next.js + Tailwind 3 + next-themes ; ce DESIGN.md ne spécifie que la couche de marque (palette, police, dégradés, composants propres). Il l'emporte sur toute maquette.
colors:
  # Clair. Jetons sémantiques ; les noms shadcn sont réutilisés, la valeur est surchargée.
  background: '#F6F4F1'            # White Chalk
  foreground: '#223300'            # Blind Forest
  card: '#ECE2CE'                  # Radiant Dawn (surface)
  card-foreground: '#223300'
  popover: '#ECE2CE'
  popover-foreground: '#223300'
  muted: '#ECE2CE'
  muted-foreground: '#4B5D16'      # Kyuri Green (texte secondaire)
  primary: '#4B5D16'
  primary-foreground: '#F6F4F1'
  secondary: '#ECE2CE'
  secondary-foreground: '#223300'
  accent: '#D9CBA8'                # élément actif / survol / sélection clavier (jamais seul : indicateur non coloré obligatoire, voir EXPERIENCE.md)
  accent-foreground: '#223300'
  border: '#4B5D16'
  input: '#4B5D16'
  ring: '#4B5D16'
  marker: '#E45C10'                # Tobiko Orange : marqueur 90 %, sans texte ; la jauge repose sur le fond Chalk, jamais dans une carte Dawn
  success: '#1B6B3A'
  warning: '#7A4600'
  warning-icon: '#7A4600'          # icône seule, jamais le texte ; même teinte que warning (6,04 sur Dawn, 7,08 sur Chalk)
  destructive: '#9B1C1C'
  destructive-foreground: '#F6F4F1'
  # Sombre
  background-dark: '#223300'
  foreground-dark: '#F6F4F1'
  card-dark: '#2E4310'             # dérivé
  card-foreground-dark: '#F6F4F1'
  popover-dark: '#2E4310'
  popover-foreground-dark: '#F6F4F1'
  muted-dark: '#2E4310'
  muted-foreground-dark: '#ECE2CE'
  primary-dark: '#F2B635'          # Sneezeweeds
  primary-foreground-dark: '#223300'
  secondary-dark: '#2E4310'
  secondary-foreground-dark: '#F6F4F1'
  accent-dark: '#46661F'           # élément actif / survol / sélection clavier en sombre (+ indicateur non coloré)
  accent-foreground-dark: '#F6F4F1'
  border-dark: '#A9B77A'           # dérivé
  input-dark: '#A9B77A'
  ring-dark: '#F2B635'
  marker-dark: '#F2B635'
  success-dark: '#8FDDA8'
  warning-dark: '#F2B635'
  warning-icon-dark: '#E45C10'
  destructive-dark: '#FFA39A'
  destructive-foreground-dark: '#223300'
  # Palette brute (référence des dégradés)
  chalk: '#F6F4F1'
  dawn: '#ECE2CE'
  kyuri: '#4B5D16'
  forest: '#223300'
  sneezeweeds: '#F2B635'
  tobiko: '#E45C10'
gradients:
  # --gradient-* ; angle 160deg, statiques (jamais animés).
  gradient-1: 'linear-gradient(160deg, #F6F4F1, #ECE2CE)'              # texte Forest 10.60
  gradient-2: 'linear-gradient(160deg, #ECE2CE, #F2B635)'              # texte Forest 7.47
  gradient-3: 'linear-gradient(160deg, #F2B635, #E45C10)'              # décoratif, sans texte
  gradient-4: 'linear-gradient(160deg, #F2B635, #4B5D16, #223300)'     # décoratif, sans texte
  gradient-5: 'linear-gradient(160deg, #4B5D16, #223300)'              # texte Chalk 6.65
typography:
  # Plus Jakarta Sans remplace Geist (titres et corps). Chiffres tabulaires sur montants et dates.
  display:
    fontFamily: 'Plus Jakarta Sans'
    fontSize: 32px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: -0.01em
  heading:
    fontFamily: 'Plus Jakarta Sans'
    fontSize: 20px
    fontWeight: '600'
    lineHeight: '1.3'
  body:
    fontFamily: 'Plus Jakarta Sans'
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.5'
  label:
    fontFamily: 'Plus Jakarta Sans'
    fontSize: 13px
    fontWeight: '500'
    lineHeight: '1.4'
  numeric:
    fontFamily: 'Plus Jakarta Sans'
    fontSize: 14px
    fontWeight: '500'
    lineHeight: '1.5'
    fontFeatureSettings: '"tnum"'   # font-variant-numeric: tabular-nums
rounded:
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
  '12': 48px
components:
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
    track-border: '{colors.border}'
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
  gradient-banner:
    background: '{gradients.gradient-2}'
    foreground: '{colors.forest}'
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

LogMerry projette quatre qualités, dans cet ordre de lecture en dix secondes : **rigoureux, efficace, soigné, réfléchi**. Le style retenu est **Minimalism & Swiss** : sobre, grille nette, fort contraste, hiérarchie par la typographie plutôt que par la décoration. Pas de glassmorphism. Les dégradés sont un **accent ponctuel**, jamais une surface de travail.

Maquettes de référence (DESIGN.md et EXPERIENCE.md l'emportent en cas de conflit) : [cockpit](mockups/key-cockpit.html), [assistant](mockups/key-assistant.html), [portfolio public](mockups/key-portfolio.html), [palette](mockups/palette-reference.html), [dégradés](mockups/gradients-reference.html).

Le produit hérite de shadcn/ui (style `new-york`, base `neutral`, icônes `lucide`, `next-themes`). Ce document ne décrit que la couche de marque. Les composants shadcn non listés (Dialog, Sheet, Command, Popover, Toast, Tabs, Skeleton, Separator, Table) gardent leurs spécifications par défaut, recolorés par les jetons ci-dessous.

## Colors

Six couleurs de palette, appliquées en **aplats** ; les jetons sont sémantiques et définis ensemble en clair et en sombre (suffixe `-dark`).

- **Chalk `{colors.background}` / Forest `{colors.background-dark}`** : fond de page. **Dawn `{colors.card}`** (clair) et sa dérivée `{colors.card-dark}` (sombre) : cartes, panneaux, lignes de tableau.
- **Forest `{colors.foreground}`** : texte en clair. Chalk `{colors.foreground-dark}` : texte en sombre.
- **Kyuri `{colors.primary}`** : primaire, anneau de focus (`{colors.ring}`), bordures de champs et de cases, texte secondaire (`{colors.muted-foreground}`). Texte de bouton : Chalk. L'anneau de focus fait 2 px et est décalé de 2 px sur `{colors.background}` (`ring-offset`), pour rester visible sur un bouton primaire de même couleur (contraste anneau/fond : 6,65 en clair, 7,47 en sombre). En sombre, le primaire, le focus et le marqueur passent à **Sneezeweeds `{colors.primary-dark}`**, texte de bouton Forest ; bordure dérivée `{colors.border-dark}`.
- **Tobiko `{colors.marker}`** : uniquement le **marqueur 90 %** de la jauge de plafond (FR-14 règle 3), sans texte. La jauge de plafond n'est jamais placée dans une carte Dawn ; elle repose sur le fond de page Chalk. En sombre, le marqueur est Sneezeweeds.
- **États (toujours icône + texte)** : succès `{colors.success}` / `{colors.success-dark}`, avertissement `{colors.warning}` / `{colors.warning-dark}`, erreur `{colors.destructive}` / `{colors.destructive-dark}`. L'icône d'avertissement peut utiliser `{colors.warning-icon}` ; le texte jamais.

**Règle orange et jaune.** Tobiko et Sneezeweeds ne sont jamais utilisés comme texte sur fond clair (3,28 et 1,66 mesurés) ni comme fond d'un bouton, quel que soit le texte, en thème clair. Ils servent d'icônes, de marqueurs, de bordures et, en sombre, de primaire (texte Forest, 7,47).

**Contrastes mesurés** (ratio ; une valeur double = fond / surface).

| Paire | Clair | Sombre |
|---|---|---|
| Texte / fond | 12,41 | 12,41 |
| Texte / surface | 10,60 | 9,93 |
| Texte secondaire / fond | 6,65 | 10,60 |
| Texte secondaire / surface | 5,68 | 8,48 |
| Bouton | 6,65 | 7,47 |
| Succès | 5,96 / 5,09 | 8,48 / 6,79 |
| Avertissement | 7,08 / 6,04 | 7,47 / 5,98 |
| Erreur | 7,42 / 6,34 | 7,11 / 5,69 |
| Focus | 6,65 / 5,68 | 7,47 / 5,98 |
| Bordures | 6,65 / 5,68 | 6,32 / 5,06 |
| Jauge | 6,65 / 5,68 | 7,47 |
| Marqueur 90 % (sur fond) | 3,28 | 7,47 |
| Ratio le plus bas, texte | 5,09 | 5,69 |
| Ratio le plus bas, non-texte | 3,28 | 3,03 (icône d'avertissement Tobiko sur surface sombre) |

### Dégradés (`--gradient-*`)

Cinq dégradés linéaires à 160°, statiques. Seules les paires texte/dégradé validées sont autorisées.

| Jeton | Définition | Texte autorisé | Usage |
|---|---|---|---|
| `{gradients.gradient-1}` | Chalk › Dawn | Forest (10,60) | Bandeau discret |
| `{gradients.gradient-2}` | Dawn › Sneezeweeds | Forest (7,47) | Portfolio public clair, bandeau d'en-tête du Cockpit |
| `{gradients.gradient-3}` | Sneezeweeds › Tobiko | Aucun (Forest 3,79, Chalk 1,66) | Panneau décoratif de connexion, clair |
| `{gradients.gradient-4}` | Sneezeweeds › Kyuri › Forest | Aucun (Forest 1,00, Chalk 1,66) | Panneau décoratif de connexion, sombre |
| `{gradients.gradient-5}` | Kyuri › Forest | Chalk (6,65) | Portfolio public sombre |

Trois scènes, et pas d'autre : **A** portfolio public (`{gradients.gradient-2}` + texte Forest en clair, `{gradients.gradient-5}` + texte Chalk en sombre) ; **B** page de connexion (panneau `{gradients.gradient-3}` en clair, `{gradients.gradient-4}` en sombre, `aria-hidden`, sans texte) ; **C** bandeau d'en-tête du Cockpit (`{gradients.gradient-2}` + texte Forest en clair, `{gradients.gradient-5}` + texte Chalk en sombre). Jamais derrière tâches, tableaux, jauge ou chat. Pas d'animation ; s'ils étaient un jour animés, l'animation ne tournerait que sous `prefers-reduced-motion: no-preference`, la version statique restant la valeur par défaut.

## Typography

**Plus Jakarta Sans** pour les titres et le corps (remplace Geist du gabarit). Rôles : `{typography.display}` (titres de page, portfolio), `{typography.heading}`, `{typography.body}`, `{typography.label}` (motifs, badges, en-têtes de colonnes). `{typography.numeric}` : **chiffres tabulaires** (`font-variant-numeric: tabular-nums`) sur tous les montants, dates et durées, alignés à droite dans les tableaux. Tailles de police exprimées en `rem` (zoom et préférences du navigateur respectés). Langue : `<html lang="fr">` (voir EXPERIENCE.md, Accessibility Floor).

**Liens dans le texte** : soulignés en permanence, couleur `{colors.primary}` (clair) / `{colors.primary-dark}` (sombre) ; soulignement conservé au survol et au focus. **Placeholder** : `{colors.muted-foreground}` (≥ 4,5:1), jamais seul comme libellé. **Désactivé** : opacité 50 % + `aria-disabled`, jamais le seul moyen d'indiquer un état.

## Layout & Spacing

Échelle 4/8 (`{spacing.1}` à `{spacing.12}`), héritée de Tailwind. Ordinateur d'abord : barre latérale fixe à gauche (repliable en icônes), contenu en grille ; le Cockpit privilégie la densité lisible (lignes de `{spacing.3}` de padding). Pas de largeur maximale unique : les tableaux CRM utilisent la largeur disponible, le portfolio public se lit en colonne centrée. Points de rupture : voir EXPERIENCE.md, Responsive & Platform.

## Elevation & Depth

Profondeur tonale, pas d'ombres décoratives : fond, puis surface `{colors.card}`, séparés par une bordure `{colors.border}`. Ombre shadcn par défaut réservée aux popovers et dialogues. Aucune ombre sur les lignes de tâches.

## Shapes

Rayons : `{rounded.sm}` pour champs et étiquettes d'estimation, `{rounded.md}` pour boutons, lignes de tâche et cartes, `{rounded.lg}` pour panneaux et dialogues (valeur `--radius` existante), `{rounded.full}` pour badges, puces de citation et barre de la jauge.

## Components

Seuls les composants propres à LogMerry sont spécifiés ; leur comportement est dans EXPERIENCE.md, Component Patterns.

| Composant | Spécification visuelle |
|---|---|
| `button-primary` | Fond `{colors.primary}`, texte `{colors.primary-foreground}`, rayon `{rounded.md}`. Jamais orange ni jaune en clair. |
| `task-row` | Fond `{colors.card}`, bordure `{colors.border}`, rayon `{rounded.md}`. Case à cocher à gauche (bordure `{colors.input}`), titre en `{typography.body}` gras, **motif** (`task-motif`) sous le titre : icône lucide + texte `{typography.label}` en `{colors.muted-foreground}`. Tâche cochée : titre barré et icône de coche, pas seulement une teinte. |
| `plafond-bar` | Barre type bullet chart : piste à bordure `{colors.border}`, remplissage `{colors.primary}`, marqueur vertical 90 % `{colors.marker}` de 3 px, entouré d'un liseré de 2 px `{colors.background}` et dépassant de 4 px de chaque côté de la piste (marqueur contre liseré : 3,28 en clair, 7,47 en sombre ; liseré contre remplissage : 6,65 / 7,47). La barre ne contient aucun texte. Fond de piste `{colors.background}`. Le chiffre et le seuil s'affichent à côté, en `{typography.numeric}`. Marqueur `aria-hidden`. Jamais sur un dégradé ni dans une carte Dawn. En `forced-colors: active`, piste, remplissage et marqueur passent par `border`/`outline` (`Highlight`/`CanvasText`), pas seulement `background`. |
| `estimation-label` | Étiquette « estimation » : bordure `{colors.border}`, rayon `{rounded.sm}`, icône + texte `{typography.label}`. Accompagne tout montant calculé. |
| `status-badge` | Pastille `{rounded.full}` : icône + texte, couleur d'état en complément (succès, avertissement, erreur). |
| `assistant-panel` | Panneau ancré à droite, fond `{colors.popover}`, bordure `{colors.border}`, rayon `{rounded.lg}`. Réponse en `{typography.body}`, puces lisibles en diagonale, sources dessous. |
| `citation-chip` | Puce `{rounded.full}`, fond `{colors.muted}`, bordure `{colors.border}`, titre de la Note source ; focus visible `{colors.ring}`. |
| `data-table` | Shadcn Table sur `{colors.card}`, lignes séparées par `{colors.border}`, en-têtes `{typography.label}`, chiffres tabulaires alignés à droite. |
| `backlog-summary` | Ligne plate sous la liste des tâches du Cockpit : icône lucide + texte `{typography.label}` en `{colors.muted-foreground}` (6,65 sur Chalk en clair, 10,60 en sombre) ; le libellé est un lien `{colors.foreground}` souligné. Sans fond, sans bordure, sans case : ce n'est pas une tâche. |
| `contact-form` | **Après MVP** (au MVP : simple lien « m'écrire » `{colors.primary}`, souligné, focus `{colors.ring}`). Formulaire du portfolio public : shadcn Input, Textarea et Button, libellés visibles au-dessus des champs, bordures `{colors.input}`, rayon `{rounded.sm}`, erreurs en `{colors.destructive}` avec icône + texte. Comportement : EXPERIENCE.md, Component Patterns. |
| `gradient-banner` | Bandeau d'en-tête du Cockpit : `{gradients.gradient-2}`, texte `{colors.forest}` en clair (en sombre : scène C) ; hors de la zone des tâches. |

## Do's and Don'ts

| Do | Don't |
|---|---|
| Doubler chaque information d'état d'une icône et d'un texte | Utiliser la couleur seule (jauge, statut, succès, erreur, case cochée) |
| Réserver Tobiko au marqueur 90 %, sans texte ; poser la jauge sur le fond Chalk | Placer la jauge dans une carte Dawn, ou l'orange en texte sur fond clair |
| Réserver le jaune au primaire sombre et aux icônes/marqueurs | Mettre du texte sur un aplat jaune ou orange en clair |
| Limiter les dégradés aux scènes A, B, C avec les paires validées | Placer un dégradé derrière tâches, tableaux, jauge ou chat |
| Mettre en tabulaire tout montant, date et durée | Laisser des chiffres proportionnels dans un tableau ou la jauge |
| Définir chaque jeton en clair et en sombre ensemble | Livrer un thème sans son pendant |
| Étiqueter « estimation » tout montant calculé | Présenter un montant calculé comme officiel |
| Hériter des composants shadcn par défaut | Redessiner Dialog, Sheet, Command sans raison de marque |
| Respecter `prefers-reduced-motion` et `forced-colors`, ne jamais animer un dégradé | Ignorer `prefers-reduced-motion` ou `forced-colors`, animer un dégradé |
