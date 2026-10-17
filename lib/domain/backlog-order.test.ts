import assert from "node:assert/strict";
import test from "node:test";

import { REASON_MAX, applyOrderToSlots, backlogUnchanged, buildOrderMessage, moves, orderSources, parseOrderCall, pickOrderable, sameOrder, verifyOrder } from "./backlog-order.ts";

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

test("rangs : une raison qui parle de la place 11 ou 12 n'est pas un nombre inventé", () => {
  const ids = Array.from({ length: 12 }, (_, i) => `${String(i).padStart(8, "0")}-1111-4111-8111-111111111111`);
  const st = ids.map((id, i) => ({ id, title: `Story ${String.fromCharCode(65 + i)}`, role: null, benefit: null, acceptance_criteria: null, points: null }));
  const sources = orderSources({ missionTitle: "M", clientName: "C", stories: st, sprintTitles: [], hint: "" });
  const r = verifyOrder({ order: [{ id: ids[1], reason: "Passe de la place 12 à la place 11" }, { id: ids[0], reason: "Descend" }, ...ids.slice(2).map((id) => ({ id }))] }, { ids, sources });
  assert.equal(r.reasons[ids[1]], "Passe de la place 12 à la place 11");
  assert.equal(r.droppedTexts, 0);
});

test("raison retirée : comptée seulement pour une story dont la place change", () => {
  const moved = verifyOrder({ order: [{ id: B, reason: "Pour 50 inscrits" }, { id: A }, { id: C }] }, ctx);
  assert.equal(moved.droppedTexts, 1); // B change de place
  const still = verifyOrder({ order: [{ id: A, reason: "Pour 50 inscrits" }, { id: B }, { id: C }] }, ctx);
  assert.equal(still.droppedTexts, 0); // A ne bouge pas : sa raison n'aurait pas été affichée
});

test("stories à envoyer : les 60 premières non terminées, les suivantes et les terminées gardent leur place", () => {
  const ids = Array.from({ length: 70 }, (_, i) => `${String(i).padStart(8, "0")}-1111-4111-8111-111111111111`);
  const backlog = ids.map((id, i) => ({ id, status: i === 3 || i === 65 ? "done" : "todo" }));
  const { sent, cut } = pickOrderable(backlog);
  assert.equal(sent.length, 60);
  assert.equal(cut, true);
  assert.ok(!sent.includes(ids[3]) && sent[3] === ids[4]); // la terminée n'est pas envoyée
  const reversed = [...sent].reverse();
  const full = applyOrderToSlots(ids, sent, reversed)!;
  assert.equal(full[3], ids[3]); // la terminée garde sa place
  assert.deepEqual(full.slice(62), ids.slice(62)); // les stories au-delà des 60 premières ouvertes (la 60ᵉ est à la place 61) gardent leur place, la terminée de la place 65 aussi
  assert.equal(pickOrderable(backlog.slice(0, 5)).cut, false);
});

test("péremption : story ajoutée, retirée, permutée ou ordonnée devenue terminée → changé ; une terminée hors envoi ne change rien", () => {
  const backlog = [{ id: A, status: "todo" }, { id: B, status: "done" }, { id: C, status: "todo" }];
  const base = [A, B, C];
  const sent = [A, C];
  assert.equal(backlogUnchanged(backlog, base, sent), true);
  assert.equal(backlogUnchanged([...backlog, { id: D, status: "todo" }], base, sent), false); // ajoutée
  assert.equal(backlogUnchanged(backlog.slice(0, 2), base, sent), false); // retirée
  assert.equal(backlogUnchanged([backlog[2], backlog[1], backlog[0]], base, sent), false); // ordre changé ailleurs
  assert.equal(backlogUnchanged([{ id: A, status: "done" }, backlog[1], backlog[2]], base, sent), false); // une ordonnée est devenue terminée
  assert.equal(backlogUnchanged([backlog[0], { id: B, status: "todo" }, backlog[2]], base, sent), true); // une terminée hors envoi redevient ouverte : sans effet sur l'ordre
  assert.equal(backlogUnchanged(backlog, base, [A, D]), false); // `sent` forgé hors backlog
});
