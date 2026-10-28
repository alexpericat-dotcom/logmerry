import assert from "node:assert/strict";
import test from "node:test";

import { computeCeilings } from "../finance/ceilings.ts";
import type { RuleRow } from "../finance/rules.ts";
import { checkKey, sprintOverflow, targetOf, todayMissing, todayTasks, type AcreProfile, type QuoteInput, type SprintWork } from "./today.ts";

const TODAY = "2026-10-23";
/** Pipeline suffisant (2 missions vivantes) : les tests des règles 1 à 4 ne voient pas la règle 6. */
const FULL = [{ id: "m1", status: "in_progress" }, { id: "m2", status: "planned" }];
const dl = (id: string, due_on: string, done_at: string | null = null) => ({ id, title: `Échéance ${id}`, due_on, done_at });
type Inv = { id: string; reference: string | null; due_on: string; status: "unpaid" | "partial" | "paid"; mission: { title: string } | null };
const inv = (id: string, due_on: string, status: Inv["status"] = "unpaid"): Inv => ({ id, reference: `F-${id}`, due_on, status, mission: null });
const run = (d: ReturnType<typeof dl>[], i: Inv[], checked: string[] = []) => todayTasks(d, i, new Set(checked.map((id) => checkKey(2, id))), [], [], null, [], FULL, [], TODAY);

const rule = (rule_key: string, params: Record<string, unknown>, status: RuleRow["status"] = "verifiee"): RuleRow => ({
  id: rule_key, rule_key, activity_category: "bnc", description: null, params, effective_from: "2026-01-01", effective_to: null,
  source: status === "essai" ? "DEMO" : "https://example.org", verified_on: "2026-10-01", revalidate_after: "2027-10-01", status, previous_version_id: null,
});
const CEIL = rule("ceiling_turnover_micro", { amount_cents: 100_000, period: "calendar_year", tax_basis: "excl_tax", revenue_category: "services" });
const ACRE_RULE = rule("acre_duration", { months: 12 });
const pay = (cents: number) => [{ amount_ht_cents: cents, tax_cents: null, received_on: "2026-05-01" }];
const profile = (over: Record<string, unknown> = {}) => ({ activity_category: "bnc", activity_category_confirmed_at: "2026-01-01", alert_thresholds: [90, 100], ...over });
const tasks = (rules: RuleRow[], p: ReturnType<typeof profile>, cents: number, checked: string[] = []) =>
  todayTasks([], [], new Set(checked), computeCeilings(rules, p, pay(cents), TODAY), rules, p as AcreProfile, [], FULL, [], TODAY);
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
  assert.deepEqual(todayTasks([], [], new Set(), computeCeilings([], null, [], TODAY), [], null, [], FULL, [], TODAY), []);
  const lines = todayMissing(computeCeilings([], null, [], TODAY), [], null, TODAY);
  assert.equal(lines.length, 4);
  assert.ok(lines.every((l) => l.text.length > 0));
});

const acreProfile = (over: Record<string, unknown> = {}) => profile({ acre: "eligible", activity_start_date: "2025-11-30", activity_start_date_confirmed_at: "2026-01-01", ...over });
const acreTasks = (p: ReturnType<typeof profile>, rules = [ACRE_RULE]) => todayTasks([], [], new Set(), [], rules, p as AcreProfile, [], FULL, [], TODAY).filter((x) => x.rule === 4);

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
  const all = todayTasks([], [], new Set([checkKey(3, null, CEIL.rule_key, 90)]), computeCeilings([CEIL, ACRE_RULE], p, pay(90_000), TODAY), [CEIL, ACRE_RULE], p as AcreProfile, [], FULL, [], TODAY);
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
  todayTasks([], [], new Set(checked), [], [], null, quotes, missions, [], TODAY).filter((x) => x.rule >= 5);

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

test("coche : la cible de chaque tâche des règles 2 à 6 reconstruit la clé lue par `done`", () => {
  const p = acreProfile({ activity_start_date: "2025-11-23" });
  const ceilings = computeCeilings([CEIL, ACRE_RULE], p, pay(90_000), TODAY);
  const all = todayTasks([], [inv("f", "2026-10-22")], new Set(), ceilings, [CEIL, ACRE_RULE], p as AcreProfile, [quote("q", day(9))], [], [], TODAY);
  assert.deepEqual(all.map((t) => t.rule).sort(), [2, 3, 4, 5, 6]);
  for (const t of all) {
    const target = targetOf(t);
    assert.ok(target, `règle ${t.rule}`);
    const key = checkKey(target.rule, target.sourceId, target.ceilingKey, target.threshold);
    const again = todayTasks([], [inv("f", "2026-10-22")], new Set([key]), ceilings, [CEIL, ACRE_RULE], p as AcreProfile, [quote("q", day(9))], [], [], TODAY);
    assert.equal(again.find((x) => x.rule === t.rule)?.done, true, `la coche de la règle ${t.rule} est relue`);
    assert.equal(again.filter((x) => x.done).length, 1, "une coche ne coche qu'une tâche");
  }
  assert.equal(targetOf(todayTasks([dl("a", TODAY)], [], new Set(), [], [], null, [], FULL, [], TODAY)[0]), null, "échéance : coche dans deadlines");
});

