import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { CAPACITY_MAX } from "../../lib/domain/sprint-composition.ts";
import { composeSprint, placeStoriesInSprint } from "../../app/(app)/missions/sprint-composition-actions.ts";
import { errorOf, fake, filterValue, routes, toLogin, withHarness, writes } from "../helpers/harness.ts";

const MISSION = "6f6f6f6f-6f6f-46f6-86f6-6f6f6f6f6f6f";
const SPRINT = "7a7a7a7a-7a7a-47a7-87a7-7a7a7a7a7a7a";
const S1 = "a1a1a1a1-a1a1-41a1-81a1-a1a1a1a1a1a1";
const S2 = "b2b2b2b2-b2b2-42b2-82b2-b2b2b2b2b2b2";
const PLACED = "d4d4d4d4-d4d4-44d4-84d4-d4d4d4d4d4d4";

withHarness();

const sprintRow = (over: Record<string, unknown> = {}) => ({ name: "Sprint 1", goal: null, start_date: "2026-11-02", end_date: "2026-11-13", status: "planned", mission_id: MISSION, mission: { title: "Suivi", client: { name: "Atelier Lumière" } }, ...over });
const story = (id: string, title: string, over: Record<string, unknown> = {}) => ({ id, title, role: null, benefit: null, acceptance_criteria: null, points: 3, status: "todo", sprint_id: null, ...over });
const aiCalls = () => fake.ai.calls.filter((c) => c.name === "compose");

