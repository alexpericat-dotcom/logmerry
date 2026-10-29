import assert from "node:assert/strict";
import test from "node:test";

import type { CeilingResult } from "../finance/ceilings.ts";
import { bannerDescription, invoiceViews, quotesWithParisDay, sprintsWithParisDay, taskProgress, topCeiling } from "./assembly.ts";

const TODAY = "2026-10-23";
const inv = (id: string, due_on: string, payments: { amount_ht_cents: number; tax_cents: number | null }[] = [], amount_ht_cents = 10_000) =>
  ({ id, reference: `F-${id}`, due_on, amount_ht_cents, tax_cents: null, mission: { title: `M${id}` }, payments });

test("factures : statut par le solde, « échue » seulement si non payée et échéance passée, solde calculé pour les deux formes", () => {
  const { forTasks, rows } = invoiceViews(
    [
      inv("1", "2026-10-01"), // impayée, échue
      inv("2", "2026-10-30"), // impayée, pas échue
      inv("3", "2026-10-01", [{ amount_ht_cents: 4_000, tax_cents: null }]), // partielle, échue
      inv("4", "2026-10-01", [{ amount_ht_cents: 10_000, tax_cents: null }]), // payée : jamais échue
    ],
    TODAY,
  );
  assert.deepEqual(rows, [
    { status: "unpaid", overdue: true },
    { status: "unpaid", overdue: false },
    { status: "partial", overdue: true },
    { status: "paid", overdue: false },
  ]);
  assert.deepEqual(forTasks[0], { id: "1", reference: "F-1", due_on: "2026-10-01", status: "unpaid", mission: { title: "M1" } });
  assert.deepEqual(forTasks.map((f) => f.status), rows.map((r) => r.status));
  assert.ok(!("payments" in forTasks[0]) && !("amount_ht_cents" in forTasks[0]));
});

test("factures : taxe connue (base TTC), trop-perçu, référence absente", () => {
  const taxed = { ...inv("5", "2026-10-01", [{ amount_ht_cents: 10_000, tax_cents: null }]), tax_cents: 2_000, reference: null };
  const over = inv("6", "2026-10-01", [{ amount_ht_cents: 15_000, tax_cents: null }]);
  const { forTasks, rows } = invoiceViews([taxed, over], TODAY);
  assert.deepEqual(rows, [{ status: "partial", overdue: true }, { status: "paid", overdue: false }]); // HT seul encaissé sur une facture TTC : partielle ; trop-perçu : payée
  assert.equal(forTasks[0].reference, null);
});

test("factures : échéance du jour pas échue ; aucune facture : deux listes vides", () => {
  assert.equal(invoiceViews([inv("1", TODAY)], TODAY).rows[0].overdue, false);
  assert.deepEqual(invoiceViews([], TODAY), { forTasks: [], rows: [] });
});

test("jour de Paris : 22 h 30 UTC le 23 octobre est le 24 à Paris ; autres champs conservés", () => {
  const sprints = sprintsWithParisDay([
    {
      id: "s1", name: "Sprint 1", end_date: "2026-10-30", mission: { id: "m1", title: "Mission", client_name: null },
      stories: [{ id: "st1", status: "in_progress", position: 1, tasks: [{ id: "t1", title: "Tâche", done: true, position: 1, done_at: "2026-10-23T22:30:00Z" }, { id: "t2", title: "À faire", done: false, position: 2, done_at: null }] }],
    },
  ]);
  assert.equal(sprints[0].stories[0].tasks[0].done_on, "2026-10-24");
  assert.equal(sprints[0].stories[0].tasks[1].done_on, ""); // pas faite : aucun jour
  assert.equal(sprints[0].stories[0].tasks[0].title, "Tâche");
  assert.equal(sprints[0].mission.title, "Mission");
  const [q] = quotesWithParisDay([{ id: "q1", status: "sent", updated_at: "2026-10-23T22:30:00Z" }]);
  assert.deepEqual(q, { id: "q1", status: "sent", updated_at: "2026-10-23T22:30:00Z", updated_on: "2026-10-24" });
  assert.equal(quotesWithParisDay([{ updated_at: "2026-10-23T21:30:00Z" }])[0].updated_on, "2026-10-23"); // 23 h 30 à Paris (heure d'été)
});

test("jour de Paris autour du changement d'heure du 25 octobre 2026 (3 h → 2 h)", () => {
  const day = (iso: string) => quotesWithParisDay([{ updated_at: iso }])[0].updated_on;
  assert.equal(day("2026-10-24T22:30:00Z"), "2026-10-25"); // heure d'été : 00 h 30 le 25
  assert.equal(day("2026-10-25T22:30:00Z"), "2026-10-25"); // heure d'hiver : 23 h 30 le 25
  assert.equal(day("2026-10-25T23:30:00Z"), "2026-10-26");
});

test("progression : 0 tâche, 1/3, 2/3, 3/3, sans division par zéro", () => {
  const t = (...d: boolean[]) => d.map((done) => ({ done }));
  assert.deepEqual(taskProgress([]), { done: 0, percent: 0 });
  assert.deepEqual(taskProgress(t(true, false, false)), { done: 1, percent: 33 });
  assert.deepEqual(taskProgress(t(true, true, false)), { done: 2, percent: 67 });
  assert.deepEqual(taskProgress(t(true, true, true)), { done: 3, percent: 100 });
});

test("texte du bandeau : pluriels (0 tâche à faire, 1 déjà faite, 2 déjà faites)", () => {
  assert.equal(bannerDescription(0, 0), "Rien à faire pour aujourd'hui.");
  assert.equal(bannerDescription(1, 0), "1 tâche à faire aujourd'hui, 0 déjà faite.");
  assert.equal(bannerDescription(3, 1), "2 tâches à faire aujourd'hui, 1 déjà faite.");
  assert.equal(bannerDescription(3, 3), "0 tâche à faire aujourd'hui, 3 déjà faites.");
  assert.equal(bannerDescription(4, 2), "2 tâches à faire aujourd'hui, 2 déjà faites.");
});

test("plafond le plus avancé : parmi les « ok » seulement, le plus haut pourcentage, le premier à égalité", () => {
  const ok = (key: string, percent: number) => ({ status: "ok", key, percent }) as unknown as CeilingResult;
  const missing = (key: string) => ({ status: "missing_parameter", key }) as unknown as CeilingResult;
  assert.equal((topCeiling([ok("a", 40), missing("m"), ok("b", 80), ok("c", 60)]) as { key: string }).key, "b");
  assert.equal(topCeiling([missing("m")]), undefined);
  assert.equal(topCeiling([]), undefined);
  assert.equal((topCeiling([ok("a", 50), ok("b", 50)]) as { key: string }).key, "a");
});
