import assert from "node:assert/strict";
import test from "node:test";

import { REALISATION_CLIENT_NAME_MAX, REALISATION_DESCRIPTION_MAX, REALISATION_ORIGINS, REALISATION_ORIGIN_LABELS, REALISATION_RESULT_MAX, REALISATION_SECTOR_MAX, REALISATION_STACK_MAX, REALISATION_TAG_MAX, REALISATION_TITLE_MAX, parseStack, validateRealisationInput, type RealisationInput } from "./realisations.ts";

const base: RealisationInput = { title: "Assistant RAG", description: "Un assistant qui cite ses sources.", origin: "demo", client_name: "", client_sector: "", result_figure: "", stack: "" };

test("création minimale : champs facultatifs vides → null, pile vide", () => {
  assert.deepEqual(validateRealisationInput(base), {
    ok: true,
    value: { title: "Assistant RAG", description: "Un assistant qui cite ses sources.", origin: "demo", client_name: null, client_sector: null, result_figure: null, stack: [] },
  });
});

test("textes nettoyés (espaces, caractère nul)", () => {
  const r = validateRealisationInput({ ...base, title: "  Titre \u0000 ", client_name: "  Atelier  ", stack: " a ,b " });
  assert.ok(r.ok);
  if (r.ok) assert.deepEqual([r.value.title, r.value.client_name, r.value.stack], ["Titre", "Atelier", ["a", "b"]]);
});

test("titre, description et origine obligatoires : erreurs nommant le champ", () => {
  const r = validateRealisationInput({ ...base, title: "  ", description: "", origin: "autre" });
  assert.ok(!r.ok);
  if (!r.ok) assert.deepEqual(Object.keys(r.errors).sort(), ["description", "origin", "title"]);
});

test("longueurs comptées en points de code, comme la base", () => {
  assert.ok(validateRealisationInput({ ...base, title: "😀".repeat(REALISATION_TITLE_MAX) }).ok);
  assert.ok(!validateRealisationInput({ ...base, title: "😀".repeat(REALISATION_TITLE_MAX + 1) }).ok);
  assert.ok(!validateRealisationInput({ ...base, description: "x".repeat(601) }).ok);
  assert.ok(!validateRealisationInput({ ...base, client_sector: "x".repeat(101) }).ok);
  assert.ok(!validateRealisationInput({ ...base, result_figure: "x".repeat(201) }).ok);
});

test("pile : vides et doublons ignorés, limites d'étiquettes", () => {
  assert.deepEqual(parseStack("Next.js, supabase ,, next.js"), ["Next.js", "supabase"]);
  const many = Array.from({ length: REALISATION_STACK_MAX + 1 }, (_, i) => `t${i}`).join(",");
  const tooMany = validateRealisationInput({ ...base, stack: many });
  assert.ok(!tooMany.ok && tooMany.errors.stack);
  assert.ok(validateRealisationInput({ ...base, stack: many.split(",").slice(0, REALISATION_STACK_MAX).join(",") }).ok);
  assert.ok(!validateRealisationInput({ ...base, stack: "x".repeat(REALISATION_TAG_MAX + 1) }).ok);
});

test("texte piégé gardé tel quel (jamais interprété par le domaine)", () => {
  const r = validateRealisationInput({ ...base, title: "<script>alert(1)</script>" });
  assert.ok(r.ok && r.value.title === "<script>alert(1)</script>");
});

test("chaque origine est acceptée et a son étiquette (l'enum SQL en a les mêmes quatre)", () => {
  assert.deepEqual([...REALISATION_ORIGINS], ["real_client", "training", "friend", "demo"]);
  for (const origin of REALISATION_ORIGINS) {
    assert.ok(validateRealisationInput({ ...base, origin }).ok, origin);
    assert.ok(REALISATION_ORIGIN_LABELS[origin], origin);
  }
});

test("bornes exactes : le maximum passe, un de plus est refusé, pour chaque champ", () => {
  const cases: [keyof RealisationInput, number][] = [
    ["title", REALISATION_TITLE_MAX],
    ["description", REALISATION_DESCRIPTION_MAX],
    ["client_name", REALISATION_CLIENT_NAME_MAX],
    ["client_sector", REALISATION_SECTOR_MAX],
    ["result_figure", REALISATION_RESULT_MAX],
    ["stack", REALISATION_TAG_MAX],
  ];
  for (const [key, max] of cases) {
    assert.ok(validateRealisationInput({ ...base, [key]: "x".repeat(max) }).ok, `${key} = ${max}`);
    const over = validateRealisationInput({ ...base, [key]: "x".repeat(max + 1) });
    assert.ok(!over.ok && over.errors[key], `${key} = ${max + 1}`);
  }
});

test("retours à la ligne comptés pour un seul caractère ; caractères invisibles retirés", () => {
  const withBreaks = "x\r\n".repeat(300).trimEnd();
  const r = validateRealisationInput({ ...base, description: withBreaks });
  assert.ok(r.ok && !r.value.description.includes("\r") && [...r.value.description].length === 599);
  const invisible = validateRealisationInput({ ...base, title: "\u200B\uFEFF " });
  assert.ok(!invisible.ok && invisible.errors.title);
});
