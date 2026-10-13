import assert from "node:assert/strict";
import test from "node:test";

import { EMBEDDING_DIMENSIONS, parseEmbeddings, toBatches } from "./embeddings.ts";

const vec = (x: number) => Array.from({ length: EMBEDDING_DIMENSIONS }, () => x);

test("lots de 16 au plus, rien perdu, liste vide : aucun lot", () => {
  const items = Array.from({ length: 35 }, (_, i) => i);
  const batches = toBatches(items);
  assert.deepEqual(batches.map((b) => b.length), [16, 16, 3]);
  assert.deepEqual(batches.flat(), items);
  assert.deepEqual(toBatches([]), []);
});

test("réponse valide : vecteurs rendus dans l'ordre des index, même si la réponse est mélangée", () => {
  const out = parseEmbeddings({ data: [{ index: 1, embedding: vec(2) }, { index: 0, embedding: vec(1) }] }, 2);
  assert.equal(out[0][0], 1);
  assert.equal(out[1][0], 2);
});

test("réponse invalide : erreur sans écho du contenu", () => {
  const bad: unknown[] = [
    null,
    {},
    { data: [] },
    { data: [{ index: 0, embedding: vec(1) }] }, // 2 attendus
    { data: [{ index: 0, embedding: [1, 2, 3] }, { index: 1, embedding: vec(1) }] }, // mauvaise dimension
    { data: [{ index: 0, embedding: vec(1) }, { index: 0, embedding: vec(1) }] }, // index en double
    { data: [{ index: 0, embedding: vec(1) }, { index: 5, embedding: vec(1) }] }, // index hors plage
    { data: [{ index: 0, embedding: vec(1) }, { index: 1, embedding: [...vec(1).slice(1), "x"] }] },
  ];
  for (const json of bad) assert.throws(() => parseEmbeddings(json, 2), /inattendue/);
});
