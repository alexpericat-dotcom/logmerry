/**
 * Génère les variantes servies des extraits du dossier (page publique) : `npm run build:dossier`.
 * Les ORIGINAUX, fournis par Alex, sont dans `assets-source/dossier-<clé>.(png|jpg|jpeg|webp)` (hors du dossier servi) ; jamais générés ni capturés automatiquement.
 * Sortie : `public/images/dossiers/<clé>-<largeur>.(avif|webp)` (800, 1200, 1600 px au plus, jamais agrandi) et le manifeste `components/dossier-images.ts`
 * (dimensions de la plus grande variante : elles servent aux attributs width et height). `sharp` est déjà installé par Next (aucune dépendance ajoutée).
 */
import { mkdir, readdir, writeFile } from "node:fs/promises";
import sharp from "sharp";

const SRC = process.env.DOSSIER_SRC ?? "assets-source";
const OUT = process.env.DOSSIER_OUT ?? "public/images/dossiers";
const MANIFEST = process.env.DOSSIER_MANIFEST ?? "components/dossier-images.ts";
const WIDTHS = [800, 1200, 1600];

await mkdir(OUT, { recursive: true });
const manifest = {};
for (const file of (await readdir(SRC)).sort()) {
  const m = /^dossier-(.+)\.(png|jpe?g|webp)$/i.exec(file);
  if (!m) continue;
  const key = m[1];
  const meta = await sharp(`${SRC}/${file}`).metadata();
  const widths = WIDTHS.filter((w) => w <= meta.width);
  if (widths.length === 0) widths.push(meta.width); // image plus petite que la plus petite variante : on la sert telle quelle, sans l'agrandir
  for (const w of widths) {
    await sharp(`${SRC}/${file}`).resize({ width: w }).avif({ quality: 60, effort: 6 }).toFile(`${OUT}/${key}-${w}.avif`);
    await sharp(`${SRC}/${file}`).resize({ width: w }).webp({ quality: 80, effort: 6 }).toFile(`${OUT}/${key}-${w}.webp`);
  }
  const top = widths[widths.length - 1];
  manifest[key] = { width: top, height: Math.round((meta.height * top) / meta.width), widths };
  console.log(`${key}: ${widths.join(", ")} px`);
}
await writeFile(
  MANIFEST,
  `/* Généré par scripts/build-dossier-images.mjs (npm run build:dossier) : ne pas modifier à la main. Les extraits du dossier dont les fichiers sont fournis (assets-source/). */
export type DossierImage = { width: number; height: number; widths: number[] };
export const DOSSIER_IMAGES: Record<string, DossierImage> = ${JSON.stringify(manifest, null, 2)};
`,
);
