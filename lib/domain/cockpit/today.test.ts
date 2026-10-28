import assert from "node:assert/strict";
import test from "node:test";

import { computeCeilings } from "../finance/ceilings.ts";
import type { RuleRow } from "../finance/rules.ts";
import { checkKey, todayMissing, todayTasks, type AcreProfile, type QuoteInput } from "./today.ts";

const TODAY = "2026-10-23";
/** Pipeline suffisant (2 missions vivantes) : les tests des règles 1 à 4 ne voient pas la règle 6. */
const FULL = [{ id: "m1", status: "in_progress" }, { id: "m2", status: "planned" }];
const dl = (id: string, due_on: string, done_at: string | null = null) => ({ id, title: `Échéance ${id}`, due_on, done_at });
type Inv = { id: string; reference: string | null; due_on: string; status: "unpaid" | "partial" | "paid"; mission: { title: string } | null };
const inv = (id: string, due_on: string, status: Inv["status"] = "unpaid"): Inv => ({ id, reference: `F-${id}`, due_on, status, mission: null });
const run = (d: ReturnType<typeof dl>[], i: Inv[], checked: string[] = []) => todayTasks(d, i, new Set(checked.map((id) => checkKey(2, id))), [], [], null, [], FULL, TODAY);

const rule = (rule_key: string, params: Record<string, unknown>, status: RuleRow["status"] = "verifiee"): RuleRow => ({
  id: rule_key, rule_key, activity_category: "bnc", description: null, params, effective_from: "2026-01-01", effective_to: null,
  source: status === "essai" ? "DEMO" : "https://example.org", verified_on: "2026-10-01", revalidate_after: "2027-10-01", status, previous_version_id: null,
});
const CEIL = rule("ceiling_turnover_micro", { amount_cents: 100_000, period: "calendar_year", tax_basis: "excl_tax", revenue_category: "services" });
const ACRE_RULE = rule("acre_duration", { months: 12 });
const pay = (cents: number) => [{ amount_ht_cents: cents, tax_cents: null, received_on: "2026-05-01" }];
const profile = (over: Record<string, unknown> = {}) => ({ activity_category: "bnc", activity_category_confirmed_at: "2026-01-01", alert_thresholds: [90, 100], ...over });
const tasks = (rules: RuleRow[], p: ReturnType<typeof profile>, cents: number, checked: string[] = []) =>
  todayTasks([], [], new Set(checked), computeCeilings(rules, p, pay(cents), TODAY), rules, p as AcreProfile, [], FULL, TODAY);
const only3 = (t: ReturnType<typeof tasks>) => t.filter((x) => x.rule === 3);

test("règle 3 : 90 % = tâche à 90 %, 100 % = seule la tâche à 100 %, dépassé annoncé", () => {
  assert.match(only3(tasks([CEIL], profile(), 90_000))[0].reason, / à 90 % \(estimation\)/);
  const t100 = only3(tasks([CEIL], profile(), 100_000));
  assert.deepEqual(t100.map((x) => x.threshold), [100]);
  assert.match(only3(tasks([CEIL], profile(), 120_000))[0].reason, /dépassé/);
  assert.equal(only3(tasks([CEIL], profile(), 90_000))[0].threshold, 90);
});

test("règle 3 : seuil non actif ou sous le seuil = rien", () => {
  assert.equal(only3(tasks([CEIL], profile({ alert_thresholds: [100] }), 90_000)).length, 0);
  assert.equal(only3(tasks([CEIL], profile(), 50_000)).length, 0);
});

test("règle 3 : cocher 90 % ne masque pas 100 %", () => {
  const key = computeCeilings([CEIL], profile(), pay(90_000), TODAY)[0];
  assert.equal(key.status, "ok");
  const done = only3(tasks([CEIL], profile(), 90_000, [checkKey(3, null, CEIL.rule_key, 90)]));
  assert.equal(done[0].done, true);
  assert.equal(only3(tasks([CEIL], profile(), 100_000, [checkKey(3, null, CEIL.rule_key, 90)]))[0].done, false);
});

test("règle 3 : bandeau déclarée non confirmée, étiquette DEMO", () => {
  const t = only3(tasks([rule("ceiling_turnover_micro", CEIL.params, "essai")], profile({ activity_category_confirmed_at: null }), 90_000))[0];
  assert.equal(t.declared, true);
  assert.equal(t.demo, true);
});

test("sans règle ni profil : lignes « paramètre manquant » (3 plafonds + ACRE), aucune tâche", () => {
  assert.deepEqual(todayTasks([], [], new Set(), computeCeilings([], null, [], TODAY), [], null, [], FULL, TODAY), []);
  const lines = todayMissing(computeCeilings([], null, [], TODAY), [], null, TODAY);
  assert.equal(lines.length, 4);
  assert.ok(lines.every((l) => l.text.length > 0));
});

const acreProfile = (over: Record<string, unknown> = {}) => profile({ acre: "eligible", activity_start_date: "2025-11-30", activity_start_date_confirmed_at: "2026-01-01", ...over });
const acreTasks = (p: ReturnType<typeof profile>, rules = [ACRE_RULE]) => todayTasks([], [], new Set(), [], rules, p as AcreProfile, [], FULL, TODAY).filter((x) => x.rule === 4);