type St = SprintWork["stories"][number];
const task = (id: string, position: number, done = false, done_on = day(3)) => ({ id, title: `Tâche ${id}`, done, done_on, position });
const story = (id: string, status: string, position: number, tasks: St["tasks"] = []): St => ({ id, status, position, tasks });
const sprint = (id: string, end: number, stories: St[], over: Partial<SprintWork> = {}): SprintWork => ({ id, name: `S-${id}`, end_date: day(-end), mission: { id: `m-${id}`, title: "Audit", client_name: "Acme" }, stories, ...over });
const sp = (sprints: SprintWork[], checked: string[] = []) => todayTasks([], [], new Set(checked), [], [], null, [], FULL, sprints, TODAY).filter((x) => x.rule >= 7);

test("tâches du sprint : trois au plus dans l'ordre du sprint, le reste en une ligne « N autres »", () => {
  const s = sprint("a", 10, [story("s1", "in_progress", 1, [task("t1", 1), task("t2", 2), task("t3", 3)]), story("s2", "in_progress", 2, [task("t4", 1), task("t5", 2)])]);
  const t = sp([s]);
  assert.deepEqual(t.map((x) => x.id), ["t1", "t2", "t3"]);
  assert.equal(t[0].reason, "dans ton sprint, qui se termine dans 10 jours");
  assert.equal(t[0].context, "Acme / Audit / S-a");
  assert.deepEqual(sprintOverflow([s], TODAY), { count: 2, missionId: "m-a" });
  assert.equal(sprintOverflow([sprint("b", 10, [story("s1", "in_progress", 1, [task("t1", 1)])])], TODAY), null);
});

test("tâches du sprint : stories à faire, sprint planifié ou clos = rien", () => {
  assert.equal(sp([sprint("a", 10, [story("s1", "todo", 1, [task("t1", 1)])])]).length, 0);
  assert.equal(sp([]).length, 0);
});

test("règle 7 : fin à J+2 avec des stories ouvertes = tâche avant les tâches du sprint ; J+3 ou tout terminé = rien", () => {
  const stories = [story("s1", "in_progress", 1, [task("t1", 1)]), story("s2", "todo", 2)];
  const t = sp([sprint("a", 2, stories)]);
  assert.deepEqual(t.map((x) => [x.rule, x.reason]), [[7, "ton sprint se termine dans 2 jours, 2 stories non terminées"], [8, "dans ton sprint, qui se termine dans 2 jours"]]);
  assert.equal(sp([sprint("a", 3, stories)]).filter((x) => x.rule === 7).length, 0);
  assert.equal(sp([sprint("a", 1, [story("s1", "done", 1)])]).filter((x) => x.rule === 7).length, 0);
  assert.equal(sp([sprint("a", 0, [story("s1", "todo", 1)])])[0].reason, "ton sprint se termine aujourd'hui, 1 story non terminée");
});

test("fin dépassée : tâches du sprint avec « fin dépassée », pas de règle 7", () => {
  const t = sp([sprint("a", -1, [story("s1", "in_progress", 1, [task("t1", 1)]), story("s2", "todo", 2)])]);
  assert.deepEqual(t.map((x) => [x.rule, x.reason]), [[8, "dans ton sprint, dont la fin est dépassée de 1 jour"]]);
});

test("tâche de sprint cochée aujourd'hui : reste, cochée, en bas, hors décompte ; faite un autre jour : disparaît", () => {
  const s = sprint("a", 10, [story("s1", "in_progress", 1, [task("d", 1, true, TODAY), task("old", 2, true, day(1)), task("t1", 3), task("t2", 4), task("t3", 5), task("t4", 6)])]);
  assert.deepEqual(sp([s]).map((x) => [x.id, x.done]), [["t1", false], ["t2", false], ["t3", false], ["d", true]]);
  assert.equal(sprintOverflow([s], TODAY)?.count, 1);
});

test("plusieurs sprints : fin la plus proche d'abord, un seul plafond de trois ; coche de la règle 7 par sprint", () => {
  const a = sprint("a", 20, [story("s", "in_progress", 1, [task("a1", 1), task("a2", 2)])]);
  const b = sprint("b", 5, [story("s", "in_progress", 1, [task("b1", 1), task("b2", 2)])]);
  assert.deepEqual(sp([a, b]).map((x) => x.id), ["b1", "b2", "a1"]);
  const e = sprint("e", 1, [story("s", "todo", 1)]);
  assert.equal(sp([e], [checkKey(7, "e")])[0].done, true);
  assert.deepEqual(targetOf(sp([e])[0]), { rule: 7, sourceId: "e" });
  assert.equal(targetOf(sp([a])[0]), null, "tâche de sprint : coche dans tasks.done");
});
