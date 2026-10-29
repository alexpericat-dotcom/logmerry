import assert from "node:assert/strict";
import test from "node:test";

import { describedBy, errorSummaryItems, fieldId, fieldProps, summaryTitle } from "./form.ts";

test("identifiant d'un champ : préfixe et clé, ou la clé seule sans préfixe", () => {
  assert.equal(fieldId("new", "title"), "new-title");
  assert.equal(fieldId(undefined, "name"), "name");
  assert.equal(fieldId("", "name"), "name");
});

test("attributs d'un champ : sans erreur, ni aria-invalid ni aria-describedby ; avec erreur, les deux, reliés à la ligne d'erreur", () => {
  assert.deepEqual(fieldProps("new", "title", undefined), { id: "new-title", name: "title", "aria-invalid": undefined, "aria-describedby": undefined });
  assert.deepEqual(fieldProps("new", "title", "Saisis le titre."), { id: "new-title", name: "title", "aria-invalid": true, "aria-describedby": "new-title-error" });
  assert.deepEqual(fieldProps(undefined, "name", "Saisis le nom."), { id: "name", name: "name", "aria-invalid": true, "aria-describedby": "name-error" });
});

test("valeur par défaut : présente seulement si elle est donnée (une chaîne vide est une valeur)", () => {
  assert.equal("defaultValue" in fieldProps("p", "k", undefined), false);
  assert.equal(fieldProps("p", "k", undefined, "").defaultValue, "");
  assert.equal(fieldProps("p", "k", "err", "x").defaultValue, "x");
});

test("aria-describedby de plusieurs descriptions : l'erreur ET l'aide ; absentes ignorées ; rien = undefined", () => {
  assert.equal(describedBy("a-error", "a-help"), "a-error a-help");
  assert.equal(describedBy(undefined, "a-help"), "a-help");
  assert.equal(describedBy("a-error", false), "a-error");
  assert.equal(describedBy(undefined, null, false), undefined);
});

test("récapitulatif : une ligne par erreur, dans l'ordre des clés, identifiants des champs ; messages vides ignorés ; rien = vide", () => {
  assert.deepEqual(errorSummaryItems({ title: "Saisis le titre.", due_on: "Saisis la date.", note: undefined, source: "" }, "new"), [
    { key: "title", id: "new-title", message: "Saisis le titre." },
    { key: "due_on", id: "new-due_on", message: "Saisis la date." },
  ]);
  assert.deepEqual(errorSummaryItems({ name: "Saisis le nom." }), [{ key: "name", id: "name", message: "Saisis le nom." }]);
  assert.deepEqual(errorSummaryItems(undefined), []);
  assert.deepEqual(errorSummaryItems({}), []);
});

test("titre du récapitulatif : singulier et pluriel", () => {
  assert.equal(summaryTitle(1), "1 erreur à corriger");
  assert.equal(summaryTitle(2), "2 erreurs à corriger");
  assert.equal(summaryTitle(11), "11 erreurs à corriger");
});
