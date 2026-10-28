import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { applyBacklogOrder, proposeBacklogOrder } from "../../app/(app)/missions/backlog-order-actions.ts";
import { errorOf, fake, filterValue, routes, toLogin, withHarness, writes } from "../helpers/harness.ts";

const MISSION = "5e5e5e5e-5e5e-45e5-85e5-5e5e5e5e5e5e";
const A = "a1a1a1a1-a1a1-41a1-81a1-a1a1a1a1a1a1";
const B = "b2b2b2b2-b2b2-42b2-82b2-b2b2b2b2b2b2";
const C = "c3c3c3c3-c3c3-43c3-83c3-c3c3c3c3c3c3";
const DONE = "d4d4d4d4-d4d4-44d4-84d4-d4d4d4d4d4d4";

withHarness();

const story = (id: string, title: string, status = "todo") => ({ id, title, role: null, benefit: null, acceptance_criteria: null, points: 3, status });
const BACKLOG = [story(A, "Facturer"), story(DONE, "Déjà fini", "done"), story(B, "Relancer"), story(C, "Exporter")];
const reads = (rows: unknown[]) => [
  ["missions:select", { data: [{ title: "Suivi", client: { name: "Atelier Lumière" } }] }],
  ["user_stories:select", (op: { columns?: string }) => (op.columns?.startsWith("id, title") ? { data: rows } : { data: [{ title: "Story déjà en sprint" }] })],
] as Parameters<typeof routes>;
const aiCalls = () => fake.ai.calls.filter((c) => c.name === "order");

