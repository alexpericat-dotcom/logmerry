import assert from "node:assert/strict";
import test from "node:test";

import { CHUNK_MAX, CHUNK_OVERLAP, chunkNote } from "./chunking.ts";

const size = (s: string) => [...s].length;
const words = (n: number) => Array.from({ length: n }, (_, i) => `mot${i}`).join(" ");

test("texte vide ou d'espaces : aucun extrait", () => {
  for (const body of ["", "   ", "\n\n \t\n"]) assert.deepEqual(chunkNote(body), []);
});

test("texte court : un seul extrait, espaces retirés aux bords", () => {
  assert.deepEqual(chunkNote("  Bonjour\r\nle monde  "), [{ index: 0, content: "Bonjour\nle monde" }]);
});

test("texte long : plusieurs extraits, tous de taille bornée, indices qui se suivent", () => {
  const chunks = chunkNote(words(1500));
  assert.ok(chunks.length > 3);
  chunks.forEach((c, i) => {
    assert.equal(c.index, i);
    assert.ok(size(c.content) <= CHUNK_MAX && size(c.content) > 0);
  });
});

test("chevauchement : le début d'un extrait se retrouve à la fin du précédent", () => {
  const chunks = chunkNote(words(1500));
  for (let i = 1; i < chunks.length; i++) {
    const head = chunks[i].content.slice(0, 30);
    assert.ok(chunks[i - 1].content.includes(head), `extrait ${i} ne chevauche pas le précédent`);
    const overlap = chunks[i - 1].content.length - chunks[i - 1].content.indexOf(head);
    assert.ok(overlap <= CHUNK_OVERLAP + 1 && overlap >= CHUNK_OVERLAP - 20, `chevauchement de ${overlap} caractères`);
  }
});

test("couverture : aucun mot du texte n'est perdu", () => {
  const chunks = chunkNote(words(1500));
  const seen = new Set(chunks.flatMap((c) => c.content.split(" ")));
  for (let i = 0; i < 1500; i++) assert.ok(seen.has(`mot${i}`), `mot${i} manquant`);
});

test("coupe de préférence à un saut de paragraphe", () => {
  const para = (c: string) => `${c.repeat(600)}`;
  const chunks = chunkNote(`${para("a")}\n\n${para("b")}`);
  assert.equal(chunks[0].content, "a".repeat(600));
});

test("texte sans espace : coupe franche, la fonction se termine", () => {
  const chunks = chunkNote("x".repeat(5000));
  assert.ok(chunks.length >= 5);
  assert.ok(chunks.every((c) => size(c.content) <= CHUNK_MAX));
});

test("les emoji simples ne sont pas coupés en deux", () => {
  const chunks = chunkNote("😀".repeat(2500));
  assert.ok(chunks.length > 2);
  assert.ok(chunks.every((c) => size(c.content) <= CHUNK_MAX && !/[\uD800-\uDFFF]/u.test(c.content)));
});

test("coupe de préférence à une fin de phrase, puis à un espace", () => {
  const sentence = "Une phrase de taille moyenne qui se termine ici. ";
  const chunks = chunkNote(sentence.repeat(60));
  assert.ok(chunks.slice(0, -1).every((c) => c.content.endsWith("ici.")));
});

test("note de la taille maximale (50 000 caractères) : se termine et donne des dizaines d'extraits", () => {
  const chunks = chunkNote(words(8000).slice(0, 50_000));
  assert.ok(chunks.length > 40);
});
