import assert from "node:assert/strict";
import test from "node:test";

import { BODY_MAX, TITLE_MAX, excerpt, validateNoteInput } from "./notes.ts";

test("titre vide ou d'espaces : refusé avec un message qui nomme le titre", () => {
  for (const title of ["", "   "]) {
    const r = validateNoteInput({ title, body: "texte" });
    assert.equal(r.ok, false);
    if (!r.ok) assert.match(r.errors.title!, /titre/);
  }
});

test("titre trop long : refusé", () => {
  const r = validateNoteInput({ title: "x".repeat(TITLE_MAX + 1), body: "" });
  assert.equal(r.ok, false);
});

test("titre valide : espaces retirés, texte vide accepté", () => {
  const r = validateNoteInput({ title: "  Rendez-vous X  ", body: "" });
  assert.deepEqual(r, { ok: true, value: { title: "Rendez-vous X", body: "" } });
});

test("excerpt : une ligne, tronqué avec des points de suspension", () => {
  assert.equal(excerpt("a\n\nb   c"), "a b c");
  assert.equal(excerpt("x".repeat(200), 10), `${"x".repeat(10)}…`);
  assert.equal(excerpt(""), "");
});

test("titre compté en points de code : 200 emoji passent, 201 non", () => {
  assert.equal(validateNoteInput({ title: "😀".repeat(TITLE_MAX), body: "" }).ok, true);
  assert.equal(validateNoteInput({ title: "😀".repeat(TITLE_MAX + 1), body: "" }).ok, false);
});

test("texte trop long : refusé avec un message qui nomme le texte", () => {
  const r = validateNoteInput({ title: "ok", body: "x".repeat(BODY_MAX + 1) });
  assert.equal(r.ok, false);
  if (!r.ok) assert.match(r.errors.body!, /texte/);
});

test("caractère nul retiré du titre et du texte", () => {
  const r = validateNoteInput({ title: "a\u0000b", body: "c\u0000d" });
  assert.deepEqual(r, { ok: true, value: { title: "ab", body: "cd" } });
});

test("excerpt : ne coupe pas un emoji en deux", () => {
  assert.equal(excerpt("😀😀😀", 2), "😀😀…");
});
