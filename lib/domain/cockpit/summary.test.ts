import assert from "node:assert/strict";
import test from "node:test";

import { draftSummary } from "./summary.ts";

test("aucun brouillon : pas de ligne", () => {
  assert.equal(draftSummary([]), null);
});

test("un brouillon : singulier, « procédure » seulement si c'en est une", () => {
  assert.equal(draftSummary(["procedure"]), "1 procédure à documenter");
  assert.equal(draftSummary(["faq"]), "1 brouillon à documenter");
});

test("plusieurs brouillons : pluriel ; « procédures » seulement si tous en sont", () => {
  assert.equal(draftSummary(["procedure", "procedure"]), "2 procédures à documenter");
  assert.equal(draftSummary(["procedure", "note", "template"]), "3 brouillons à documenter");
});