test("règle 4 : fin à J+31 = tâche, J+32 ou passée = rien", () => {
  // début 2025-11-23 + 12 mois = 2026-11-23 = J+31 depuis le 2026-10-23
  const t = acreTasks(acreProfile({ activity_start_date: "2025-11-23" }));
  assert.deepEqual(t.map((x) => x.reason), ["fin d'ACRE estimée dans 31 jours (estimation)"]);
  assert.equal(acreTasks(acreProfile({ activity_start_date: "2025-11-24" })).length, 0);
  assert.equal(acreTasks(acreProfile({ activity_start_date: "2025-10-22" })).length, 0);
  assert.equal(acreTasks(acreProfile({ activity_start_date: "2025-10-23" }))[0].reason, "fin d'ACRE estimée aujourd'hui (estimation)");
});

test("règle 4 : non éligible = rien (ni ligne) ; inconnue ou donnée manquante = ligne, pas de tâche", () => {
  const near = { activity_start_date: "2025-11-23" };
  const lines = (p: ReturnType<typeof profile>, rules = [ACRE_RULE]) => todayMissing([], rules, p as AcreProfile, TODAY);
  assert.equal(acreTasks(acreProfile({ ...near, acre: "not_eligible" })).length + lines(acreProfile({ ...near, acre: "not_eligible" })).length, 0);
  for (const bad of [{ acre: "unknown" }, { acre: null }, { activity_start_date: null }, { activity_category: null }]) {
    assert.equal(acreTasks(acreProfile({ ...near, ...bad })).length, 0);
    assert.equal(lines(acreProfile({ ...near, ...bad })).length, 1);
  }
  assert.equal(lines(acreProfile(near), []).length, 1, "règle absente");
  assert.equal(lines(acreProfile(near), [rule("acre_duration", { months: 12 }, "a_verifier")]).length, 1, "règle non vérifiée");
});

test("règle 4 : date déclarée non confirmée = bandeau ; tri règle 3 avant règle 4 ; cochées en bas", () => {
  const t = acreTasks(acreProfile({ activity_start_date: "2025-11-23", activity_start_date_confirmed_at: null }));
  assert.equal(t[0].declared, true);
  const p = acreProfile({ activity_start_date: "2025-11-23" });
  const all = todayTasks([], [], new Set([checkKey(3, null, CEIL.rule_key, 90)]), computeCeilings([CEIL, ACRE_RULE], p, pay(90_000), TODAY), [CEIL, ACRE_RULE], p as AcreProfile, [], FULL, TODAY);
  assert.deepEqual(all.map((x) => x.rule), [4, 3]);
  assert.equal(checkKey(4), "4|||");
});

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

const quote = (id: string, updated_on: string, over: Partial<QuoteInput> = {}): QuoteInput => ({ id, status: "sent", client_id: "c1", client_name: "Acme", mission_id: null, updated_on, ...over });
const day = (back: number) => new Date(Date.parse(`${TODAY}T00:00:00Z`) - back * 86_400_000).toISOString().slice(0, 10);
const withPipeline = (quotes: QuoteInput[], missions: { id: string; status: string }[] = FULL, checked: string[] = []) =>
  todayTasks([], [], new Set(checked), [], [], null, quotes, missions, TODAY).filter((x) => x.rule >= 5);

test("règle 5 : devis envoyé modifié il y a 8 jours = tâche ; 7 jours ou aujourd'hui = rien", () => {
  assert.deepEqual(withPipeline([quote("a", day(8))]).map((x) => [x.rule, x.reason, x.clientId]), [[5, "devis sans réponse depuis 8 jours", "c1"]]);
  assert.equal(withPipeline([quote("b", day(7)), quote("c", day(0))]).length, 0);
});

test("règle 5 : accepté, refusé ou brouillon dormant = rien", () => {
  assert.equal(withPipeline([quote("a", day(30), { status: "accepted" }), quote("b", day(30), { status: "refused" }), quote("c", day(30), { status: "draft" })]).length, 0);
});

test("règle 6 : moins de 2 éléments = tâche ; 2 = rien", () => {
  const t = withPipeline([], [{ id: "m1", status: "in_progress" }]);
  assert.deepEqual(t.map((x) => [x.rule, x.reason]), [[6, "ton pipeline se vide"]]);
  assert.equal(withPipeline([quote("a", day(0))], [{ id: "m1", status: "planned" }]).length, 0);
  assert.equal(withPipeline([], FULL).length, 0);
});

test("règle 6 : un devis lié à une mission vivante compte une fois ; lié à une mission close, il compte comme devis", () => {
  assert.equal(withPipeline([quote("a", day(0), { mission_id: "m1" })], [{ id: "m1", status: "in_progress" }]).length, 1, "1 élément");
  assert.equal(withPipeline([quote("a", day(0), { mission_id: "m9" })], [{ id: "m1", status: "in_progress" }, { id: "m9", status: "done" }]).length, 0, "mission + devis = 2");
});

test("règles 5 et 6 : coche du jour, tri après la règle 4, cochées en bas", () => {
  const t = withPipeline([quote("a", day(9))], [], [checkKey(6)]);
  assert.deepEqual(t.map((x) => [x.rule, x.id, x.done]), [[5, "a", false], [6, "pipeline", true]]);
  assert.equal(withPipeline([quote("a", day(9))], [], [checkKey(5, "a")]).find((x) => x.rule === 5)?.done, true);
  assert.deepEqual(withPipeline([quote("b", day(8)), quote("a", day(8))]).map((x) => x.id), ["a", "b"], "même date : identifiant");
  assert.equal(checkKey(6), "6|||");
});
