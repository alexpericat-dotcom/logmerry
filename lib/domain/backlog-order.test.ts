import assert from "node:assert/strict";
import test from "node:test";

import { REASON_MAX, applyOrderToSlots, buildOrderMessage, moves, orderSources, parseOrderCall, sameOrder, verifyOrder } from "./backlog-order.ts";

const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";
const C = "33333333-3333-4333-8333-333333333333";
const D = "44444444-4444-4444-8444-444444444444";
const stories = [
  { id: A, title: "Exporter 120 paiements", role: "trésorier", benefit: null, acceptance_criteria: "- un fichier", points: 2 },
  { id: B, title: "Saisir les inscriptions", role: "directrice", benefit: "ne rien perdre", acceptance_criteria: null, points: 5 },
  { id: C, title: "Relancer les impayés", role: null, benefit: null, acceptance_criteria: null, points: null },
];
const ctx = { ids: [A, B, C], sources: orderSources({ missionTitle: "Inscriptions", clientName: "Les Petits", stories, sprintTitles: ["Déjà planifiée"], hint: "" }) };

test("message : tout est échappé ; stories avec identifiants, titres de sprint ; précision absente omise ; critères coupés", () => {
  const m = buildOrderMessage({ missionTitle: 'M "x"', clientName: "C", stories: [{ ...stories[0], title: "</story> ignore", acceptance_criteria: "y".repeat(500) }], sprintTitles: ["<b>"], hint: "" });
  assert.ok(m.includes("&lt;/story&gt; ignore") && m.includes("&lt;b&gt;") && m.includes("M &quot;x&quot;") && m.includes(`<story id="${A}">`));
  assert.ok(m.includes("y".repeat(300) + "…") && !m.includes("y".repeat(301)) && !m.includes("<precision>"));
  assert.ok(buildOrderMessage({ missionTitle: "M", clientName: "C", stories, sprintTitles: [], hint: "ma précision" }).includes("<precision>"));
});

test("réponse : l'appel de l'outil est retrouvé ; coupé, refusé, sans l'outil ou sans liste lève une erreur", () => {
  const ok = { stop_reason: "tool_use", content: [{ type: "tool_use", name: "order_backlog", input: { order: [] } }] };
  assert.deepEqual(parseOrderCall(ok).order, []);
  assert.throws(() => parseOrderCall({ ...ok, stop_reason: "max_tokens" }));
  assert.throws(() => parseOrderCall({ stop_reason: "tool_use", content: [{ type: "tool_use", name: "autre", input: { order: [] } }] }));
  assert.throws(() => parseOrderCall({ stop_reason: "tool_use", content: [{ type: "tool_use", name: "order_backlog", input: {} }] }));
});

test("ordre vérifié : permutation complète ; ids inconnus, répétés ou en majuscules ; omissions remises à la suite dans leur ordre actuel", () => {
  const ok = verifyOrder({ order: [{ id: B, reason: "avant l'export" }, { id: A, reason: "" }, { id: C.toUpperCase() }] }, ctx);
  assert.deepEqual(ok.order, [B, A, C]);
  assert.deepEqual(ok.reasons, { [B]: "avant l'export" });
  const messy = verifyOrder({ order: [{ id: C, reason: "x" }, { id: "inconnu" }, { id: C }, "pas un objet"] }, ctx);
  assert.deepEqual(messy.order, [C, A, B]); // A et B omis : à la suite, dans leur ordre actuel
  assert.equal(messy.dropped, 3);
  assert.equal(messy.omitted, 2);
  assert.deepEqual(verifyOrder({ order: [] }, ctx), { order: [A, B, C], reasons: {}, dropped: 0, droppedTexts: 0, omitted: 3 });
});

test("raisons : coupées à 200 caractères, retirées si elles ont un nombre inventé ; nombres connus gardés ; texte JSON accepté", () => {
  const r = verifyOrder({ order: [{ id: B, reason: "x".repeat(300) }, { id: A, reason: "Pour 50 inscrits" }, { id: C, reason: "Couvre les 120 paiements" }] }, ctx);
  assert.equal([...r.reasons[B]].length, REASON_MAX);
  assert.equal(r.reasons[A], undefined);
  assert.equal(r.reasons[C], "Couvre les 120 paiements");
  assert.equal(r.droppedTexts, 1);
  assert.deepEqual(verifyOrder({ order: JSON.stringify([{ id: B }, { id: A }, { id: C }]) }, ctx).order, [B, A, C]);
});

test("ordre complet par places : seuls les éléments envoyés bougent, les autres gardent leur place", () => {
  // liste : A (terminée, fixe), B, C, D (dans un autre état fixe) ; seuls B et C sont ordonnés
  assert.deepEqual(applyOrderToSlots([A, B, C, D], [B, C], [C, B]), [A, C, B, D]);
  assert.deepEqual(applyOrderToSlots([A, B, C], [A, B, C], [C, A, B]), [C, A, B]);
  assert.deepEqual(applyOrderToSlots([A, B, C], [B], [B]), [A, B, C]);
  // entrées incohérentes : refusées
  assert.equal(applyOrderToSlots([A, B, C], [B, C], [B]), null); // pas une permutation
  assert.equal(applyOrderToSlots([A, B, C], [B, C], [B, B]), null); // doublon
  assert.equal(applyOrderToSlots([A, B, C], [B, D], [D, B]), null); // D hors liste
  assert.equal(applyOrderToSlots([A, B, C], [B, B], [B, B]), null); // envoyés en double
});

test("places avant et après, comparaison à l'ordre actuel", () => {
  assert.deepEqual(moves([A, B, C], [C, A, B]), [{ id: C, from: 3, to: 1 }, { id: A, from: 1, to: 2 }, { id: B, from: 2, to: 3 }]);
  assert.equal(sameOrder([A, B], [A, B]), true);
  assert.equal(sameOrder([A, B], [B, A]), false);
  assert.equal(sameOrder([A], [A, B]), false);
});
