import type { CSSProperties } from "react";

type Stroke = { d: string; accent?: boolean };
type Drawing = { box: string; width: number; strokes: Stroke[] };

/**
 * Petits croquis au trait qui ponctuent les textes de la page publique. Dessinés ici (tracés SVG simples, un seul trait, un accent orange), jamais d'image :
 * décoratifs, donc cachés des lecteurs d'écran. Chaque tracé porte `pathLength=1`, ce qui permet de « le dessiner » au défilement (`.sketch` dans `app/globals.css`).
 * Un croquis sans mouvement (mouvement réduit, impression, JS coupé) est simplement tracé en entier.
 */
const DRAWINGS = {
  // Grandes scènes (en-têtes de section)
  funnel: {
    box: "0 0 160 128",
    width: 3,
    strokes: [
      { d: "M12 22 C50 16 110 18 148 22" },
      { d: "M12 22 L68 78 L68 106" },
      { d: "M148 22 L92 78 L92 106" },
      { d: "M68 106 Q80 114 92 106" },
      { d: "M28 4 L31 8 M62 2 L65 7 M96 3 L99 8 M128 5 L131 9 M46 9 L49 13 M112 10 L115 14" },
      { d: "M80 116 V126 M74 121 L80 127 L86 121", accent: true },
    ],
  },
  tangle: {
    box: "0 0 160 80",
    width: 3,
    strokes: [
      { d: "M6 42 C20 8 34 72 46 30 S64 8 70 46 S88 62 74 26 S100 38 104 42" },
      { d: "M104 42 L152 42 M140 32 L152 42 L140 52", accent: true },
    ],
  },
  bricks: {
    box: "0 0 100 100",
    width: 3,
    strokes: [
      { d: "M6 74 H46 V96 H6 Z" },
      { d: "M54 74 H94 V96 H54 Z" },
      { d: "M30 50 H70 V72 H30 Z" },
      { d: "M34 24 H74 V46 H34 Z M80 28 L88 22 M82 38 L92 38", accent: true },
    ],
  },
  boat: {
    box: "0 0 120 104",
    width: 3,
    strokes: [
      { d: "M18 72 H102 L90 88 H30 Z" },
      { d: "M60 72 V12" },
      { d: "M60 16 V64 H26 Z" },
      { d: "M65 26 V64 H94 Z", accent: true },
      { d: "M4 98 q7 -7 14 0 t14 0 t14 0 t14 0 t14 0 t14 0 t14 0 t14 0", accent: true },
    ],
  },
  // Petites icônes (briques, formules, étapes)
  window: {
    box: "0 0 64 64",
    width: 2.4,
    strokes: [{ d: "M8 12 H56 V52 H8 Z" }, { d: "M8 24 H56" }, { d: "M14 18 h.01 M20 18 h.01", accent: true }, { d: "M16 34 H34 M16 42 H46" }],
  },
  cog: {
    box: "0 0 64 64",
    width: 2.4,
    strokes: [
      { d: "M44 32 a12 12 0 1 1 -24 0 a12 12 0 1 1 24 0 Z" },
      { d: "M36 32 a4 4 0 1 1 -8 0 a4 4 0 1 1 8 0 Z", accent: true },
      { d: "M32 6 V14 M32 50 V58 M6 32 H14 M50 32 H58 M14 14 L20 20 M44 44 L50 50 M50 14 L44 20 M14 50 L20 44" },
    ],
  },
  database: {
    box: "0 0 64 64",
    width: 2.4,
    strokes: [
      { d: "M12 16 c0 -4.4 9 -8 20 -8 s20 3.6 20 8 s-9 8 -20 8 s-20 -3.6 -20 -8 Z" },
      { d: "M12 16 V48 c0 4.4 9 8 20 8 s20 -3.6 20 -8 V16" },
      { d: "M12 32 c0 4.4 9 8 20 8 s20 -3.6 20 -8", accent: true },
    ],
  },
  chat: {
    box: "0 0 64 64",
    width: 2.4,
    strokes: [
      { d: "M10 14 H44 a4 4 0 0 1 4 4 V36 a4 4 0 0 1 -4 4 H28 L18 50 V40 H10 a4 4 0 0 1 -4 -4 V18 a4 4 0 0 1 4 -4 Z" },
      { d: "M14 24 H38 M14 31 H30" },
      { d: "M54 6 V18 M48 12 H60", accent: true },
    ],
  },
  cloud: {
    box: "0 0 64 64",
    width: 2.4,
    strokes: [
      { d: "M18 46 a11 11 0 0 1 1.5 -21.9 A15 15 0 0 1 48 26 a10 10 0 0 1 1 20 Z" },
      { d: "M32 54 V36 M25 43 L32 36 L39 43", accent: true },
    ],
  },
  shield: {
    box: "0 0 64 64",
    width: 2.4,
    strokes: [
      { d: "M32 6 L52 14 V32 C52 44 44 52 32 58 C20 52 12 44 12 32 V14 Z" },
      { d: "M25 31 H39 V43 H25 Z M28 31 V27 a4 4 0 0 1 8 0 V31", accent: true },
    ],
  },
  magnifier: {
    box: "0 0 64 64",
    width: 2.4,
    strokes: [{ d: "M42 28 a15 15 0 1 1 -30 0 a15 15 0 1 1 30 0 Z" }, { d: "M38 40 L54 56", accent: true }, { d: "M20 24 q3 -5 8 -4" }],
  },
  loop: {
    box: "0 0 64 64",
    width: 2.4,
    strokes: [
      { d: "M12 30 a20 20 0 0 1 36 -10 M50 8 V22 H36" },
      { d: "M52 34 a20 20 0 0 1 -36 10 M14 56 V42 H28", accent: true },
    ],
  },
  wrench: {
    box: "0 0 64 64",
    width: 2.4,
    strokes: [{ d: "M44 8 a13 13 0 0 0 -11 17 L9 49 a5.5 5.5 0 0 0 8 8 L41 33 a13 13 0 0 0 17 -11 l-8 8 -9 -2 -2 -9 Z" }, { d: "M13 53 h.01", accent: true }],
  },
  question: {
    box: "0 0 64 64",
    width: 2.4,
    strokes: [{ d: "M20 22 a12 12 0 1 1 18 10 c-5 3 -6 5 -6 10" }, { d: "M32 54 h.01", accent: true }, { d: "M8 14 L12 18 M54 12 L50 17" }],
  },
  flow: {
    box: "0 0 64 64",
    width: 2.4,
    strokes: [
      { d: "M6 8 H26 V22 H6 Z" },
      { d: "M38 8 H58 V22 H38 Z" },
      { d: "M22 42 H42 V56 H22 Z" },
      { d: "M26 15 H38 M32 22 V32 H16 V42 M48 22 V32 H48", accent: true },
    ],
  },
  spark: {
    box: "0 0 64 64",
    width: 2.4,
    strokes: [{ d: "M30 8 L35 27 L54 32 L35 37 L30 56 L25 37 L6 32 L25 27 Z" }, { d: "M52 8 V18 M47 13 H57", accent: true }],
  },
  rocket: {
    box: "0 0 64 64",
    width: 2.4,
    strokes: [
      { d: "M32 6 C45 14 47 30 41 44 H23 C17 30 19 14 32 6 Z" },
      { d: "M23 36 L13 46 L22 47 M41 36 L51 46 L42 47" },
      { d: "M36 24 a4 4 0 1 1 -8 0 a4 4 0 1 1 8 0 Z" },
      { d: "M32 50 V60 M26 50 L24 57 M38 50 L40 57", accent: true },
    ],
  },
} satisfies Record<string, Drawing>;

export type SketchName = keyof typeof DRAWINGS;
export const SKETCH_NAMES = Object.keys(DRAWINGS) as SketchName[];

/** Un croquis décoratif ; la taille vient de `className` (ex. `size-16`, `w-40`). */
export function Sketch({ name, className = "" }: { name: SketchName; className?: string }) {
  const { box, width, strokes }: Drawing = DRAWINGS[name];
  return (
    <svg viewBox={box} aria-hidden="true" focusable="false" className={`sketch fill-none stroke-current ${className}`} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round">
      {strokes.map((s, i) => (
        <path key={i} d={s.d} pathLength={1} className={s.accent ? "sk-accent" : undefined} style={{ "--p": i } as CSSProperties} />
      ))}
    </svg>
  );
}
