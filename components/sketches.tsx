import type { CSSProperties } from "react";

import { SKETCH_DATA } from "@/components/sketch-data";

/**
 * Croquis « de carnet » de la page publique : traits à main levée, hachures, surligneur orange. Les tracés sont générés par `scripts/build-sketches.mjs` (formes nettes
 * rendues à la main, hasard déterminé) et rangés dans `sketch-data.ts` ; jamais une image. Décoratifs, donc cachés des lecteurs d'écran. Chaque tracé porte `pathLength=1`,
 * ce qui permet de le « dessiner » au défilement (`.sketch` dans `app/globals.css`). Sans mouvement (mouvement réduit, impression, JS coupé), le croquis est tracé en entier.
 */
export type SketchName = keyof typeof SKETCH_DATA;
export const SKETCH_NAMES = Object.keys(SKETCH_DATA) as SketchName[];

/** Un croquis décoratif ; la taille vient de `className` (ex. `size-16`, `w-40`). Les tracés se dessinent en cascade (`--p`, de 0 à 12). */
export function Sketch({ name, className = "" }: { name: SketchName; className?: string }) {
  const { box, strokes } = SKETCH_DATA[name];
  const last = Math.max(1, strokes.length - 1);
  return (
    <svg viewBox={box} aria-hidden="true" focusable="false" className={`sketch fill-none stroke-current ${className}`} strokeLinecap="round" strokeLinejoin="round">
      {strokes.map((s, i) => (
        <path key={i} d={s.d} pathLength={1} strokeWidth={s.w} className={`sk-${s.k}`} style={{ "--p": Math.round((i / last) * 12) } as CSSProperties} />
      ))}
    </svg>
  );
}
