import assert from "node:assert/strict";
import test from "node:test";

import { inventedNumbers, verifyCitations } from "./citations.ts";

test("citations valides : sans doublon, dans l'ordre", () => {
  assert.deepEqual(verifyCitations(["b", "a", "b"], ["a", "b", "c"]), ["b", "a"]);
  assert.deepEqual(verifyCitations([], ["a"]), [], "aucune citation : la réponse « les notes ne répondent pas » est permise");
});

test("une seule citation d'un extrait non envoyé : réponse rejetée", () => {
  assert.throws(() => verifyCitations(["a", "intrus"], ["a", "b"]), /non vérifiée/);
  assert.throws(() => verifyCitations(["x"], []), /non vérifiée/);
});

test("nombres présents dans les extraits : acceptés, quel que soit le format", () => {
  const extracts = ["Relance à 15 jours, mise en demeure à 30 jours.", "Forfait de 2 400 euros, remise de 7,5 %."];
  assert.deepEqual(inventedNumbers("- Relance à 15 jours. - Forfait de 2400 euros. - Remise de 7,5 %.", extracts), []);
});

test("un nombre qui ne figure nulle part est signalé", () => {
  assert.deepEqual(inventedNumbers("Le tarif est de 650 euros, soit 12,5 % de remise.", ["Un tarif sans chiffre."]), ["650", "12.5"]);
});

test("un nombre cité par la question est connu", () => {
  assert.deepEqual(inventedNumbers("Oui, 30 jours.", ["Délai de paiement."].concat(["Question : et après 30 jours ?"])), []);
});

test("petits entiers et décomptes ne comptent pas (« 3 étapes »), mais un décimal si", () => {
  assert.deepEqual(inventedNumbers("Il y a 3 étapes et 2 relances.", ["texte"]), []);
  assert.deepEqual(inventedNumbers("Compte 3,5 étapes.", ["texte"]), ["3.5"]);
});

test("aucun nombre : rien à signaler", () => {
  assert.deepEqual(inventedNumbers("Tes notes ne répondent pas.", []), []);
});
