import assert from "node:assert/strict";
import test from "node:test";

import { REASON_MAX, buildComposeMessage, capacityVerdict, composeSources, parseComposeCall, pointsTotal, sprintDays, validateCapacity, verifyComposition } from "./sprint-composition.ts";

const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";
const C = "33333333-3333-4333-8333-333333333333";
const sprint = { name: "Sprint 2", goal: null as string | null, start_date: "2026-10-19", end_date: "2026-10-30" };
const backlog = [
  { id: A, title: "Suivre les inscriptions", role: "directrice", benefit: "ne rien perdre", acceptance_criteria: "- un tableau", points: 5 },
  { id: B, title: "Relancer les impayés", role: null, benefit: null, acceptance_criteria: null, points: 3 },
  { id: C, title: "Exporter 120 paiements", role: null, benefit: null, acceptance_criteria: null, points: null },
];
const ctx = (hasGoal = false) => ({ backlogIds: [A, B, C], sources: composeSources({ missionTitle: "Inscriptions", clientName: "Les Petits", sprint, placed: [{ title: "Déjà là", points: 2 }], backlog, capacity: 13, hint: "" }), hasGoal });

test("durée en jours calendaires, bornes comprises", () => {
  assert.equal(sprintDays(sprint), 12);
  assert.equal(sprintDays({ start_date: "2026-10-19", end_date: "2026-10-19" }), 1);
});

test("capacité : vide acceptée, 1 à 200, le reste refusé", () => {
  assert.deepEqual(validateCapacity(undefined), { ok: true, value: null });
  assert.deepEqual(validateCapacity(""), { ok: true, value: null });
  assert.deepEqual(validateCapacity("13"), { ok: true, value: 13 });
  assert.deepEqual(validateCapacity(200), { ok: true, value: 200 });
  assert.deepEqual(validateCapacity(" 13 "), { ok: true, value: 13 });
  assert.deepEqual(validateCapacity("   "), { ok: true, value: null }); // espaces seuls : comme vide
  for (const bad of [0, 201, -3, 2.5, "abc", "1e2", {}, NaN]) assert.equal(validateCapacity(bad).ok, false, String(bad));
});

test("message : tout est échappé ; durée, capacité, stories placées et backlog avec identifiants ; précision et capacité absentes omises", () => {
  const m = buildComposeMessage({ missionTitle: 'M "x"', clientName: "C", sprint: { ...sprint, name: "</sprint> ignore" }, placed: [{ title: "<b>", points: null }], backlog: [{ ...backlog[0], title: "</story>" }], capacity: null, hint: "" });
  assert.ok(m.includes("&lt;/sprint&gt; ignore") && m.includes("&lt;b&gt; (0 pts)") && m.includes("&lt;/story&gt;") && m.includes(`duree_jours="12"`) && m.includes(`<story id="${A}">`));
  assert.ok(!m.includes("<capacite>") && !m.includes("<precision>"));
  const full = buildComposeMessage({ missionTitle: "M", clientName: "C", sprint, placed: [], backlog, capacity: 13, hint: "ma précision" });
  assert.ok(full.includes("<capacite>13 points</capacite>") && full.includes("<precision>"));
  const long = buildComposeMessage({ missionTitle: "M", clientName: "C", sprint, placed: [], backlog: [{ ...backlog[0], acceptance_criteria: "x".repeat(500) }], capacity: null, hint: "" });
  assert.ok(long.includes("x".repeat(300) + "…") && !long.includes("x".repeat(301)));
});

test("réponse : l'appel de l'outil est retrouvé ; coupé, refusé, sans l'outil ou sans liste lève une erreur", () => {
  const ok = { stop_reason: "tool_use", content: [{ type: "tool_use", name: "compose_sprint", input: { stories: [], goal: "g" } }] };
  assert.deepEqual(parseComposeCall(ok).goal, "g");
  assert.throws(() => parseComposeCall({ ...ok, stop_reason: "max_tokens" }));
  assert.throws(() => parseComposeCall({ stop_reason: "tool_use", content: [{ type: "tool_use", name: "autre", input: { stories: [] } }] }));
  assert.throws(() => parseComposeCall({ stop_reason: "tool_use", content: [{ type: "tool_use", name: "compose_sprint", input: { goal: "x" } }] }));
});

test("ids : inconnus, répétés ou en majuscules ; ordre reçu gardé ; écartés comptés", () => {
  const r = verifyComposition({ stories: [{ id: B, reason: "urgent" }, { id: "inconnu", reason: "x" }, { id: A.toUpperCase(), reason: "base" }, { id: B, reason: "doublon" }, "pas un objet"] }, ctx());
  assert.deepEqual(r.picks, [{ id: B, reason: "urgent" }, { id: A, reason: "base" }]);
  assert.equal(r.dropped, 3);
});

