import assert from "node:assert/strict";
import test from "node:test";

import { DEADLINE_CATEGORIES, DEADLINE_CATEGORY_LABELS, daysUntil, deadlineWhen, groupDeadlines, validateDeadlineInput } from "./deadlines.ts";

const TODAY = "2026-10-23";
const ok = { title: "Déclaration Urssaf du trimestre", due_on: "2026-10-31", category: "urssaf", source: "https://www.urssaf.fr/exemple", note: "" };
const keys = (r: ReturnType<typeof validateDeadlineInput>) => (r.ok ? [] : Object.keys(r.errors));

test("échéance valide : champs nettoyés, remarque vide = absente", () => {
  assert.deepEqual(validateDeadlineInput(ok), { ok: true, value: { title: "Déclaration Urssaf du trimestre", due_on: "2026-10-31", category: "urssaf", source: "https://www.urssaf.fr/exemple", note: null } });
  const r = validateDeadlineInput({ ...ok, title: "  CFE  ", source: "  https://impots.gouv.fr/cfe  ", note: "  à payer avant  " });
  assert.deepEqual(r.ok && [r.value.title, r.value.source, r.value.note], ["CFE", "https://impots.gouv.fr/cfe", "à payer avant"]);
});

test("les huit catégories existent avec leur libellé ; une autre valeur est refusée", () => {
  assert.equal(DEADLINE_CATEGORIES.length, 8);
  for (const c of DEADLINE_CATEGORIES) {
    assert.ok(DEADLINE_CATEGORY_LABELS[c], c);
    assert.equal(validateDeadlineInput({ ...ok, category: c }).ok, true, c);
  }
  for (const bad of ["", "autre", "URSSAF", "other"]) assert.deepEqual(keys(validateDeadlineInput({ ...ok, category: bad })), ["category"], bad);
});

test("titre : obligatoire, 200 caractères en points de code, NUL retiré", () => {
  for (const bad of ["", "   ", "\u0000", " \u0000 "]) assert.deepEqual(keys(validateDeadlineInput({ ...ok, title: bad })), ["title"], JSON.stringify(bad));
  assert.equal(validateDeadlineInput({ ...ok, title: "a".repeat(200) }).ok, true);
  assert.deepEqual(keys(validateDeadlineInput({ ...ok, title: "a".repeat(201) })), ["title"]);
  assert.equal(validateDeadlineInput({ ...ok, title: "😀".repeat(200) }).ok, true, "200 émojis = 200 caractères pour la base");
  const r = validateDeadlineInput({ ...ok, title: "Dé\u0000claration" });
  assert.equal(r.ok && r.value.title, "Déclaration");
});

test("date : obligatoire, doit exister, le passé est permis (obligation déjà dépassée)", () => {
  assert.deepEqual(keys(validateDeadlineInput({ ...ok, due_on: "" })), ["due_on"]);
  for (const bad of ["2026-02-30", "2027-02-29", "31/10/2026", "1899-12-31"]) assert.deepEqual(keys(validateDeadlineInput({ ...ok, due_on: bad })), ["due_on"], bad);
  assert.equal(validateDeadlineInput({ ...ok, due_on: "2020-01-01" }).ok, true, "passé permis");
  assert.equal(validateDeadlineInput({ ...ok, due_on: "2028-02-29" }).ok, true, "29 février bissextile");
});

test("source : lien https:// obligatoire, sans espace ; tout autre texte est refusé", () => {
  assert.deepEqual(keys(validateDeadlineInput({ ...ok, source: "" })), ["source"]);
  assert.deepEqual(keys(validateDeadlineInput({ ...ok, source: "   " })), ["source"]);
  for (const bad of ["http://www.urssaf.fr", "urssaf.fr", "Courrier de l'Urssaf du 3 octobre", "https://urssaf.fr/a b", "https://", "ftp://x.fr", "javascript:alert(1)", "https:// x", "HTTPS://URSSAF.FR"]) {
    assert.deepEqual(keys(validateDeadlineInput({ ...ok, source: bad })), ["source"], bad);
  }
  // Le motif est ancré au début et ne tolère ni saut de ligne, ni tabulation, ni texte autour : un lien noyé dans une phrase n'est pas une source.
  for (const bad of ["Courrier https://x.fr", "https://x.fr/a\nb", "https://x.fr/a\tb", "https://x.fr/a\u2028b", " \nhttps://x.fr/a b", "voir https://x.fr/a"]) {
    assert.deepEqual(keys(validateDeadlineInput({ ...ok, source: bad })), ["source"], JSON.stringify(bad));
  }
  assert.equal(validateDeadlineInput({ ...ok, source: "https://x.fr/ok\t" }).ok, true, "espaces et tabulations EN FIN de saisie sont retirés avant la validation (la base, elle, refuse la valeur brute : testé en isolation)");
  assert.equal(validateDeadlineInput({ ...ok, source: `https://x.fr/${"a".repeat(1987)}` }).ok, true, "2 000 caractères pile");
  assert.deepEqual(keys(validateDeadlineInput({ ...ok, source: `https://x.fr/${"a".repeat(1988)}` })), ["source"], "2 001");
});

