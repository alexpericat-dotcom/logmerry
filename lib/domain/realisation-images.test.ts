import assert from "node:assert/strict";
import test from "node:test";

import { IMAGE_ALT_MAX, IMAGE_MAX_BYTES, imageFileProblem, imagePath, pathBelongsTo, publicImageUrl, validateAlt } from "./realisation-images.ts";

const OWNER = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const REAL = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const FILE = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

test("chemin : dossier du propriétaire, puis de la réalisation, nom fabriqué, extension selon le type", () => {
  assert.equal(imagePath(OWNER, REAL, FILE, "image/jpeg"), `${OWNER}/${REAL}/${FILE}.jpg`);
  assert.equal(imagePath(OWNER, REAL, FILE, "image/png"), `${OWNER}/${REAL}/${FILE}.png`);
  assert.equal(imagePath(OWNER, REAL, FILE, "image/webp"), `${OWNER}/${REAL}/${FILE}.webp`);
});

test("un chemin n'appartient qu'à son propriétaire et à sa réalisation, et seulement sous la forme attendue", () => {
  const ok = imagePath(OWNER, REAL, FILE, "image/png");
  assert.ok(pathBelongsTo(ok, OWNER, REAL));
  assert.ok(!pathBelongsTo(ok, FILE, REAL), "autre propriétaire");
  assert.ok(!pathBelongsTo(ok, OWNER, FILE), "autre réalisation");
  for (const bad of [`${OWNER}/${REAL}/../${FILE}.png`, `${OWNER}/${REAL}/${FILE}.svg`, `${OWNER}/${REAL}/${FILE}.png/x`, `${OWNER}/${REAL}/photo.png`, `/${OWNER}/${REAL}/${FILE}.png`, ""]) {
    assert.ok(!pathBelongsTo(bad, OWNER, REAL), bad);
  }
});

test("fichier : PNG, JPEG et WebP seulement, non vide, 3 Mo au plus", () => {
  for (const type of ["image/png", "image/jpeg", "image/webp"]) assert.equal(imageFileProblem({ type, size: IMAGE_MAX_BYTES }), null, type);
  assert.match(imageFileProblem({ type: "image/svg+xml", size: 10 }) ?? "", /PNG, JPEG ou WebP/);
  assert.match(imageFileProblem({ type: "image/gif", size: 10 }) ?? "", /PNG, JPEG ou WebP/);
  assert.match(imageFileProblem({ type: "toString", size: 10 }) ?? "", /PNG, JPEG ou WebP/, "pas de clé héritée de Object");
  assert.match(imageFileProblem({ type: "image/png", size: 0 }) ?? "", /vide/);
  assert.match(imageFileProblem({ type: "image/png", size: IMAGE_MAX_BYTES + 1 }) ?? "", /3 Mo/);
});

test("texte alternatif : obligatoire, nettoyé, borné", () => {
  assert.deepEqual(validateAlt("  Tableau de bord du cockpit \u0000"), { ok: true, value: "Tableau de bord du cockpit" });
  for (const empty of ["", "   ", "​﻿"]) assert.ok(!validateAlt(empty).ok, JSON.stringify(empty));
  assert.ok(validateAlt("é".repeat(IMAGE_ALT_MAX)).ok);
  assert.ok(!validateAlt("é".repeat(IMAGE_ALT_MAX + 1)).ok);
});

test("adresse publique du bucket", () => {
  assert.equal(publicImageUrl("https://x.supabase.co/", "a/b/c.png"), "https://x.supabase.co/storage/v1/object/public/portfolio/a/b/c.png");
});
