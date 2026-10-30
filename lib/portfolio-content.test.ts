import assert from "node:assert/strict";
import test from "node:test";

import * as content from "./portfolio-content.ts";

const texts = JSON.stringify(content);

test("aucun tarif, montant ni chiffre promis dans les textes publics (formules sans prix)", () => {
  assert.ok(!/[€$£]|\beuros?\b|\bHT\b|\bTTC\b|\d/.test(texts.replace(/\d{4}/g, "").replace(CONTACT_EMAIL_RE, "")), "chiffre ou montant dans les textes");
});

test("aucun « À confirmer » ni marque de brouillon visible du public", () => {
  assert.ok(!/à confirmer|lorem|todo|xxx/i.test(texts));
});

test("vouvoiement : pas de tutoiement dans les textes", () => {
  assert.ok(!/\b(tu|ton|ta|tes|toi)\b/i.test(JSON.stringify([content.HERO, content.SERVICES, content.PROCESS, content.BENEFITS, content.SHOWCASE, content.CONTACT])));
});

test("quatre formules, cinq étapes, quatre apports, chacun avec un titre et un texte", () => {
  assert.equal(content.SERVICES.items.length, 4);
  assert.equal(content.PROCESS.steps.length, 5);
  assert.equal(content.BENEFITS.items.length, 4);
  for (const x of [...content.SERVICES.items, ...content.PROCESS.steps, ...content.BENEFITS.items]) assert.ok(x.title.trim() && x.text.trim());
});

test("l'adresse de contact est celle donnée par Alex", () => {
  assert.equal(content.CONTACT_EMAIL, "alexandre.pericat@gmail.com");
});

const CONTACT_EMAIL_RE = /alexandre\.pericat@gmail\.com/g;