describe("composeSprint", () => {
  const compose = (stories: unknown[], sprint = sprintRow()) => routes(["sprints:select", { data: [sprint] }], ["user_stories:select", { data: stories }]);

  test("envoie le sprint, ce qui y est déjà et le backlog OUVERT hors sprint ; renvoie les stories proposées et le total des points déjà placés ; n'écrit rien", async () => {
    compose([story(S1, "Facturer"), story(S2, "Terminée", { status: "done" }), story(PLACED, "Déjà là", { sprint_id: SPRINT, points: 5 })]);
    fake.ai.replies.compose = { stories: [{ id: S1, reason: "Débloque la suite" }], goal: "Facturer proprement" };
    const r = await composeSprint(SPRINT, 8, "Priorité facturation");
    assert.equal(r.ok, true);
    assert.deepEqual(r.ok && [r.stories.map((s) => s.id), r.goal, r.placedPoints, r.capacity, r.sprintName], [[S1], "Facturer proprement", 5, 8, "Sprint 1"]);
    const [call] = aiCalls();
    for (const sent of ["Priorité facturation", "Suivi", "Atelier Lumière", "Déjà là", "Facturer"]) assert.ok(call.message.includes(sent), sent);
    assert.ok(!call.message.includes("Terminée")); // une story terminée n'est jamais envoyée
    assert.deepEqual(writes(), []);
  });

  test("un sprint qui a déjà un objectif ne reçoit jamais celui de l'IA ; une story qui n'est pas au backlog ne peut pas être proposée", async () => {
    compose([story(S1, "Facturer")], sprintRow({ goal: "Mon objectif" }));
    fake.ai.replies.compose = { stories: [{ id: S1 }, { id: "inconnue" }], goal: "Autre objectif" };
    const r = await composeSprint(SPRINT, "", "");
    assert.deepEqual(r.ok && [r.goal, r.stories.length, r.dropped], [null, 1, 1]);
  });

  test("capacité : le maximum accepté est accepté", async () => {
    compose([story(S1, "Facturer")]);
    fake.ai.replies.compose = { stories: [{ id: S1 }] };
    assert.equal((await composeSprint(SPRINT, CAPACITY_MAX, "")).ok, true);
    assert.equal((await composeSprint(SPRINT, "", "")).ok, true); // vide = pas de capacité visée
  });

  test("sprint clos, disparu, backlog vide : message, l'IA n'est pas appelée", async () => {
    compose([story(S1, "Facturer")], sprintRow({ status: "closed" }));
    assert.match(errorOf(await composeSprint(SPRINT, null, "")), /Ce sprint est clos/);
    routes();
    assert.match(errorOf(await composeSprint(SPRINT, null, "")), /n'existe plus/);
    compose([story(PLACED, "Déjà là", { sprint_id: SPRINT }), story(S2, "Terminée", { status: "done" })]);
    assert.match(errorOf(await composeSprint(SPRINT, null, "")), /backlog est vide/);
    assert.equal(aiCalls().length, 0);
  });

  test("capacité ou précision invalides, identifiant invalide : refus, l'IA n'est pas appelée", async () => {
    for (const cap of [0, -3, 1.5, "abc", CAPACITY_MAX + 1]) assert.equal((await composeSprint(SPRINT, cap, "")).ok, false);
    assert.equal((await composeSprint(SPRINT, null, 42 as unknown as string)).ok, false);
    assert.match(errorOf(await composeSprint("x", null, "")), /n'existe plus/);
    assert.equal(aiCalls().length + fake.ops.length, 0);
  });

  test("l'IA ne propose rien d'exploitable : message ; l'IA tombe en panne : échec général, journal sans contenu", async (t) => {
    compose([story(S1, "Facturer")]);
    fake.ai.replies.compose = { stories: [] };
    assert.match(errorOf(await composeSprint(SPRINT, null, "")), /rien proposé d'exploitable/);
    const log = t.mock.method(console, "error", () => {});
    fake.ai.replies.compose = new Error("erreur du modèle");
    assert.deepEqual(await composeSprint(SPRINT, null, "Précision SENTINELLE"), { ok: false, error: "Proposition impossible pour le moment. Réessaie." });
    assert.deepEqual(log.mock.calls[0].arguments, ["Composition de sprint impossible :", "erreur du modèle"]);
    assert.ok(!JSON.stringify(log.mock.calls).includes("SENTINELLE"));
  });
});

describe("placeStoriesInSprint", () => {
  /** Lecture du sprint, des stories demandées (au backlog), de la liste du sprint (une première lecture, puis la même augmentée au renumérotage) ; écritures qui réussissent. */
  const place = (over: { sprint?: unknown; ids?: string[]; wanted?: unknown[]; moved?: unknown; goalWrite?: unknown } = {}) => {
    const ids = over.ids ?? [S1, S2];
    const movedIds = ((over.moved as { data?: { id: string }[] } | undefined)?.data ?? ids.map((id) => ({ id }))).map((r) => r.id);
    let listReads = 0;
    routes(
      ["sprints:select", { data: [over.sprint ?? sprintRow()] }],
      ["user_stories:select", (op) => {
        if (op.columns === "id, mission_id, sprint_id, status") return { data: over.wanted ?? ids.map((id) => ({ id, mission_id: MISSION, sprint_id: null, status: "todo" })) };
        listReads++;
        return listReads === 1 ? { data: [{ id: PLACED, position: 0 }] } : { data: [{ id: PLACED, position: 0 }, ...movedIds.map((id) => ({ id, position: 1 }))] }; // même position pour toutes les stories placées, départagées à la renumérotation
      }],
      ["user_stories:update", (op) => (op.filters.some((f) => f.kind === "in") ? ((over.moved ?? { data: ids.map((id) => ({ id })) }) as object) : { data: [{ id: "x" }] })],
      ["sprints:update", (over.goalWrite ?? { data: [{ id: SPRINT }] }) as object],
    );
  };

  test("place les stories à la fin du sprint (une écriture conditionnée « au backlog » et « pas terminée »), puis renumérote dans l'ordre demandé", async () => {
    place();
    assert.deepEqual(await placeStoriesInSprint(SPRINT, [S2, S1], null), { ok: true, placed: 2, goalSet: false, goalSkipped: false, goalFailed: false });
    const [move] = fake.on("user_stories", "update");
    assert.deepEqual(move.payload, { sprint_id: SPRINT, position: 1 }); // à la suite de ce qui est déjà dans le sprint
    assert.deepEqual(move.filters.find((f) => f.kind === "in")?.args, ["id", [S2, S1]]);
    assert.ok(move.filters.some((f) => f.kind === "is" && f.args[0] === "sprint_id" && f.args[1] === null));
    assert.equal(filterValue(move, "neq", "status"), "done");
    // ordre demandé [S2, S1] après PLACED : S2 est déjà en position 1 (rien à écrire), S1 passe en 2
    assert.deepEqual(fake.on("user_stories", "update").slice(1).map((u) => [filterValue(u, "eq", "id"), (u.payload as { position: number }).position]), [[S1, 2]]);
    assert.deepEqual(writes().filter((w) => w.startsWith("sprints")), []);
    assert.deepEqual(fake.revalidated, [`/missions/${MISSION}`, "/missions"]);
  });

  test("objectif : écrit seulement s'il n'y en a pas (jamais écrasé) et si le sprint n'est pas clos ; sinon « déjà un objectif »", async () => {
    place({ ids: [S1] });
    assert.deepEqual(await placeStoriesInSprint(SPRINT, [S1], "  Mon objectif  "), { ok: true, placed: 1, goalSet: true, goalSkipped: false, goalFailed: false });
    const [g] = fake.on("sprints", "update");
    assert.deepEqual(g.payload, { goal: "Mon objectif" });
    assert.ok(g.filters.some((f) => f.kind === "is" && f.args[0] === "goal" && f.args[1] === null));
    assert.equal(filterValue(g, "neq", "status"), "closed");
    fake.reset();
    place({ ids: [S1], goalWrite: { data: [] } });
    const skipped = await placeStoriesInSprint(SPRINT, [S1], "Objectif");
    assert.deepEqual(skipped.ok && [skipped.goalSet, skipped.goalSkipped], [false, true]);
    fake.reset();
    place({ ids: [S1], goalWrite: { error: { code: "XX000" } } });
    const failedGoal = await placeStoriesInSprint(SPRINT, [S1], "Objectif");
    assert.deepEqual(failedGoal.ok && [failedGoal.goalFailed, failedGoal.goalSet], [true, false]); // les stories sont placées malgré tout
  });

  test("objectif fait d'espaces : aucune écriture d'objectif (jamais une chaîne vide qui bloquerait les objectifs suivants)", async () => {
    place({ ids: [S1] });
    const r = await placeStoriesInSprint(SPRINT, [S1], "   ");
    assert.deepEqual(r.ok && [r.goalSet, r.goalSkipped, r.goalFailed], [false, false, false]);
    assert.equal(fake.on("sprints", "update").length, 0);
  });

  test("sprint clos ou disparu, story plus au backlog / d'une autre mission / terminée : rien n'est écrit", async () => {
    place({ ids: [S1], sprint: sprintRow({ status: "closed" }) });
    assert.match(errorOf(await placeStoriesInSprint(SPRINT, [S1], null)), /Ce sprint est clos/);
    routes();
    assert.match(errorOf(await placeStoriesInSprint(SPRINT, [S1], null)), /n'existe plus/);
    for (const wrong of [{ sprint_id: PLACED }, { mission_id: "autre" }, { status: "done" }]) {
      fake.reset();
      place({ wanted: [{ id: S1, mission_id: MISSION, sprint_id: null, status: "todo", ...wrong }, { id: S2, mission_id: MISSION, sprint_id: null, status: "todo" }] });
      assert.match(errorOf(await placeStoriesInSprint(SPRINT, [S1, S2], null)), /a changé de liste/);
      assert.deepEqual(writes(), []);
    }
  });

  test("une story partie entre la lecture et l'écriture : celles qui sont placées le restent, leur ordre est enregistré, le message le dit", async () => {
    place({ moved: { data: [{ id: S1 }] } }); // S2 est partie
    const r = await placeStoriesInSprint(SPRINT, [S1, S2], null);
    assert.deepEqual(!r.ok && [r.gone, r.placed], [true, 1]);
    assert.match(!r.ok ? r.error : "", /1 story sur 2 a été placée/);
    assert.equal(fake.on("user_stories", "select").filter((o) => o.columns === "id, position").length, 2); // la liste du sprint est relue puis renumérotée (S1 y est déjà bien placée : rien d'autre à écrire)
    assert.deepEqual(fake.revalidated, [`/missions/${MISSION}`, "/missions"]);
  });

  test("le déclencheur refuse un sprint devenu clos (23514) : message « clos » ; autre erreur d'écriture : échec général sans plantage", async () => {
    place({ ids: [S1], moved: { error: { code: "23514" } } });
    assert.match(errorOf(await placeStoriesInSprint(SPRINT, [S1], null)), /Ce sprint est clos/);
    fake.reset();
    place({ ids: [S1], moved: { error: { code: "XX000" } } });
    assert.match(errorOf(await placeStoriesInSprint(SPRINT, [S1], null)), /Enregistrement impossible/);
  });

  test("entrées invalides : aucune story, doublons, trop nombreuses, objectif non textuel ou trop long, identifiant invalide — aucune requête", async () => {
    for (const ids of [[], [S1, S1], Array.from({ length: 61 }, (_, i) => `${String(i).padStart(8, "0")}-0000-4000-8000-000000000000`), ["x"]]) assert.equal((await placeStoriesInSprint(SPRINT, ids as string[], null)).ok, false);
    assert.equal((await placeStoriesInSprint(SPRINT, [S1], 42 as unknown as string)).ok, false);
    assert.equal((await placeStoriesInSprint(SPRINT, [S1], "x".repeat(2000))).ok, false);
    assert.equal((await placeStoriesInSprint("x", [S1], null)).ok, false);
    assert.equal(fake.ops.length, 0);
  });

  test("sans session : redirection vers la connexion, ni requête ni appel à l'IA", async () => {
    fake.claims = null;
    await assert.rejects(() => placeStoriesInSprint(SPRINT, [S1], null), toLogin);
    await assert.rejects(() => composeSprint(SPRINT, null, ""), toLogin);
    assert.equal(fake.ops.length + fake.ai.calls.length, 0);
  });
});
