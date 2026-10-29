import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { addStory, addStoryWithTasks, deleteStory, moveStory, reorderStories, setStorySprint, setStoryStatus, updateStory } from "../../app/(app)/missions/story-actions.ts";
import { type Reply, fake, filterValue, form, routes, toLogin, withHarness, writes } from "../helpers/harness.ts";

const MISSION = "11a1a1a1-a1a1-41a1-81a1-a1a1a1a1a1a1";
const CLIENT = "22b2b2b2-b2b2-42b2-82b2-b2b2b2b2b2b2";
const STORY = "33c3c3c3-c3c3-43c3-83c3-c3c3c3c3c3c3";
const OTHER = "44d4d4d4-d4d4-44d4-84d4-d4d4d4d4d4d4";
const SPRINT = "55e5e5e5-e5e5-45e5-85e5-e5e5e5e5e5e5";
const THIRD = "77a7a7a7-a7a7-47a7-87a7-a7a7a7a7a7a7";
const NOTE = "66f6f6f6-f6f6-46f6-86f6-f6f6f6f6f6f6";
const VALID = { title: "Relancer les factures", role: "freelance", benefit: "être payé à temps", acceptance_criteria: "", points: "3", status: "todo" };
const REFRESHED = [`/missions/${MISSION}`, "/missions", `/clients/${CLIENT}`];

withHarness();

/** La mission existe (et donne sa fiche) ; la dernière story du backlog est en position 4 ; l'insertion renvoie STORY. */
const withMission = (extra: Parameters<typeof routes> = []) =>
  routes(
    ["missions:select", { data: [{ id: MISSION, client_id: CLIENT }] }],
    ["user_stories:select", { data: [{ position: 4 }] }],
    ["user_stories:insert", { data: [{ id: STORY }] }],
    ...extra,
  );

describe("addStory", () => {
  test("insère à la dernière place du backlog hors sprint, rattachée à la mission vérifiée ; mission, liste et fiche revalidées", async () => {
    withMission();
    assert.deepEqual(await addStory(MISSION, {}, form(VALID)), { ok: true });
    const [op] = fake.on("user_stories", "insert");
    assert.deepEqual(op.payload, { title: "Relancer les factures", role: "freelance", benefit: "être payé à temps", acceptance_criteria: null, points: 3, status: "todo", mission_id: MISSION, position: 5, source_note_id: null });
    assert.ok(fake.on("user_stories", "select")[0].filters.some((f) => f.kind === "is" && f.args[0] === "sprint_id" && f.args[1] === null)); // la fin du backlog, pas d'un sprint
    assert.deepEqual(fake.revalidated, REFRESHED);
  });

  test("note d'origine : gardée seulement si c'est une note de la fiche de CETTE mission, sinon la story est gardée sans source", async () => {
    routes(["missions:select", { data: [{ id: MISSION, client_id: CLIENT }] }], ["notes:select", { data: [{ id: NOTE }] }], ["user_stories:insert", { data: [{ id: STORY }] }]);
    await addStory(MISSION, {}, form({ ...VALID, source_note_id: NOTE }));
    assert.equal((fake.on("user_stories", "insert")[0].payload as { source_note_id: string }).source_note_id, NOTE);
    assert.equal(filterValue(fake.on("notes", "select")[0], "eq", "client_id"), CLIENT);
    fake.reset();
    routes(["missions:select", { data: [{ id: MISSION, client_id: CLIENT }] }], ["user_stories:insert", { data: [{ id: STORY }] }]);
    await addStory(MISSION, {}, form({ ...VALID, source_note_id: NOTE }));
    assert.equal((fake.on("user_stories", "insert")[0].payload as { source_note_id: null }).source_note_id, null);
  });

  test("mission disparue ou invalide : « n'existe plus » (écran rechargé) ; saisie invalide : erreurs, aucune requête ; erreur de la base : message", async () => {
    assert.deepEqual((({ message, gone }) => ({ message, gone }))(await addStory(MISSION, {}, form(VALID))), { message: "Cette mission n'existe plus.", gone: true });
    assert.equal(fake.on("user_stories", "insert").length, 0);
    fake.reset();
    assert.ok((await addStory(MISSION, {}, form({ ...VALID, title: " " }))).errors?.title);
    assert.ok((await addStory(MISSION, {}, form({ ...VALID, points: "4" }))).errors?.points);
    assert.equal((await addStory("x", {}, form(VALID))).gone, true);
    assert.equal(fake.ops.length, 0);
    routes(["missions:select", { data: [{ id: MISSION, client_id: CLIENT }] }], ["user_stories:insert", { error: { code: "XX000" } }]);
    assert.match((await addStory(MISSION, {}, form(VALID))).message ?? "", /Enregistrement impossible/);
  });
});

