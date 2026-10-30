# Vidéo de fond du hero (page publique `/portfolio`)

La vidéo est **fournie par Alex** (jamais générée). Tant que les fichiers ne sont pas déposés et déclarés, la page n'en demande aucun et garde son fond animé.

## Fichiers à déposer dans `public/video/`

| Fichier | Rôle | Cible |
|---|---|---|
| `hero.webm` | boucle, ordinateur | moins de 3 Mo, 1080p au plus, 6 à 10 s, **sans piste audio** |
| `hero.mp4` | même boucle, repli | idem |
| `hero-poster.jpg` (ou `.webp`) | affiche : visible pendant le chargement, et **seule** si la vidéo ne joue pas | moins de 120 Ko, environ 1600 px de large |
| `hero-720.webm`, `hero-720.mp4` | facultatif : version téléphone allégée | moins de 1,5 Mo, 720p |

Sans la version téléphone, un téléphone n'affiche que l'affiche (le plus léger).

## Commandes (à lancer sur ton Mac : `brew install ffmpeg`)

```bash
# SOURCE = ta vidéo d'origine ; 8 s, sans audio, 24 images/s, 1080p au plus
ffmpeg -i SOURCE.mp4 -t 8 -an -vf "scale='min(1920,iw)':-2,fps=24" -c:v libvpx-vp9 -b:v 0 -crf 36 -row-mt 1 public/video/hero.webm
ffmpeg -i SOURCE.mp4 -t 8 -an -vf "scale='min(1920,iw)':-2,fps=24" -c:v libx264 -profile:v high -crf 28 -preset slow -pix_fmt yuv420p -movflags +faststart public/video/hero.mp4

# Version téléphone (facultatif)
ffmpeg -i SOURCE.mp4 -t 8 -an -vf "scale='min(1280,iw)':-2,fps=24" -c:v libvpx-vp9 -b:v 0 -crf 40 -row-mt 1 public/video/hero-720.webm
ffmpeg -i SOURCE.mp4 -t 8 -an -vf "scale='min(1280,iw)':-2,fps=24" -c:v libx264 -profile:v main -crf 32 -preset slow -pix_fmt yuv420p -movflags +faststart public/video/hero-720.mp4

# Affiche : une image de la vidéo (à 1 s), légère
ffmpeg -i SOURCE.mp4 -ss 1 -frames:v 1 -vf "scale=1600:-2" -q:v 6 public/video/hero-poster.jpg

# Vérifier les poids
ls -l public/video
```

Si un fichier dépasse la cible, augmente `-crf` (plus élevé = plus léger). Une boucle « sans coupure visible » se joue au montage : choisis un plan dont la fin ressemble au début, ou termine par un fondu enchaîné vers la première image.

## Activer

Dans `lib/portfolio-content.ts`, remplacer `video: null` par :

```ts
video: { poster: "/video/hero-poster.jpg", webm: "/video/hero.webm", mp4: "/video/hero.mp4", mobile: { webm: "/video/hero-720.webm", mp4: "/video/hero-720.mp4" } },
```

(`mobile` est facultatif.) `npm test` vérifie alors que tous les fichiers existent et respectent les poids.

## Ce qui est garanti

- **Contraste (AA)** : l'overlay sombre fait au moins 74 % d'opacité sur toute la hauteur ; avec un pixel de vidéo blanc pur dessous, le texte (7:1) et le dégradé du titre (3:1, grand texte) restent lisibles, quelle que soit la vidéo. Calcul et test : `lib/domain/hero-video.ts`.
- **Performance** : l'affiche est chargée en priorité ; la vidéo n'est montée qu'après le chargement de la page et quand le navigateur est au repos, jamais avant le premier affichage du texte.
- **Respect du visiteur** : « réduire les animations », « économie de données », connexion 2G ou 3G : l'affiche seule, aucun octet de vidéo. La vidéo se met en pause hors de l'écran, onglet masqué, et avec le bouton de pause de l'en-tête (WCAG 2.2.2).
- **Thèmes** : avec la vidéo, le hero passe en jetons sombres quel que soit le thème (texte clair sur overlay sombre).
