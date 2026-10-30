export const IMAGE_MAX_PER_REALISATION = 6;
export const IMAGE_MAX_BYTES = 3 * 1024 * 1024;
export const IMAGE_ALT_MAX = 200;

/** Types acceptés (les mêmes que ceux du bucket `portfolio`) et l'extension du chemin qui en découle. */
export const IMAGE_TYPES = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" } as const;
export type ImageMime = keyof typeof IMAGE_TYPES;

const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
const PATH = new RegExp(`^(${UUID})/(${UUID})/${UUID}\\.(png|jpg|webp)$`);

/** Dossier du propriétaire, de la réalisation, puis un nom fabriqué (jamais le nom du fichier envoyé). */
export const imagePath = (ownerId: string, realisationId: string, fileId: string, mime: ImageMime) => `${ownerId}/${realisationId}/${fileId}.${IMAGE_TYPES[mime]}`;

/** Le chemin d'une capture est bien dans le dossier de ce propriétaire et de cette réalisation. */
export function pathBelongsTo(path: string, ownerId: string, realisationId: string): boolean {
  const m = PATH.exec(path);
  return !!m && m[1] === ownerId && m[2] === realisationId;
}

/** Contrôle d'un fichier avant l'envoi : message à afficher, ou null si le fichier convient. */
export function imageFileProblem(file: { type: string; size: number }): string | null {
  if (!Object.hasOwn(IMAGE_TYPES, file.type)) return "Choisis une image PNG, JPEG ou WebP.";
  if (file.size === 0) return "Ce fichier est vide.";
  if (file.size > IMAGE_MAX_BYTES) return `L'image dépasse ${IMAGE_MAX_BYTES / 1024 / 1024} Mo. Réduis-la, puis réessaie.`;
  return null;
}

// Postgres refuse le caractère nul ; les espaces de largeur nulle ne se voient pas (même règle que les autres textes).
const clean = (s: string) => s.replaceAll("\u0000", "").replace(/[​-‍⁠﻿]/g, "").replace(/\r\n?/g, "\n").trim();

/** Texte alternatif obligatoire : ce que montre l'image, en une phrase. */
export function validateAlt(text: string): { ok: true; value: string } | { ok: false; error: string } {
  const value = clean(text);
  if (!value) return { ok: false, error: "Décris l'image en une phrase (texte alternatif obligatoire)." };
  if ([...value].length > IMAGE_ALT_MAX) return { ok: false, error: `Le texte alternatif doit faire ${IMAGE_ALT_MAX} caractères au plus.` };
  return { ok: true, value };
}

/** Adresse publique d'une capture du bucket `portfolio` (lecture publique, AD-2). */
export const publicImageUrl = (supabaseUrl: string, path: string) => `${supabaseUrl.replace(/\/$/, "")}/storage/v1/object/public/portfolio/${path}`;