describe("proposeBacklogOrder", () => {
  test("envoie à l'IA les stories OUVERTES (la terminée reste chez nous), les titres des stories en sprint, la mission et la fiche ; rien n'est écrit", async () => {
    routes(...reads(BACKLOG));
    fake.ai.replies.order = { order: [{ id: C, reason: "Débloque le reste" }, { id: A, reason: "" }, { id: B, reason: "" }] };
    const r = await proposeBacklogOrder(MISSION, "Priorité aux exports");
    assert.equal(r.ok, true);
    assert.ok(r.ok && !r.sentIds.includes(DONE) && r.sentIds.length === 3);
    assert.deepEqual(r.ok && r.baseIds, [A, DONE, B, C]); // le backlog affiché, terminées comprises
    const [call] = aiCalls();
    for (const sent of ["Priorité aux exports", "Suivi", "Atelier Lumière", "Story déjà en sprint", "Exporter"]) assert.ok(call.message.includes(sent), sent);
    assert.ok(!call.message.includes("Déjà fini"));
    assert.deepEqual(writes(), []);
  });

  test("moins de 2 stories ouvertes : message, l'IA n'est pas appelée", async () => {
    routes(...reads([story(A, "Seule"), story(DONE, "Finie", "done")]));
    assert.match(errorOf(await proposeBacklogOrder(MISSION, "")), /au moins 2 stories ouvertes/);
    assert.equal(aiCalls().length, 0);
  });

  test("l'IA n'a rien classé d'exploitable : message distinct de « l'ordre est déjà logique »", async () => {
    routes(...reads(BACKLOG));
    fake.ai.replies.order = { order: [{ id: "inconnu" }] };
    assert.match(errorOf(await proposeBacklogOrder(MISSION, "")), /rien classé d'exploitable/);
  });

  test("l'IA tombe en panne : échec général ; le journal ne contient ni story ni précision", async (t) => {
    routes(...reads(BACKLOG));
    const log = t.mock.method(console, "error", () => {});
    fake.ai.replies.order = new Error("erreur du modèle");
    assert.deepEqual(await proposeBacklogOrder(MISSION, "Précision SENTINELLE"), { ok: false, error: "Proposition impossible pour le moment. Réessaie." });
    assert.deepEqual(log.mock.calls[0].arguments, ["Ordre du backlog impossible :", "erreur du modèle"]);
    assert.ok(!JSON.stringify(log.mock.calls).includes("SENTINELLE") && !JSON.stringify(log.mock.calls).includes("Facturer"));
  });

  test("mission disparue, identifiant invalide ou précision invalide : refus sans appel à l'IA", async () => {
    assert.match(errorOf(await proposeBacklogOrder(MISSION, "")), /n'existe plus/);
    assert.equal(aiCalls().length, 0);
    fake.reset();
    assert.match(errorOf(await proposeBacklogOrder("x", "")), /n'existe plus/);
    assert.equal(errorOf(await proposeBacklogOrder(MISSION, 42 as unknown as string)).length > 0, true);
    assert.equal(fake.ops.length + aiCalls().length, 0); // validations avant toute requête et tout appel
  });
});

describe("applyBacklogOrder", () => {
  const baseIds = [A, DONE, B, C];
  const sentIds = [A, B, C];
  const loaded = (rows: unknown[] = BACKLOG) =>
    routes(
      ["user_stories:select", (op) => (op.columns === "id, position" ? { data: baseIds.map((id, position) => ({ id, position })) } : { data: rows })],
      ["user_stories:update", { data: [{ id: A }] }],
    );

  test("applique l'ordre : seules des positions sont écrites (jamais contenu, points, statut ni sprint), la story terminée garde sa place", async () => {
    loaded();
    assert.deepEqual(await applyBacklogOrder(MISSION, baseIds, sentIds, [C, A, B]), { ok: true, moved: 3 });
    const updates = fake.on("user_stories", "update");
    for (const u of updates) assert.deepEqual(Object.keys(u.payload as object), ["position"]);
    assert.deepEqual(updates.map((u) => [filterValue(u, "eq", "id"), (u.payload as { position: number }).position]), [[C, 0], [A, 2], [B, 3]]); // DONE reste à la place 1
    assert.ok(fake.on("user_stories", "select").find((o) => o.columns === "id, position")!.filters.some((f) => f.kind === "is" && f.args[0] === "sprint_id" && f.args[1] === null));
    assert.deepEqual(fake.revalidated, [`/missions/${MISSION}`, "/missions"]);
  });

  test("le backlog a changé depuis la proposition (story apparue, partie, terminée, ordre différent) : rien n'est écrit", async () => {
    loaded([...BACKLOG, story("e5e5e5e5-e5e5-45e5-85e5-e5e5e5e5e5e5", "Nouvelle")]);
    assert.match(errorOf(await applyBacklogOrder(MISSION, baseIds, sentIds, [C, A, B])), /a changé entre-temps/);
    loaded(BACKLOG.map((s) => (s.id === B ? { ...s, status: "done" } : s)));
    assert.equal((await applyBacklogOrder(MISSION, baseIds, sentIds, [C, A, B])).ok, false);
    loaded([BACKLOG[2], BACKLOG[0], BACKLOG[1], BACKLOG[3]]);
    assert.equal((await applyBacklogOrder(MISSION, baseIds, sentIds, [C, A, B])).ok, false);
    assert.deepEqual(writes(), []);
  });

  test("ordre qui n'est pas une permutation des stories envoyées, identifiants invalides : refus sans écriture", async () => {
    loaded();
    const bad = await applyBacklogOrder(MISSION, baseIds, sentIds, [C, A]);
    assert.deepEqual([bad.ok, !bad.ok && bad.gone], [false, true]);
    assert.equal((await applyBacklogOrder(MISSION, ["x"], sentIds, [C, A, B])).ok, false);
    assert.equal((await applyBacklogOrder("x", baseIds, sentIds, [C, A, B])).ok, false);
    assert.deepEqual(writes(), []);
  });

  test("échec d'écriture en cours de route : message « Réordonnancement impossible » ; sans session : redirection", async () => {
    routes(["user_stories:select", (op) => (op.columns === "id, position" ? { data: baseIds.map((id, position) => ({ id, position })) } : { data: BACKLOG })], ["user_stories:update", { error: { code: "XX000" } }]);
    assert.match(errorOf(await applyBacklogOrder(MISSION, baseIds, sentIds, [C, A, B])), /Réordonnancement impossible/);
    fake.reset();
    fake.claims = null;
    await assert.rejects(() => applyBacklogOrder(MISSION, baseIds, sentIds, [C, A, B]), toLogin);
    await assert.rejects(() => proposeBacklogOrder(MISSION, ""), toLogin);
    assert.equal(fake.ops.length + fake.ai.calls.length, 0);
  });
});