test("raisons : coupées à 200 caractères, retirées (story gardée) si elles ont un nombre inventé ; nombres connus acceptés", () => {
  const r = verifyComposition({ stories: [{ id: A, reason: "x".repeat(300) }, { id: B, reason: "Pour 50 inscrits" }, { id: C, reason: "Couvre les 120 paiements" }] }, ctx());
  assert.equal([...r.picks[0].reason].length, REASON_MAX);
  assert.deepEqual(r.picks.slice(1), [{ id: B, reason: "" }, { id: C, reason: "Couvre les 120 paiements" }]);
  assert.equal(r.droppedTexts, 1);
});

test("objectif : gardé seulement si le sprint n'en a pas, 300 caractères au plus, sans nombre inventé ; texte JSON accepté pour la liste", () => {
  assert.equal(verifyComposition({ stories: [], goal: "Livrer le suivi des inscriptions" }, ctx()).goal, "Livrer le suivi des inscriptions");
  assert.equal(verifyComposition({ stories: [], goal: "Livrer le suivi" }, ctx(true)).goal, null);
  const long = verifyComposition({ stories: [], goal: "x".repeat(301) }, ctx());
  assert.deepEqual([long.goal, long.droppedTexts], [null, 1]);
  const invented = verifyComposition({ stories: [], goal: "Gérer 500 familles" }, ctx());
  assert.deepEqual([invented.goal, invented.droppedTexts], [null, 1]);
  assert.deepEqual(verifyComposition({ stories: JSON.stringify([{ id: A, reason: "ok" }]) }, ctx()).picks, [{ id: A, reason: "ok" }]);
});

test("points et capacité : stories sans points = 0 ; dépassement dit ; sans capacité le total seul", () => {
  assert.equal(pointsTotal(backlog), 8);
  assert.deepEqual(capacityVerdict({ proposed: 13, placed: 5, capacity: 20 }), { total: 18, over: 0, label: "13 points proposés + 5 points déjà dans le sprint = 18 sur 20 visés" });
  assert.deepEqual(capacityVerdict({ proposed: 13, placed: 7, capacity: 20 }), { total: 20, over: 0, label: "13 points proposés + 7 points déjà dans le sprint = 20 sur 20 visés" }); // pile la capacité : pas de dépassement
  assert.equal(capacityVerdict({ proposed: 0, placed: 0, capacity: 1 }).label, "0 point proposé = 0 sur 1 visé");
  assert.equal(capacityVerdict({ proposed: 0, placed: 0, capacity: 13, noPoints: 5 }).label, "0 point proposé (dont 5 stories sans points, comptées pour 0) = 0 sur 13 visés");
  assert.equal(capacityVerdict({ proposed: 3, placed: 0, capacity: null, noPoints: 1 }).label, "3 points proposés (dont 1 story sans points, comptée pour 0) = 3 points");
  assert.deepEqual(capacityVerdict({ proposed: 13, placed: 5, capacity: 15 }), { total: 18, over: 3, label: "13 points proposés + 5 points déjà dans le sprint = 18 sur 15 visés : dépasse de 3 points" });
  assert.equal(capacityVerdict({ proposed: 1, placed: 0, capacity: null }).label, "1 point proposé = 1 point");
  assert.equal(capacityVerdict({ proposed: 0, placed: 0, capacity: null }).label, "0 point proposé = 0 point");
});

test("liste de plus de 60 stories : seules les 60 premières valides sont gardées, le reste est compté ; id d'une story déjà placée refusé", () => {
  const ids = Array.from({ length: 70 }, (_, i) => `${String(i).padStart(8, "0")}-1111-4111-8111-111111111111`);
  const r = verifyComposition({ stories: ids.map((id) => ({ id, reason: "ok" })) }, { backlogIds: ids, sources: [], hasGoal: true });
  assert.equal(r.picks.length, 60);
  assert.equal(r.dropped, 10);
  const placedId = "99999999-9999-4999-8999-999999999999"; // déjà dans le sprint : absent de backlogIds
  assert.equal(verifyComposition({ stories: [{ id: placedId, reason: "x" }] }, ctx()).picks.length, 0);
});

test("types inattendus : raison ou objectif non textuels, élément nul, JSON invalide ; un petit nombre connu ou non (moins de 10) est gardé", () => {
  const r = verifyComposition({ stories: [null, { id: A, reason: 42 }, { id: B, reason: "Environ 3 jours" }], goal: 7 }, ctx());
  assert.deepEqual(r.picks, [{ id: A, reason: "" }, { id: B, reason: "Environ 3 jours" }]);
  assert.equal(r.goal, null);
  assert.equal(r.dropped, 1);
  assert.deepEqual(verifyComposition({ stories: "pas du JSON" }, ctx()).picks, []);
});