test("remarque : 500 caractères en points de code, NUL retiré, vide = absente", () => {
  assert.equal(validateDeadlineInput({ ...ok, note: "n".repeat(500) }).ok, true);
  assert.deepEqual(keys(validateDeadlineInput({ ...ok, note: "n".repeat(501) })), ["note"]);
  assert.equal(validateDeadlineInput({ ...ok, note: "😀".repeat(500) }).ok, true);
  const empty = validateDeadlineInput({ ...ok, note: "\u0000 " });
  assert.equal(empty.ok && empty.value.note, null);
});

test("plusieurs erreurs à la fois : chaque champ sur sa clé", () => {
  assert.deepEqual(keys(validateDeadlineInput({ title: "", due_on: "", category: "", source: "", note: "" })).sort(), ["category", "due_on", "source", "title"]);
});

test("délai : jours de retard, aujourd'hui, dans N jours, singulier et pluriel, fin d'année et bissextile", () => {
  assert.equal(deadlineWhen("2026-10-22", TODAY), "en retard de 1 jour");
  assert.equal(deadlineWhen("2026-10-20", TODAY), "en retard de 3 jours");
  assert.equal(deadlineWhen(TODAY, TODAY), "aujourd'hui");
  assert.equal(deadlineWhen("2026-10-24", TODAY), "dans 1 jour");
  assert.equal(deadlineWhen("2026-10-31", TODAY), "dans 8 jours");
  assert.equal(daysUntil("2027-01-01", "2026-12-31"), 1);
  assert.equal(daysUntil("2028-03-01", "2028-02-28"), 2, "année bissextile");
  assert.equal(daysUntil("2027-03-01", "2027-02-28"), 1);
});

const row = (id: string, due_on: string, created_at = "2026-10-01", done_at: string | null = null) => ({ id, due_on, created_at, done_at });

test("sections : en retard (à faire, avant aujourd'hui), à venir (aujourd'hui compris), faites (jamais en retard)", () => {
  const rows = [
    row("a", "2026-10-22"), // hier : en retard
    row("b", "2026-10-23"), // aujourd'hui : à venir
    row("c", "2026-11-01"),
    row("d", "2026-09-01", "2026-10-01", "2026-10-10T08:00:00Z"), // faite, ancienne : pas en retard
    row("e", "2026-12-01", "2026-10-01", "2026-10-20T08:00:00Z"), // faite plus récemment, à venir mais faite
    row("f", "2026-09-15"), // plus ancienne en retard
  ];
  const g = groupDeadlines(rows, TODAY);
  assert.deepEqual(g.overdue.map((r) => r.id), ["f", "a"], "la plus ancienne d'abord");
  assert.deepEqual(g.upcoming.map((r) => r.id), ["b", "c"], "la plus proche d'abord, aujourd'hui compris");
  assert.deepEqual(g.done.map((r) => r.id), ["e", "d"], "les plus récemment faites d'abord");
  assert.equal(g.overdue.length + g.upcoming.length + g.done.length, rows.length, "chaque échéance dans une seule section");
});

test("sections : départage stable par date, création puis identifiant ; l'entrée n'est pas modifiée ; liste vide", () => {
  const rows = [row("z", "2026-11-01", "2026-10-02"), row("y", "2026-11-01", "2026-10-02"), row("x", "2026-11-01", "2026-10-01")];
  assert.deepEqual(groupDeadlines(rows, TODAY).upcoming.map((r) => r.id), ["x", "y", "z"]);
  assert.equal(rows[0].id, "z");
  assert.deepEqual(groupDeadlines([], TODAY), { overdue: [], upcoming: [], done: [] });
  const doneTie = [row("q", "2026-11-01", "2026-10-01", "2026-10-20T08:00:00Z"), row("p", "2026-11-01", "2026-10-01", "2026-10-20T08:00:00Z")];
  assert.deepEqual(groupDeadlines(doneTie, TODAY).done.map((r) => r.id), ["p", "q"], "faites au même instant : identifiant");
});

test("« Faites » : tri par instant réel, quel que soit le format de l'horodatage renvoyé par la base (Z, +00:00, microsecondes)", () => {
  const rows = [
    row("a", "2026-11-01", "2026-10-01", "2026-10-20T08:00:00+00:00"),
    row("b", "2026-11-01", "2026-10-01", "2026-10-20T08:00:00.500000+00:00"),
    row("c", "2026-11-01", "2026-10-01", "2026-10-20T08:00:01Z"),
    row("d", "2026-11-01", "2026-10-01", "2026-10-20T10:00:00+02:00"), // même instant que a
  ];
  assert.deepEqual(groupDeadlines(rows, TODAY).done.map((r) => r.id), ["c", "b", "a", "d"], "c (08:00:01) > b (08:00:00,5) > a = d (08:00:00, départage par identifiant)");
});

test("une échéance faite puis rouverte revient dans sa section d'origine", () => {
  const late = row("a", "2026-10-01");
  assert.deepEqual(groupDeadlines([{ ...late, done_at: "2026-10-22T08:00:00Z" }], TODAY).done.map((r) => r.id), ["a"]);
  assert.deepEqual(groupDeadlines([late], TODAY).overdue.map((r) => r.id), ["a"], "rouverte : de nouveau en retard");
});
