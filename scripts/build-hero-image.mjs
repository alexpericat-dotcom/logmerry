/**
 * Génère les variantes servies de l'image du hero depuis `assets-source/hero-surf-original.jpg` : `npm run build:hero`.
 * `sharp` est déjà installé par Next (pas de dépendance ajoutée). Deux cadrages : large (bureau) et carré-ish 4:3 centré sur le surfeur (téléphone, tablette).
 * Qualité réglée pour que chaque variante large reste sous 350 Ko (le grain compresse mal : on baisse la qualité, pas la résolution).
 */
import { mkdir, stat } from "node:fs/promises";
import sharp from "sharp";

const SRC = "assets-source/hero-surf-original.jpg";
const OUT = "public/images/hero";
const MAX = 350 * 1024;
// Cadrage 4:3 du téléphone, en pixels de l'original (2752×1536) : le surfeur occupe x 1390–2620, y 600–1050.
const CROP = { left: 1100, top: 250, width: 1600, height: 1200 };

const variants = [
  { name: "wide-2000", width: 2000, crop: null },
  { name: "wide-1400", width: 1400, crop: null },
  { name: "crop-1200", width: 1200, crop: CROP },
  { name: "crop-800", width: 800, crop: CROP },
];
const formats = [
  { ext: "avif", encode: (s, q) => s.avif({ quality: q, effort: 6 }), q: [72, 64, 56, 48, 40, 32] },
  { ext: "webp", encode: (s, q) => s.webp({ quality: q, effort: 6 }), q: [86, 80, 72, 64, 56, 48] },
];

await mkdir(OUT, { recursive: true });
for (const v of variants) {
  for (const f of formats) {
    const file = `${OUT}/hero-${v.name}.${f.ext}`;
    let used = 0;
    for (const q of f.q) {
      let s = sharp(SRC);
      if (v.crop) s = s.extract(v.crop);
      await f.encode(s.resize({ width: v.width }), q).toFile(file);
      used = q;
      if ((await stat(file)).size <= MAX) break;
    }
    const meta = await sharp(file).metadata();
    console.log(`${file}  ${meta.width}×${meta.height}  q${used}  ${Math.round((await stat(file)).size / 1024)} Ko`);
  }
}
