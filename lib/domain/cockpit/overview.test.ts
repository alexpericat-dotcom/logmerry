import assert from "node:assert/strict";
import test from "node:test";

import { cockpitKpis, deadlineDaysOfMonth, monthGrid, upcomingDeadlines } from "./overview.ts";

const TODAY = "2026-10-28";
const dl = (id: string, due_on: string, done_at: string | null = null) => ({ id, due_on, done_at });

test("échéances à venir : non faites, d'aujourd'hui en avant, triées, limitées, avec les jours restants", () => {
  const t = upcomingDeadlines([dl("c", "2026-11-05"), dl("a", TODAY), dl("old", "2026-10-27"), dl("done", "2026-10-30", "2026-10-29T08:00:00Z"), dl("b", "2026-10-30")], TODAY, 2);
  assert.deepEqual(t.map((x) => [x.id, x.days]), [["a", 0], ["b", 2]]);
  assert.deepEqual(upcomingDeadlines([], TODAY, 5), []);
});

test("chiffres-clés : clients, prospects, missions, devis envoyés, factures à encaisser (dont échues), échéances des 7 jours", () => {
  const k = cockpitKpis(
    {
      clients: [{ status: "client" }, { status: "client" }, { status: "prospect" }],
      missions: [{ status: "in_progress" }, { status: "planned" }, { status: "done" }, { status: "in_progress" }],
      quotes: [{ status: "sent" }, { status: "draft" }, { status: "accepted" }],
      invoices: [{ status: "unpaid", overdue: true }, { status: "partial", overdue: false }, { status: "paid", overdue: true }],
      deadlines: [{ due_on: "2026-11-02", done_at: null }, { due_on: "2026-11-05", done_at: null }, { due_on: TODAY, done_at: "2026-10-28T08:00:00Z" }, { due_on: "2026-10-01", done_at: null }],
    },
    TODAY,
  );
  assert.deepEqual(k, { clients: 2, prospects: 1, missionsInProgress: 2, missionsPlanned: 1, quotesSent: 1, invoicesToCollect: 2, invoicesOverdue: 1, deadlinesThisWeek: 1 });
});

test("grille du mois : octobre 2026 commence un jeudi, 31 jours, semaines du lundi, cases vides complétées", () => {
  const g = monthGrid("2026-10-28");
  assert.equal(g.label, "octobre 2026");
  assert.deepEqual(g.weeks[0], [null, null, null, 1, 2, 3, 4]);
  assert.deepEqual(g.weeks.at(-1), [26, 27, 28, 29, 30, 31, null]);
  assert.equal(g.weeks.flat().filter((d) => d !== null).length, 31);
  assert.ok(g.weeks.every((w) => w.length === 7));
  assert.deepEqual(monthGrid("2026-06-10").weeks[0], [1, 2, 3, 4, 5, 6, 7], "juin 2026 commence un lundi");
  assert.equal(monthGrid("2028-02-10").weeks.flat().filter((d) => d !== null).length, 29, "année bissextile");
});

test("échéances des 7 jours : aujourd'hui et les 6 suivants ; le 7e jour suivant et les faites exclus", () => {
  const k = (due_on: string, done_at: string | null = null) => cockpitKpis({ clients: [], missions: [], quotes: [], invoices: [], deadlines: [{ due_on, done_at }] }, TODAY).deadlinesThisWeek;
  assert.deepEqual([k(TODAY), k("2026-11-03"), k("2026-11-04"), k("2026-10-27"), k("2026-10-30", "2026-10-29T08:00:00Z")], [1, 1, 0, 0, 0]);
});

test("à venir : à date égale, l'identifiant départage", () => {
  assert.deepEqual(upcomingDeadlines([dl("b", "2026-10-30"), dl("a", "2026-10-30")], TODAY, 5).map((x) => x.id), ["a", "b"]);
});

test("points du calendrier : échéances ouvertes du mois par jour, deux le même jour = 2, faites et autres mois exclues", () => {
  const m = deadlineDaysOfMonth([dl("a", "2026-10-30"), dl("b", "2026-10-30"), dl("c", "2026-10-05"), dl("done", "2026-10-06", "2026-10-06T08:00:00Z"), dl("next", "2026-11-02"), dl("old", "2026-09-30")], TODAY);
  assert.deepEqual([...m.entries()].sort((x, y) => x[0] - y[0]), [[5, 1], [30, 2]]);
});
