import assert from "node:assert/strict";
import test from "node:test";

import { OVERLAY_MAX_ALPHA, OVERLAY_MIN_ALPHA, contrast, luminance, playbackMode, worstCaseBackground, worstCaseContrast, type PlaybackContext } from "./hero-video.ts";

const ok: PlaybackContext = { reducedMotion: false, saveData: false, effectiveType: "4g", narrow: false, hasMobileSources: false };

test("vidéo jouée sur un grand écran, bonne connexion, sans préférence contraire", () => {
  assert.equal(playbackMode(ok), "desktop");
  assert.equal(playbackMode({ ...ok, effectiveType: undefined }), "desktop", "connexion inconnue : on joue");
});

test("mouvement réduit, économie de données ou connexion lente : l'affiche seule, aucune vidéo", () => {
  assert.equal(playbackMode({ ...ok, reducedMotion: true }), "none");
  assert.equal(playbackMode({ ...ok, saveData: true }), "none");
  for (const effectiveType of ["slow-2g", "2g", "3g"]) assert.equal(playbackMode({ ...ok, effectiveType }), "none", effectiveType);
  assert.equal(playbackMode({ ...ok, reducedMotion: true, narrow: true, hasMobileSources: true }), "none", "la préférence l'emporte aussi sur le téléphone");
});

test("téléphone : version 720p allégée si elle existe, sinon l'affiche seule", () => {
  assert.equal(playbackMode({ ...ok, narrow: true, hasMobileSources: true }), "mobile");
  assert.equal(playbackMode({ ...ok, narrow: true, hasMobileSources: false }), "none");
});

test("contraste : valeurs de référence de la formule WCAG (noir/blanc = 21, identiques = 1)", () => {
  assert.ok(Math.abs(contrast(luminance("#ffffff"), luminance("#000000")) - 21) < 1e-9);
  assert.equal(contrast(0.5, 0.5), 1);
});

test("overlay : le pire pixel de vidéo (blanc pur) sous l'overlay le plus clair garde le texte lisible, AA (4,5:1) pour le texte courant", () => {
  const [r, g, b] = worstCaseBackground();
  assert.ok(r < 100 && g < 100 && b < 100, `fond le plus clair : ${r},${g},${b}`);
  assert.ok(worstCaseContrast("#F2F1EC") >= 4.5, "texte courant (jeton foreground sombre)");
  assert.ok(worstCaseContrast("#F2F1EC") >= 7, "et même 7:1 : marge pour le rendu réel");
});

test("overlay : le dégradé de marque du titre (grand texte, 3:1 exigé) tient aussi sur le pire fond", () => {
  // Jetons du thème : tone-violet, tone-pink, tone-orange (les couleurs claires, utilisées sur la vidéo).
  for (const stop of ["#A996F0", "#FF8FB3", "#FF9A4D"]) assert.ok(worstCaseContrast(stop) >= 3, `${stop} : ${worstCaseContrast(stop).toFixed(2)}`);
});

test("overlay : une opacité plus faible casse la garantie (le test détecte un overlay trop léger)", () => {
  assert.ok(worstCaseContrast("#A996F0", 0.5) < 3, "à 50 % l'accent violet ne tient plus sur le pire pixel");
  assert.ok(OVERLAY_MIN_ALPHA < OVERLAY_MAX_ALPHA && OVERLAY_MAX_ALPHA <= 1);
});
