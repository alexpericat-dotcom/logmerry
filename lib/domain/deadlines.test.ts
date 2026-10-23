import assert from "node:assert/strict";
import test from "node:test";

import { DEADLINE_CATEGORIES, DEADLINE_CATEGORY_LABELS, daysUntil, deadlineWhen, groupDeadlines, validateDeadlineInput as validate, type DeadlineInput } from "./deadlines.ts";

const TODAY = "2026-10-23";
const ok: DeadlineInput = { title: "Déclaration Urssaf du trimestre", due_on: "2026-10-31", category: "urssaf", source: "https://www.urssaf.fr/exemple", note: "", priority: "", recurrence: "" };
const validateDeadlineInput = (input: DeadlineInput) => validate(input, TODAY);
const keys = (r: ReturnType<typeof validateDeadlineInput>) => (r.ok ? [] : Object.keys(r.errors));

test("échéance valide : champs nettoyés, remarque vide = absente", () => {
  assert.deepEqual(validateDeadlineInput(ok), { ok: true, value: { title: "Déclaration Urssaf du trimestre", due_on: "2026-10-31", category: "urssaf", source: "https://www.urssaf.fr/exemple", note: null, priority: "normal", recurrence: null } });
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
  assert.deepEqual(keys(validateDeadlineInput({ title: "", due_on: "", category: "", source: "", note: "", priority: "", recurrence: "" })).sort(), ["category", "due_on", "source", "title"]);
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

// ---- Story 5.1b ----------------------------------------------------------------------------------------------------------------

import { addMonths, inView, invoiceLines, missingOccurrences, parseDeadlineView, seriesDates, toConfirmLines, type SeriesRow } from "./deadlines.ts";

test("priorité : « normale » si vide, sinon une des trois ; récurrence : vide ou une des trois", () => {
  const r = validateDeadlineInput({ ...ok, priority: "high", recurrence: "quarterly" });
  assert.deepEqual(r.ok && [r.value.priority, r.value.recurrence], ["high", "quarterly"]);
  assert.deepEqual(keys(validateDeadlineInput({ ...ok, priority: "urgent" })), ["priority"]);
  assert.deepEqual(keys(validateDeadlineInput({ ...ok, recurrence: "weekly" })), ["recurrence"]);
});

test("récurrence : la première date ne dépasse pas un an dans le futur (sinon aucune occurrence ne serait créée)", () => {
  assert.equal(validateDeadlineInput({ ...ok, due_on: "2027-10-23", recurrence: "yearly" }).ok, true);
  assert.deepEqual(keys(validateDeadlineInput({ ...ok, due_on: "2027-10-24", recurrence: "yearly" })), ["due_on"]);
  assert.equal(validateDeadlineInput({ ...ok, due_on: "2030-01-01" }).ok, true, "sans récurrence : permis");
});

test("récurrence : la première date ne remonte pas à plus d'un an ; sans récurrence le passé reste permis", () => {
  assert.equal(validateDeadlineInput({ ...ok, due_on: "2025-10-23", recurrence: "monthly" }).ok, true);
  assert.deepEqual(keys(validateDeadlineInput({ ...ok, due_on: "2025-10-22", recurrence: "monthly" })), ["due_on"]);
  assert.equal(validateDeadlineInput({ ...ok, due_on: "2020-01-01" }).ok, true);
});

test("addMonths : fin de mois ramenée au dernier jour, année bissextile, passage d'année", () => {
  assert.equal(addMonths("2026-01-31", 1), "2026-02-28");
  assert.equal(addMonths("2028-01-31", 1), "2028-02-29");
  assert.equal(addMonths("2026-11-15", 3), "2027-02-15");
  assert.equal(addMonths("2026-10-23", -12), "2025-10-23");
  assert.equal(addMonths("2026-01-01", 12), "2027-01-01");
});

test("série mensuelle du 31 janvier : jour visé 31, pas de dérive (28 févr., 31 mars, 30 avr.)", () => {
  const d = seriesDates("2026-01-31", "monthly", 31, "2026-05-31");
  assert.deepEqual(d, ["2026-01-31", "2026-02-28", "2026-03-31", "2026-04-30", "2026-05-31"]);
});

test("série trimestrielle et annuelle", () => {
  assert.deepEqual(seriesDates("2026-10-31", "quarterly", 31, "2027-10-31"), ["2026-10-31", "2027-01-31", "2027-04-30", "2027-07-31", "2027-10-31"]);
  assert.deepEqual(seriesDates("2028-02-29", "yearly", 29, "2030-12-31"), ["2028-02-29", "2029-02-28", "2030-02-28"]);
});

const srow = (due_on: string, extra: Partial<SeriesRow> = {}): SeriesRow => ({
  series_id: "s1", recurrence: "monthly", series_day: 15, due_on, title: "Urssaf", category: "urssaf", source: "https://x.fr/a", note: null, priority: "normal", ...extra,
});

test("complétion : les occurrences manquantes jusqu'à +12 mois, une seule fois, copiées de la dernière", () => {
  const rows = [srow("2026-10-15"), srow("2026-11-15", { title: "Urssaf (modifié)", priority: "high" })];
  const added = missingOccurrences(rows, "2026-10-23");
  assert.equal(added.length, 11, "du 15/12/2026 au 15/10/2027");
  assert.equal(added[0].due_on, "2026-12-15");
  assert.equal(added.at(-1)?.due_on, "2027-10-15");
  assert.ok(added.every((a) => a.title === "Urssaf (modifié)" && a.priority === "high" && a.series_id === "s1"));
  // Rejouer avec les lignes ajoutées ne crée plus rien.
  assert.equal(missingOccurrences([...rows, ...added.map((a) => srow(a.due_on))], "2026-10-23").length, 0);
});

test("complétion : une série supprimée (récurrence nulle) et une échéance isolée ne génèrent rien", () => {
  assert.equal(missingOccurrences([srow("2026-10-15", { recurrence: null, series_day: null })], "2026-10-23").length, 0);
  assert.equal(missingOccurrences([srow("2026-10-15", { series_id: null })], "2026-10-23").length, 0);
});

test("vues : aujourd'hui, semaine (jusqu'au dimanche), mois, retard ; les faites seulement dans « Toutes »", () => {
  const t = "2026-10-23"; // vendredi
  const todo = (due_on: string) => ({ due_on, done: false });
  assert.equal(inView("aujourd-hui", todo(t), t), true);
  assert.equal(inView("aujourd-hui", todo("2026-10-24"), t), false);
  assert.equal(inView("semaine", todo("2026-10-25"), t), true, "dimanche");
  assert.equal(inView("semaine", todo("2026-10-26"), t), false, "lundi suivant");
  assert.equal(inView("semaine", todo("2026-10-22"), t), false, "hier : en retard");
  assert.equal(inView("mois", todo("2026-10-31"), t), true);
  assert.equal(inView("mois", todo("2026-11-01"), t), false);
  assert.equal(inView("retard", todo("2026-10-22"), t), true);
  assert.equal(inView("retard", todo(t), t), false);
  assert.equal(inView("retard", { due_on: "2026-10-01", done: true }, t), false);
  assert.equal(inView("toutes", { due_on: "2026-10-01", done: true }, t), true);
  assert.equal(inView("semaine", todo("2026-10-25"), "2026-10-25"), true, "un dimanche : la semaine finit aujourd'hui");
  assert.equal(parseDeadlineView("semaine"), "semaine");
  assert.equal(parseDeadlineView("n'importe quoi"), "toutes");
  assert.equal(parseDeadlineView(undefined), "toutes");
});

test("lignes de factures : à émettre (sans émission), à relancer (émise, non soldée, échue), rien si payée", () => {
  const inv = (id: string, extra: object) => ({ id, reference: null, issued_on: "2026-10-01", due_on: "2026-10-30", status: "unpaid" as const, mission: { title: "Mission A" }, ...extra });
  const lines = invoiceLines(
    [
      inv("a", { issued_on: null }),
      inv("b", { due_on: "2026-10-20", status: "partial" }),
      inv("c", { due_on: "2026-10-20", status: "paid" }),
      inv("d", {}),
      inv("e", { issued_on: null, status: "paid" }),
    ],
    TODAY,
  );
  assert.deepEqual(lines.map((l) => [l.kind, l.due_on]), [["invoice_issue", "2026-10-30"], ["invoice_chase", "2026-10-20"]]);
  assert.equal(lines[1].detail, "en retard de 3 jours");
});

test("« À confirmer » : sans date, avec la raison ; masquée par une échéance saisie ; omise selon le profil", () => {
  const none = toConfirmLines(null, []);
  assert.deepEqual(none.map((l) => l.key), ["confirm-urssaf", "confirm-france_travail", "confirm-vat", "confirm-cfe"]);
  assert.ok(none.every((l) => l.due_on === null));
  assert.match(none[0].detail, /profil/);
  assert.match(none[3].detail, /Aucune règle de calendrier vérifiée/);
  const profile = { alert_thresholds: [90], urssaf_frequency: "quarterly", urssaf_frequency_confirmed_at: "2026-10-01T00:00:00Z", job_seeker: "not_registered", vat_regime: "franchise" };
  const some = toConfirmLines(profile, [{ category: "cfe" }]);
  assert.deepEqual(some.map((l) => l.key), ["confirm-urssaf"], "France Travail et TVA omises, CFE saisie");
  assert.match(some[0].detail, /Aucune règle de calendrier vérifiée/, "profil renseigné : la règle manque, pas le profil");
});
