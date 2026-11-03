import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

import { DOSSIERS, UMARIS_ID } from "./portfolio-dossiers.ts";

const dossier = DOSSIERS[UMARIS_ID];

test("le dossier est rattaché à l'identifiant fixé dans le script d'insertion (et à lui seul)", () => {
  assert.deepEqual(Object.keys(DOSSIERS), [UMARIS_ID]);
  assert.ok(readFileSync("docs/realisation-umaris.sql", "utf8").includes(`'${UMARIS_ID}'`));
});

test("bande de chiffres : exactement les trois valeurs et la légende fournies par Alex, rien d'ajouté", () => {
  assert.deepEqual(dossier.figures, [
    { value: "10", label: "testeurs" },
    { value: "3,9/5", label: "d'ergonomie moyenne" },
    { value: "4", label: "ajustements décidés" },
  ]);
  assert.equal(dossier.figuresCaption, "Tests qualitatifs sur maquettes basse fidélité, 5 clients et 5 agents.");
});

test("quatre flux dans l'ordre (soumission, enrichissement IA, traitement, notification), texte d'Alex ; aucun outil d'orchestration nommé (n8n ou Make à confirmer)", () => {
  assert.deepEqual(dossier.architecture.flows.map((f) => [f.number, f.title]), [[1, "Soumission"], [2, "Enrichissement IA"], [3, "Traitement"], [4, "Notification"]]);
  const all = JSON.stringify(dossier);
  assert.ok(!/\bn8n\b|\bmake\b/i.test(all), "l'outil d'orchestration n'est pas nommé tant qu'Alex n'a pas tranché");
  for (const brick of ["Mistral", "Brevo", "Supabase", "webhook"]) assert.ok(all.includes(brick), brick);
  assert.ok(!/\b(site|application|web ?app)\b/i.test(dossier.architecture.alt), "texte alternatif sans livrable inventé");
});

test("extraits : deux emplacements (veille, backlog), légende « extrait du dossier » et lien vers le dossier complet, texte alternatif non vide", () => {
  assert.deepEqual(dossier.captures.items.map((i) => i.key), ["veille", "backlog"]);
  assert.equal(dossier.captures.kind, "extrait du dossier");
  assert.equal(dossier.captures.linkLabel, "Voir le dossier complet");
  for (const item of dossier.captures.items) assert.ok(item.alt.trim() && item.caption.trim());
});

test("chaque extrait déclaré dans le manifeste a ses variantes AVIF et WebP, et son original est dans assets-source/ (hors du dossier servi)", async () => {
  const { DOSSIER_IMAGES } = await import("../components/dossier-images.ts");
  for (const [key, image] of Object.entries(DOSSIER_IMAGES)) {
    assert.ok(image.width > 0 && image.height > 0 && image.widths.length > 0, key);
    for (const w of image.widths) for (const ext of ["avif", "webp"]) assert.ok(existsSync(`public/images/dossiers/${key}-${w}.${ext}`), `${key}-${w}.${ext}`);
    assert.ok(["png", "jpg", "jpeg", "webp"].some((ext) => existsSync(`assets-source/dossier-${key}.${ext}`)), `original de ${key} absent de assets-source/`);
  }
});
