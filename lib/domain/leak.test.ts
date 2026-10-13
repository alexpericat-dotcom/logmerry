import assert from "node:assert/strict";
import test from "node:test";

import { leakedFacts } from "./leak.ts";

test("un fait interdit présent est signalé, quelle que soit la casse ou la mise en forme du nombre", () => {
  assert.deepEqual(leakedFacts("Le tarif est de 2 400 euros.", ["2400"]), ["2400"]);
  assert.deepEqual(leakedFacts("LE TARIF EST DE 650 EUROS", ["650"]), ["650"]);
  assert.deepEqual(leakedFacts("remise de fidelite", ["fidélité"]), ["fidélité"], "accents ignorés");
  assert.deepEqual(leakedFacts("sur deux ans", ["deux ans"]), ["deux ans"]);
});

test("mots entiers : « 650 » n'est pas dans « 1650 » ni dans « 6500 »", () => {
  assert.deepEqual(leakedFacts("Il y a 1650 notes et 6500 lignes.", ["650"]), []);
  assert.deepEqual(leakedFacts("Environ 650.", ["650"]), ["650"]);
});

test("texte sans fait, liste interdite vide : rien à signaler", () => {
  assert.deepEqual(leakedFacts("Tes notes ne donnent pas cette information.", ["650", "fidélité"]), []);
  assert.deepEqual(leakedFacts("650", []), []);
});

test("caractères spéciaux dans un fait : pas d'erreur de motif", () => {
  assert.deepEqual(leakedFacts("coût (HT) : 12,5 %", ["(ht)", "12,5 %"]), ["(ht)", "12,5 %"]);
});
