import assert from "node:assert/strict";
import test from "node:test";

import {
  BODY_MAX,
  TITLE_MAX,
  excerpt,
  isUuid,
  parseTypeFilter,
  validateNoteInput,
} from "./notes.ts";

test("titre vide ou d'espaces : refusé avec un message qui nomme le titre", () => {
  for (const title of ["", "   "]) {
    const r = validateNoteInput({ type: "note", title, body: "texte" });
    assert.equal(r.ok, false);
    if (!r.ok) assert.match(r.errors.title!, /titre/);
  }
});

test("titre trop long : refusé", () => {
  const r = validateNoteInput({ type: "note", title: "x".repeat(TITLE_MAX + 1), body: "" });
  assert.equal(r.ok, false);
});

test("titre valide : espaces retirés, texte vide accepté", () => {
  const r = validateNoteInput({ type: "note", title: "  Rendez-vous X  ", body: "" });
  assert.deepEqual(r, { ok: true, value: { title: "Rendez-vous X", body: "", type: "note" } });
});

test("excerpt : une ligne, tronqué avec des points de suspension", () => {
  assert.equal(excerpt("a\n\nb   c"), "a b c");
  assert.equal(excerpt("x".repeat(200), 10), `${"x".repeat(10)}…`);
  assert.equal(excerpt(""), "");
});

test("titre compté en points de code : 200 emoji passent, 201 non", () => {
  assert.equal(validateNoteInput({ type: "note", title: "😀".repeat(TITLE_MAX), body: "" }).ok, true);
  assert.equal(validateNoteInput({ type: "note", title: "😀".repeat(TITLE_MAX + 1), body: "" }).ok, false);
});

test("texte trop long : refusé avec un message qui nomme le texte", () => {
  const r = validateNoteInput({ type: "note", title: "ok", body: "x".repeat(BODY_MAX + 1) });
  assert.equal(r.ok, false);
  if (!r.ok) assert.match(r.errors.body!, /texte/);
});

test("caractère nul retiré du titre et du texte", () => {
  const r = validateNoteInput({ type: "note", title: "a\u0000b", body: "c\u0000d" });
  assert.deepEqual(r, { ok: true, value: { title: "ab", body: "cd", type: "note" } });
});

test("excerpt : ne coupe pas un emoji en deux", () => {
  assert.equal(excerpt("😀😀😀", 2), "😀😀…");
});

test("type : valeur inconnue refusée avec un message qui nomme le type", () => {
  const r = validateNoteInput({ title: "ok", body: "", type: "autre" });
  assert.equal(r.ok, false);
  if (!r.ok) assert.match(r.errors.type!, /type/);
  assert.equal(validateNoteInput({ title: "ok", body: "", type: "faq" }).ok, true);
});

test("filtre de la liste : valeur connue conservée, inconnue = toutes", () => {
  assert.equal(parseTypeFilter("procedure"), "procedure");
  assert.equal(parseTypeFilter(["faq", "note"]), "faq");
  assert.equal(parseTypeFilter("nimporte"), null);
  assert.equal(parseTypeFilter(undefined), null);
});

test("isUuid : accepte un uuid, refuse le reste", () => {
  assert.equal(isUuid("0b6b1f0e-3c1a-4a77-9d0f-5a1f6f1d2b3c"), true);
  assert.equal(isUuid("abc"), false);
  assert.equal(isUuid("0b6b1f0e-3c1a-4a77-9d0f-5a1f6f1d2b3c'; drop"), false);
});
