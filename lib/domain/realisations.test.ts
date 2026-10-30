import assert from "node:assert/strict";
import test from "node:test";

import { REALISATION_STACK_MAX, REALISATION_TAG_MAX, REALISATION_TITLE_MAX, parseStack, validateRealisationInput, type RealisationInput } from "./realisations.ts";

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
