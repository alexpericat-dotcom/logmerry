/**
 * Vidéo de fond du hero (fournie par Alex, jamais générée). Règles pures : quand la jouer, et quel contraste l'overlay garantit au texte.
 */

export type HeroVideo = {
  /** Image légère affichée pendant le chargement, et seule image si la vidéo ne joue pas. */
  poster: string;
  webm: string;
  mp4: string;
  /** Version 720p allégée pour le téléphone ; sans elle, le téléphone n'affiche que l'affiche. */
  mobile?: { webm: string; mp4: string };
};

/** Limites de poids (octets) vérifiées par un test dès que les fichiers existent : cible d'Alex, moins de 3 Mo par vidéo. */
export const VIDEO_MAX_BYTES = 3 * 1024 * 1024;
export const POSTER_MAX_BYTES = 120 * 1024;

export type PlaybackContext = {
  reducedMotion: boolean;
  saveData: boolean;
  /** `navigator.connection.effectiveType` : « slow-2g », « 2g », « 3g » ou « 4g » ; inconnu si le navigateur ne le donne pas. */
  effectiveType?: string;
  /** Écran étroit (téléphone). */
  narrow: boolean;
  hasMobileSources: boolean;
};

/** « none » : l'affiche seule, aucune vidéo téléchargée ; « desktop » : la vidéo 1080p ; « mobile » : la version 720p allégée. */
export function playbackMode(c: PlaybackContext): "none" | "desktop" | "mobile" {
  if (c.reducedMotion || c.saveData) return "none";
  if (c.effectiveType && ["slow-2g", "2g", "3g"].includes(c.effectiveType)) return "none";
  if (c.narrow) return c.hasMobileSources ? "mobile" : "none";
  return "desktop";
}

/** Opacité minimale de l'overlay sombre (la plus claire de son dégradé) : calculée pour le pire cas, voir `worstCaseContrast`. */
export const OVERLAY_MIN_ALPHA = 0.74;
export const OVERLAY_MAX_ALPHA = 0.86;
/** Couleur de l'overlay (un noir bleuté, proche du fond sombre du thème). */
export const OVERLAY_RGB = [5, 7, 12] as const;

const channel = (v: number) => {
  const s = v / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};
/** Luminance relative WCAG d'une couleur « #rrggbb » ou d'un triplet. */
export function luminance(color: string | readonly [number, number, number]): number {
  const [r, g, b] = typeof color === "string" ? [1, 3, 5].map((i) => parseInt(color.slice(i, i + 2), 16)) : color;
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}
/** Rapport de contraste WCAG entre deux luminances. */
export const contrast = (a: number, b: number) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);

/** Fond le plus clair possible sous le texte : un pixel de vidéo blanc pur sous l'overlay le plus transparent. */
export function worstCaseBackground(alpha = OVERLAY_MIN_ALPHA): [number, number, number] {
  return OVERLAY_RGB.map((o) => Math.round(255 * (1 - alpha) + o * alpha)) as [number, number, number];
}

/** Contraste d'un texte (« #rrggbb ») contre le pire pixel de vidéo possible sous l'overlay : si ce rapport tient, il tient pour n'importe quelle vidéo. */
export const worstCaseContrast = (textHex: string, alpha = OVERLAY_MIN_ALPHA) => contrast(luminance(textHex), luminance(worstCaseBackground(alpha)));
