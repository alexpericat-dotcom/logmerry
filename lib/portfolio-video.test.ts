import assert from "node:assert/strict";
import { existsSync, statSync } from "node:fs";
import test from "node:test";

import { POSTER_MAX_BYTES, VIDEO_MAX_BYTES } from "./domain/hero-video.ts";
import { HERO } from "./portfolio-content.ts";

const file = (url: string) => `public${url}`;

test("vidéo du hero : non fournie = aucune référence ; fournie = tous les fichiers existent, sous le poids cible (3 Mo par vidéo, affiche légère)", () => {
  const video = HERO.video;
  if (!video) return; // pas encore de fichiers : la page n'en demande aucun (jamais de 404)
  const videos = [video.webm, video.mp4, ...(video.mobile ? [video.mobile.webm, video.mobile.mp4] : [])];
  for (const url of videos) {
    assert.ok(existsSync(file(url)), `${url} introuvable dans public/`);
    assert.ok(statSync(file(url)).size <= VIDEO_MAX_BYTES, `${url} : ${(statSync(file(url)).size / 1024 / 1024).toFixed(2)} Mo, plus de ${VIDEO_MAX_BYTES / 1024 / 1024} Mo`);
  }
  assert.ok(existsSync(file(video.poster)), `${video.poster} introuvable`);
  assert.ok(statSync(file(video.poster)).size <= POSTER_MAX_BYTES, `${video.poster} : affiche trop lourde (${(statSync(file(video.poster)).size / 1024).toFixed(0)} Ko)`);
  assert.ok(video.webm.endsWith(".webm") && video.mp4.endsWith(".mp4") && /\.(jpe?g|webp|avif)$/.test(video.poster));
});

test("la page publique ne référence jamais un fichier vidéo absent (aucune requête en échec)", () => {
  // Garde simple : si `HERO.video` est null, aucun chemin /video/ ne doit apparaître dans le contenu.
  if (!HERO.video) assert.ok(!JSON.stringify(HERO).includes("/video/"));
});