describe("addStoryWithTasks (proposition de l'IA gardée)", () => {
  const TASKS = ["Écrire le modèle", " Tester "];

  test("la story, puis ses tâches en UNE insertion, positions 0, 1…", async () => {
    withMission([["tasks:insert", { data: [] }]]);
    assert.deepEqual(await addStoryWithTasks(MISSION, TASKS, {}, form(VALID)), { ok: true });
    assert.deepEqual(writes(), ["user_stories:insert", "tasks:insert"]);
    assert.deepEqual(fake.on("tasks", "insert")[0].payload, [{ story_id: STORY, title: "Écrire le modèle", position: 0 }, { story_id: STORY, title: "Tester", position: 1 }]);
  });

  test("les tâches échouent : la story est retirée (tout ou rien) et le message le dit", async () => {
    withMission([["tasks:insert", { error: { code: "XX000" } }], ["user_stories:delete", { data: [{ id: STORY }] }]]);
    const r = await addStoryWithTasks(MISSION, TASKS, {}, form(VALID));
    assert.match(r.message ?? "", /rien n'a été ajouté/);
    assert.deepEqual(writes(), ["user_stories:insert", "tasks:insert", "user_stories:delete"]);
    assert.equal(filterValue(fake.on("user_stories", "delete")[0], "eq", "id"), STORY);
    assert.deepEqual(fake.revalidated, []);
  });

  test("retrait « réussi » sans aucune ligne supprimée, ou exception pendant les tâches : traité comme un retrait raté (succès partiel avec avis)", async () => {
    withMission([["tasks:insert", { error: { code: "XX000" } }], ["user_stories:delete", { data: [] }]]);
    assert.match((await addStoryWithTasks(MISSION, TASKS, {}, form(VALID))).notice ?? "", /sans ses tâches/);
    fake.reset();
    withMission([["tasks:insert", () => { throw new Error("réseau coupé"); }], ["user_stories:delete", { data: [{ id: STORY }] }]]);
    assert.match((await addStoryWithTasks(MISSION, TASKS, {}, form(VALID))).message ?? "", /rien n'a été ajouté/);
  });

  test("aucune tâche proposée : la story seule est ajoutée, pas d'insertion de tâches", async () => {
    withMission();
    assert.deepEqual(await addStoryWithTasks(MISSION, [], {}, form(VALID)), { ok: true });
    assert.equal(fake.on("tasks", "insert").length, 0);
    assert.match((await addStoryWithTasks(MISSION, "pas une liste" as unknown as string[], {}, form(VALID))).message ?? "", /tâches au plus/);
  });

  test("les tâches ET le retrait échouent : succès partiel avec avis (la proposition est retirée de l'écran, pas de doublon au second « Garder »)", async () => {
    withMission([["tasks:insert", { error: { code: "XX000" } }], ["user_stories:delete", { error: { code: "XX000" } }]]);
    const r = await addStoryWithTasks(MISSION, TASKS, {}, form(VALID));
    assert.equal(r.ok, true);
    assert.match(r.notice ?? "", /sans ses tâches/);
    assert.deepEqual(fake.revalidated, REFRESHED);
  });

  test("titres contrôlés avant toute écriture, en nommant la tâche en cause ; trop de tâches refusé", async () => {
    withMission();
    assert.match((await addStoryWithTasks(MISSION, ["Ok", " "], {}, form(VALID))).message ?? "", /^Tâche 2 : /);
    assert.match((await addStoryWithTasks(MISSION, Array.from({ length: 50 }, () => "T"), {}, form(VALID))).message ?? "", /tâches au plus/);
    assert.equal(fake.on("user_stories", "insert").length, 0);
  });
});

describe("updateStory / setStoryStatus", () => {
  test("modifier : filtre sur l'identifiant, relu, mission revalidée ; story disparue : « n'existe plus »", async () => {
    routes(["user_stories:update", { data: [{ id: STORY, mission_id: MISSION }] }], ["missions:select", { data: [{ client_id: CLIENT }] }]);
    assert.deepEqual(await updateStory(STORY, {}, form(VALID)), { ok: true });
    const [op] = fake.on("user_stories", "update");
    assert.equal(filterValue(op, "eq", "id"), STORY);
    assert.equal(op.returning, true);
    assert.deepEqual(fake.revalidated, REFRESHED);
    routes();
    assert.equal((await updateStory(STORY, {}, form(VALID))).gone, true);
    assert.equal((await updateStory("x", {}, form(VALID))).gone, true);
  });

  test("modifier, statut intact (égal à `initial_status`) : le statut n'est pas écrit, un changement fait par le menu entre-temps reste", async () => {
    routes(["user_stories:update", { data: [{ id: STORY, mission_id: MISSION }] }], ["missions:select", { data: [{ client_id: CLIENT }] }]);
    assert.deepEqual(await updateStory(STORY, {}, form({ ...VALID, status: "todo", initial_status: "todo", title: "Nouveau titre" })), { ok: true });
    const payload = fake.on("user_stories", "update")[0].payload as Record<string, unknown>;
    assert.equal(payload.title, "Nouveau titre");
    assert.ok(!("status" in payload), "aucun `status` dans la mise à jour");
  });

  test("modifier, statut changé dans le formulaire : il est écrit ; sans `initial_status` (ancien formulaire) : écrit comme avant ; statut invalide : refusé sans requête", async () => {
    routes(["user_stories:update", { data: [{ id: STORY, mission_id: MISSION }] }], ["missions:select", { data: [{ client_id: CLIENT }] }]);
    await updateStory(STORY, {}, form({ ...VALID, status: "done", initial_status: "todo" }));
    assert.equal((fake.on("user_stories", "update")[0].payload as Record<string, unknown>).status, "done");
    fake.reset();
    routes(["user_stories:update", { data: [{ id: STORY, mission_id: MISSION }] }], ["missions:select", { data: [{ client_id: CLIENT }] }]);
    await updateStory(STORY, {}, form({ ...VALID, status: "in_progress" }));
    assert.equal((fake.on("user_stories", "update")[0].payload as Record<string, unknown>).status, "in_progress");
    fake.reset();
    const r = await updateStory(STORY, {}, form({ ...VALID, status: "archivée", initial_status: "archivée" }));
    assert.ok(r.errors?.status);
    assert.equal(fake.on("user_stories", "update").length, 0);
  });

  test("changer le statut : seul le statut est écrit ; statut inconnu refusé sans requête ; story disparue : écran rechargé", async () => {
    routes(["user_stories:update", { data: [{ id: STORY, mission_id: MISSION }] }], ["missions:select", { data: [{ client_id: CLIENT }] }]);
    assert.deepEqual(await setStoryStatus(STORY, "done"), {});
    assert.deepEqual(fake.on("user_stories", "update")[0].payload, { status: "done" });
    fake.reset();
    assert.equal((await setStoryStatus(STORY, "archivée")).message, "Choisis un statut.");
    assert.equal(fake.ops.length, 0);
    routes();
    assert.equal((await setStoryStatus(STORY, "todo")).gone, true);
    routes(["user_stories:update", { error: { code: "XX000" } }]);
    assert.match((await setStoryStatus(STORY, "todo")).message ?? "", /Changement impossible/);
  });
});

describe("reorderStories", () => {
  const rows = [{ id: STORY, position: 0 }, { id: OTHER, position: 1 }, { id: THIRD, position: 2 }];
  const pairs = () => fake.on("user_stories", "update").map((u) => [filterValue(u, "eq", "id"), (u.payload as { position: number }).position]);

  test("backlog hors sprint : la liste visée est celle de `sprint_id` nul ; seules les positions qui changent sont écrites", async () => {
    routes(["user_stories:select", { data: rows }], ["user_stories:update", { data: [{ id: STORY }] }], ["missions:select", { data: [{ client_id: CLIENT }] }]);
    assert.deepEqual(await reorderStories(MISSION, [OTHER, STORY, THIRD]), {});
    assert.ok(fake.on("user_stories", "select")[0].filters.some((f) => f.kind === "is" && f.args[0] === "sprint_id" && f.args[1] === null));
    assert.deepEqual(pairs(), [[OTHER, 0], [STORY, 1]]); // la troisième reste en place
    assert.deepEqual(fake.revalidated, REFRESHED);
  });

  test("dans un sprint (non clos) : la liste visée est celle de CE sprint", async () => {
    routes(["sprints:select", { data: [{ status: "active" }] }], ["user_stories:select", { data: rows }], ["user_stories:update", { data: [{ id: STORY }] }]);
    assert.deepEqual(await reorderStories(MISSION, [THIRD, OTHER, STORY], SPRINT), {});
    assert.equal(filterValue(fake.on("user_stories", "select")[0], "eq", "sprint_id"), SPRINT);
    assert.deepEqual(pairs(), [[THIRD, 0], [STORY, 2]]); // celle du milieu reste en place
  });

  test("un sprint clos est figé (liste non réordonnable) ; sprint disparu ; liste changée entre-temps : rien d'écrit, écran rechargé", async () => {
    routes(["sprints:select", { data: [{ status: "closed" }] }], ["user_stories:select", { data: rows }]);
    assert.equal((await reorderStories(MISSION, [OTHER, STORY, THIRD], SPRINT)).gone, true);
    assert.equal(fake.on("user_stories").length, 0); // la liste d'un sprint clos n'est même pas lue
    routes();
    assert.equal((await reorderStories(MISSION, [STORY, OTHER], SPRINT)).gone, true);
    routes(["user_stories:select", { data: rows }]);
    assert.match((await reorderStories(MISSION, [STORY])).message ?? "", /Le backlog a changé entre-temps/);
    assert.deepEqual(writes(), []);
  });
});

describe("setStorySprint (placer une story)", () => {
  const story = (sprintStatus: string | null) => ({ data: [{ mission_id: MISSION, sprint: sprintStatus ? { status: sprintStatus } : null }] });

  test("vers un sprint planifié de la même mission : à la dernière place de la liste d'arrivée", async () => {
    routes(["user_stories:select", (op) => (op.columns?.includes("sprint:sprints") ? story(null) : { data: [{ position: 2 }] })], ["sprints:select", { data: [{ status: "planned", mission_id: MISSION }] }], ["user_stories:update", { data: [{ id: STORY }] }], ["missions:select", { data: [{ client_id: CLIENT }] }]);
    assert.deepEqual(await setStorySprint(STORY, SPRINT), {});
    const [op] = fake.on("user_stories", "update");
    assert.deepEqual(op.payload, { sprint_id: SPRINT, position: 3 });
    assert.equal(filterValue(op, "eq", "id"), STORY);
    assert.deepEqual(fake.revalidated, REFRESHED);
  });

  test("refus : story d'un sprint clos (figée), sprint clos, sprint d'une autre mission, sprint ou story disparus — aucune écriture", async () => {
    routes(["user_stories:select", story("closed")]);
    assert.match((await setStorySprint(STORY, SPRINT)).message ?? "", /sprint clos : elle n'en sort plus/);
    routes(["user_stories:select", story(null)], ["sprints:select", { data: [{ status: "closed", mission_id: MISSION }] }]);
    assert.match((await setStorySprint(STORY, SPRINT)).message ?? "", /n'accepte plus de story/);
    routes(["user_stories:select", story(null)], ["sprints:select", { data: [{ status: "planned", mission_id: "autre" }] }]);
    assert.match((await setStorySprint(STORY, SPRINT)).message ?? "", /Ce sprint n'existe plus/);
    routes();
    assert.match((await setStorySprint(STORY, SPRINT)).message ?? "", /user story n'existe plus/);
    assert.equal((await setStorySprint("x", null)).gone, true);
    assert.deepEqual(writes(), []);
  });
});

describe("moveStory (glisser-déposer entre listes)", () => {
  test("place la story puis applique l'ordre voulu ; la story doit figurer dans la liste d'arrivée", async () => {
    routes(
      ["user_stories:select", (op) => (op.columns?.includes("sprint:sprints") ? { data: [{ mission_id: MISSION, sprint: null }] } : op.columns === "id, position" ? { data: [{ id: OTHER, position: 0 }, { id: STORY, position: 1 }] } : { data: [{ position: 0 }] })],
      ["user_stories:update", { data: [{ id: STORY }] }],
      ["missions:select", { data: [{ client_id: CLIENT }] }],
    );
    assert.deepEqual(await moveStory(MISSION, STORY, null, [STORY, OTHER]), {});
    // placer (dernière place du backlog), puis renuméroter : la story passe en tête, l'autre derrière
    assert.deepEqual(writes(), ["user_stories:update", "user_stories:update", "user_stories:update"]);
    assert.deepEqual(fake.on("user_stories", "update")[0].payload, { sprint_id: null, position: 1 });
    assert.deepEqual(fake.on("user_stories", "update").slice(1).map((u) => [filterValue(u, "eq", "id"), (u.payload as { position: number }).position]), [[STORY, 0], [OTHER, 1]]);
    assert.deepEqual([...new Set(fake.revalidated)], REFRESHED); // revalidé à chaque étape
    fake.reset();
    assert.equal((await moveStory(MISSION, STORY, null, [OTHER])).gone, true); // la story n'est pas dans l'ordre demandé
    assert.equal(fake.ops.length, 0);
  });

  const moving = (renumberRows: unknown, updates: Reply) =>
    routes(
      ["user_stories:select", (op) => (op.columns?.includes("sprint:sprints") ? { data: [{ mission_id: MISSION, sprint: null }] } : op.columns === "id, position" ? { data: renumberRows } : { data: [{ position: 0 }] })],
      ["sprints:select", { data: [{ status: "planned", mission_id: MISSION }] }],
      ["user_stories:update", updates],
      ["missions:select", { data: [{ client_id: CLIENT }] }],
    );

  test("vers un sprint : la story y est placée (sprint_id de la cible), puis l'ordre de CE sprint est appliqué", async () => {
    moving([{ id: OTHER, position: 0 }, { id: STORY, position: 1 }], { data: [{ id: STORY }] });
    assert.deepEqual(await moveStory(MISSION, STORY, SPRINT, [STORY, OTHER]), {});
    assert.deepEqual(fake.on("user_stories", "update")[0].payload, { sprint_id: SPRINT, position: 1 });
    const read = fake.on("user_stories", "select").find((o) => o.columns === "id, position")!;
    assert.equal(filterValue(read, "eq", "sprint_id"), SPRINT);
  });

  test("la liste a changé entre-temps : message « recommence » ; l'ordre n'a pas pu être écrit : « dernière place » ; sprint clos : refus", async () => {
    moving([{ id: OTHER, position: 0 }, { id: STORY, position: 1 }, { id: THIRD, position: 2 }], { data: [{ id: STORY }] }); // 3 en base, 2 demandées
    const changed = await moveStory(MISSION, STORY, null, [STORY, OTHER]);
    assert.match(changed.message ?? "", /recommence le déplacement/);
    assert.equal(changed.gone, true);
    fake.reset();
    routes(
      ["user_stories:select", (op) => (op.columns?.includes("sprint:sprints") ? { data: [{ mission_id: MISSION, sprint: null }] } : op.columns === "id, position" ? { error: { code: "XX000" } } : { data: [{ position: 0 }] })],
      ["user_stories:update", { data: [{ id: STORY }] }],
    );
    assert.match((await moveStory(MISSION, STORY, null, [STORY, OTHER])).message ?? "", /Elle est en dernière place/);
    fake.reset();
    routes(["user_stories:select", { data: [{ mission_id: MISSION, sprint: null }] }], ["sprints:select", { data: [{ status: "closed", mission_id: MISSION }] }]);
    assert.match((await moveStory(MISSION, STORY, SPRINT, [STORY])).message ?? "", /n'accepte plus de story/);
    assert.deepEqual(writes(), []);
  });

  test("remettre une story au backlog (sprint nul) : écrit sprint_id nul à la dernière place du backlog", async () => {
    routes(["user_stories:select", (op) => (op.columns?.includes("sprint:sprints") ? { data: [{ mission_id: MISSION, sprint: { status: "planned" } }] } : { data: [{ position: 3 }] })], ["user_stories:update", { data: [{ id: STORY }] }], ["missions:select", { data: [{ client_id: CLIENT }] }]);
    assert.deepEqual(await setStorySprint(STORY, null), {});
    assert.deepEqual(fake.on("user_stories", "update")[0].payload, { sprint_id: null, position: 4 });
  });
});

describe("deleteStory", () => {
  test("supprime la story visée (relue) puis revalide ; déjà supprimée : succès sans revalidation ; erreur : « conservée »", async () => {
    routes(["user_stories:delete", { data: [{ id: STORY, mission_id: MISSION }] }], ["missions:select", { data: [{ client_id: CLIENT }] }]);
    assert.deepEqual(await deleteStory(STORY), {});
    const [op] = fake.on("user_stories", "delete");
    assert.equal(filterValue(op, "eq", "id"), STORY);
    assert.equal(op.returning, true);
    assert.deepEqual(fake.revalidated, REFRESHED);
    fake.reset();
    routes();
    assert.deepEqual(await deleteStory(STORY), {});
    assert.deepEqual(fake.revalidated, []);
    routes(["user_stories:delete", { error: { code: "XX000" } }]);
    assert.match((await deleteStory(STORY)).message ?? "", /conservée/);
  });
});

test("sans session : redirection vers la connexion, aucune requête", async () => {
  fake.claims = null;
  await assert.rejects(() => addStory(MISSION, {}, form(VALID)), toLogin);
  await assert.rejects(() => addStoryWithTasks(MISSION, ["T"], {}, form(VALID)), toLogin);
  await assert.rejects(() => updateStory(STORY, {}, form(VALID)), toLogin);
  await assert.rejects(() => setStoryStatus(STORY, "done"), toLogin);
  await assert.rejects(() => reorderStories(MISSION, [STORY]), toLogin);
  await assert.rejects(() => setStorySprint(STORY, null), toLogin);
  await assert.rejects(() => moveStory(MISSION, STORY, null, [STORY]), toLogin);
  await assert.rejects(() => deleteStory(STORY), toLogin);
  assert.equal(fake.ops.length, 0);
});
