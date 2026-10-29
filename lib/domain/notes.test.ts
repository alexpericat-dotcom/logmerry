import assert from "node:assert/strict";
import test from "node:test";

import {
  BODY_MAX,
  TITLE_MAX,
  excerpt,
  isUuid,
  parseTypeFilter,
  parseStatusFilter,
  draftTitle,
  DRAFT_TITLE_PREFIX,
  validateNoteInput,
  notesFilterQuery,
  notesListHref,
  parseListFilter,
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

test("filtre brouillons : seulement « brouillon »", () => {
  assert.equal(parseStatusFilter("brouillon"), "draft");
  assert.equal(parseStatusFilter(["brouillon", "x"]), "draft");
  for (const v of [undefined, "", "actif", "draft"]) assert.equal(parseStatusFilter(v), null);
});

test("titre d'une note à documenter : préfixe et question, espaces réduits, 200 caractères au plus", () => {
  assert.equal(draftTitle("  Quel   est le tarif de Gamma ? "), "À documenter : Quel est le tarif de Gamma ?");
  const long = draftTitle("é".repeat(500));
  assert.equal([...long].length, TITLE_MAX);
  assert.ok(long.startsWith(DRAFT_TITLE_PREFIX) && long.endsWith("…"));
  assert.ok(validateNoteInput({ type: "note", title: long, body: "" }).ok, "le titre passe la validation d'une note");
});

test("filtre de la liste : relu par les analyseurs existants, valeurs connues seulement ; brouillons avant type", () => {
  assert.deepEqual(parseListFilter("procedure", undefined), { type: "procedure", draft: false });
  assert.deepEqual(parseListFilter(undefined, "brouillon"), { type: null, draft: true });
  assert.deepEqual(parseListFilter("faq", "brouillon"), { type: null, draft: true });
  assert.deepEqual(parseListFilter(["template", "x"], null), { type: "template", draft: false });
  for (const bad of ["<script>", "https://evil.example", "/notes?x=1", "PROCEDURE", "", "procedure ", null, undefined]) {
    assert.deepEqual(parseListFilter(bad, bad), { type: null, draft: false }, String(bad));
  }
  assert.deepEqual(parseListFilter(undefined, "Brouillon"), { type: null, draft: false });
});

test("adresses de la liste et requête suivie par une note : jamais autre chose que `/notes` et un filtre connu", () => {
  assert.equal(notesListHref({ type: null, draft: false }), "/notes");
  assert.equal(notesListHref({ type: "procedure", draft: false }), "/notes?type=procedure");
  assert.equal(notesListHref({ type: null, draft: true }), "/notes?statut=brouillon");
  assert.equal(notesFilterQuery({ type: null, draft: false }), "");
  assert.equal(notesFilterQuery({ type: "faq", draft: false }), "?type=faq");
  assert.equal(notesFilterQuery({ type: null, draft: true }), "?statut=brouillon");
  for (const t of ["note", "procedure", "template", "faq"] as const) assert.equal(notesListHref(parseListFilter(notesFilterQuery({ type: t, draft: false }).slice(6), undefined)), `/notes?type=${t}`);
});
