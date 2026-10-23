import assert from "node:assert/strict";
import test from "node:test";

import { todayTasks } from "./today.ts";

const TODAY = "2026-10-23";
const dl = (id: string, due_on: string, done_at: string | null = null) => ({ id, title: `Échéance ${id}`, due_on, done_at });
type Inv = { id: string; reference: string | null; due_on: string; status: "unpaid" | "partial" | "paid"; mission: { title: string } | null };
const inv = (id: string, due_on: string, status: Inv["status"] = "unpaid"): Inv => ({ id, reference: `F-${id}`, due_on, status, mission: null });
const run = (d: ReturnType<typeof dl>[], i: Inv[], checked: string[] = []) => todayTasks(d, i, new Set(checked), TODAY);

test("cas de référence : échéance à J+3 puis facture échue depuis 1 jour", () => {
  const t = run([dl("a", "2026-10-26")], [inv("f", "2026-10-22")]);
  assert.deepEqual(t.map((x) => [x.rule, x.reason]), [[1, "échéance dans 3 jours"], [2, "facture échue depuis 1 jour"]]);
});

test("règle 1 : bornes 0 à 3 jours, en retard et J+4 exclus, aujourd'hui annoncé", () => {
  const t = run([dl("hier", "2026-10-22"), dl("j0", TODAY), dl("j3", "2026-10-26"), dl("j4", "2026-10-27")], []);
  assert.deepEqual(t.map((x) => [x.id, x.reason]), [["j0", "échéance aujourd'hui"], ["j3", "échéance dans 3 jours"]]);
});

test("règle 2 : soldée ou échue aujourd'hui = aucune tâche ; partielle = tâche ; pluriel", () => {
  const t = run([], [inv("p", "2026-10-01", "paid"), inv("j0", TODAY), inv("part", "2026-10-20", "partial")]);
  assert.deepEqual(t.map((x) => [x.id, x.reason]), [["part", "facture échue depuis 3 jours"]]);
});

test("tri : date la plus proche puis identifiant ; cochées en bas", () => {
  const t = run([dl("b", "2026-10-24"), dl("a", "2026-10-24"), dl("c", "2026-10-25"), dl("z", TODAY, "2026-10-23T08:00:00Z")], [inv("f", "2026-10-22")]);
  assert.deepEqual(t.map((x) => x.id), ["a", "b", "c", "f", "z"]);
});

test("coche de facture du jour : barrée, tâche conservée", () => {
  const t = run([], [inv("f", "2026-10-22")], ["f"]);
  assert.equal(t.length, 1);
  assert.equal(t[0].done, true);
});

test("titre de facture : référence, sinon titre de mission, sinon « sans référence » ; « dans 1 jour » au singulier", () => {
  const base = { due_on: "2026-10-22", status: "unpaid" as const };
  const t = run([dl("a", "2026-10-24")], [{ id: "1", reference: null, mission: { title: "Audit" }, ...base }, { id: "2", reference: null, mission: null, ...base }]);
  assert.equal(t[0].reason, "échéance dans 1 jour");
  assert.deepEqual(t.slice(1).map((x) => x.title), ["Encaisser la facture Audit", "Encaisser la facture sans référence"]);
});

test("échéance faite hors fenêtre : aucune tâche", () => {
  assert.deepEqual(run([dl("a", "2026-10-30", "2026-10-22T08:00:00Z")], []), []);
});
