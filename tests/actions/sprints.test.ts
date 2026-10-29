import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { closeSprint, createSprint, deleteSprint, startSprint, updateSprint } from "../../app/(app)/missions/sprint-actions.ts";
import { fake, filterValue, form, routes, toLogin, withHarness, writes } from "../helpers/harness.ts";

const MISSION = "f6f6f6f6-f6f6-46f6-86f6-f6f6f6f6f6f6";
const SPRINT = "a7a7a7a7-a7a7-47a7-87a7-a7a7a7a7a7a7";
const TARGET = "b8b8b8b8-b8b8-48b8-88b8-b8b8b8b8b8b8";
const S1 = "c9c9c9c9-c9c9-49c9-89c9-c9c9c9c9c9c9";
const S2 = "dadadada-dada-4ada-8ada-dadadadadada";
const VALID = { name: "Sprint 1", goal: "Livrer la V1", start_date: "2026-11-02", end_date: "2026-11-13" };
const PAGE = `/missions/${MISSION}`;

withHarness();

describe("createSprint", () => {
  test("crée un sprint planifié dans la mission vérifiée et revalide la page de la mission", async () => {
    routes(["missions:select", { data: [{ id: MISSION }] }], ["sprints:select", { data: [] }]);
    assert.deepEqual(await createSprint(MISSION, {}, form(VALID)), { ok: true });
    assert.deepEqual(fake.on("sprints", "insert")[0].payload, { ...VALID, mission_id: MISSION });
    assert.equal(filterValue(fake.on("missions", "select")[0], "eq", "id"), MISSION);
    assert.deepEqual(fake.revalidated, [PAGE]);
  });

  test("nom vide ou « Sprint N » déjà pris : prochain numéro libre calculé côté serveur sur les noms lus au moment de l'écriture", async () => {
    routes(["missions:select", { data: [{ id: MISSION }] }], ["sprints:select", { data: [{ name: "Sprint 1" }, { name: "Sprint 2" }] }]);
    await createSprint(MISSION, {}, form({ ...VALID, name: "" }));
    await createSprint(MISSION, {}, form({ ...VALID, name: "Sprint 2" }));
    await createSprint(MISSION, {}, form({ ...VALID, name: "Refonte" }));
    assert.deepEqual(fake.on("sprints", "insert").map((o) => (o.payload as { name: string }).name), ["Sprint 3", "Sprint 3", "Refonte"]);
  });

  test("mission disparue ou identifiant invalide : « n'existe plus » (l'écran se recharge) ; saisie invalide : erreurs, aucune écriture", async () => {
    const gone = await createSprint(MISSION, {}, form(VALID));
    assert.deepEqual([gone.message, gone.gone], ["Cette mission n'existe plus.", true]);
    assert.equal(fake.on("sprints", "insert").length, 0);
    assert.equal((await createSprint("x", {}, form(VALID))).gone, true);
    routes(["missions:select", { data: [{ id: MISSION }] }]);
    assert.ok((await createSprint(MISSION, {}, form({ ...VALID, end_date: "2026-10-01" }))).errors?.end_date);
    assert.equal(fake.on("sprints", "insert").length, 0);
  });

  test("erreur de la base : message général, rien de revalidé ; lecture des noms en erreur : échec aussi", async () => {
    routes(["missions:select", { data: [{ id: MISSION }] }], ["sprints:insert", { error: { code: "XX000" } }]);
    assert.match((await createSprint(MISSION, {}, form(VALID))).message ?? "", /Enregistrement impossible/);
    routes(["sprints:select", { error: { code: "XX000" } }]);
    assert.match((await createSprint(MISSION, {}, form(VALID))).message ?? "", /Enregistrement impossible/);
    assert.deepEqual(fake.revalidated, []);
  });
});

describe("updateSprint", () => {
  test("un sprint clos garde ses dates : seuls le nom et l'objectif sont écrits", async () => {
    routes(["sprints:select", { data: [{ status: "closed" }] }], ["sprints:update", { data: [{ id: SPRINT, mission_id: MISSION }] }]);
    assert.deepEqual(await updateSprint(SPRINT, {}, form({ ...VALID, name: "Renommé", start_date: "2026-12-01", end_date: "2026-12-31" })), { ok: true });
    assert.deepEqual(fake.on("sprints", "update")[0].payload, { name: "Renommé", goal: "Livrer la V1" });
    assert.deepEqual(fake.revalidated, [PAGE]);
  });

  test("un sprint en cours : tout se modifie aussi (seul le sprint clos est figé)", async () => {
    routes(["sprints:select", { data: [{ status: "active" }] }], ["sprints:update", { data: [{ id: SPRINT, mission_id: MISSION }] }]);
    await updateSprint(SPRINT, {}, form(VALID));
    assert.deepEqual(fake.on("sprints", "update")[0].payload, VALID);
  });

  test("un sprint planifié ou en cours : tout se modifie, filtre sur l'identifiant, relu", async () => {
    routes(["sprints:select", { data: [{ status: "planned" }] }], ["sprints:update", { data: [{ id: SPRINT, mission_id: MISSION }] }]);
    await updateSprint(SPRINT, {}, form(VALID));
    const [op] = fake.on("sprints", "update");
    assert.deepEqual(op.payload, VALID);
    assert.equal(filterValue(op, "eq", "id"), SPRINT);
    assert.equal(op.returning, true);
  });

  test("sprint disparu (lecture, puis écriture) ou identifiant invalide : « n'existe plus » ; erreur : message général", async () => {
    assert.equal((await updateSprint(SPRINT, {}, form(VALID))).gone, true);
    routes(["sprints:select", { data: [{ status: "planned" }] }]);
    assert.equal((await updateSprint(SPRINT, {}, form(VALID))).gone, true);
    assert.equal((await updateSprint("x", {}, form(VALID))).gone, true);
    routes(["sprints:select", { data: [{ status: "planned" }] }], ["sprints:update", { error: { code: "XX000" } }]);
    assert.match((await updateSprint(SPRINT, {}, form(VALID))).message ?? "", /Enregistrement impossible/);
  });
});

describe("startSprint", () => {
  test("démarre seulement un sprint planifié (statut attendu dans la requête) et revalide", async () => {
    routes(["sprints:update", { data: [{ id: SPRINT, mission_id: MISSION }] }]);
    assert.deepEqual(await startSprint(SPRINT), {});
    const [op] = fake.on("sprints", "update");
    assert.deepEqual(op.payload, { status: "active" });
    assert.equal(filterValue(op, "eq", "status"), "planned");
    assert.deepEqual(fake.revalidated, [PAGE]);
  });

  test("la mission « à planifier » passe « en cours » : seulement depuis « planned », sur la mission du sprint", async () => {
    routes(["sprints:update", { data: [{ id: SPRINT, mission_id: MISSION }] }]);
    await startSprint(SPRINT);
    const [op] = fake.on("missions", "update");
    assert.deepEqual(op.payload, { status: "in_progress" });
    assert.equal(filterValue(op, "eq", "id"), MISSION);
    assert.equal(filterValue(op, "eq", "status"), "planned");
  });

  test("échec de la bascule de la mission : le sprint reste démarré, aucun message", async () => {
    routes(["sprints:update", { data: [{ id: SPRINT, mission_id: MISSION }] }], ["missions:update", { error: { code: "XX000" } }]);
    assert.deepEqual(await startSprint(SPRINT), {});
    assert.deepEqual(fake.revalidated, [PAGE]);
  });

  test("démarrage refusé : la mission n'est jamais touchée", async () => {
    routes(["sprints:update", { error: { code: "23505" } }]);
    await startSprint(SPRINT);
    routes(["sprints:select", { data: [{ id: SPRINT }] }]);
    await startSprint(SPRINT);
    assert.equal(fake.on("missions", "update").length, 0);
  });

  test("un seul sprint en cours par mission (23505) ; sprint plus planifié ; sprint disparu ; autre erreur", async () => {
    routes(["sprints:update", { error: { code: "23505" } }]);
    const already = await startSprint(SPRINT);
    assert.match(already.message ?? "", /déjà en cours/);
    assert.equal(already.gone, true);
    routes(["sprints:select", { data: [{ id: SPRINT }] }]);
    assert.match((await startSprint(SPRINT)).message ?? "", /ne peut plus être démarré/);
    routes();
    assert.match((await startSprint(SPRINT)).message ?? "", /n'existe plus/);
    routes(["sprints:update", { error: { code: "XX000" } }]);
    assert.match((await startSprint(SPRINT)).message ?? "", /Démarrage impossible/);
    assert.equal((await startSprint("x")).gone, true);
    assert.deepEqual(fake.revalidated, []);
  });
});

describe("closeSprint", () => {
  const active = { data: [{ status: "active", mission_id: MISSION }] };

  test("les stories non terminées sont déplacées (en UNE écriture) AVANT le changement d'état ; les terminées restent ; clôture seulement si « en cours »", async () => {
    routes(
      ["sprints:select", active],
      ["user_stories:select", (op) => (op.columns === "id" ? { data: [{ id: S1 }, { id: S2 }] } : { data: [{ position: 4 }] })],
      ["user_stories:update", { data: [{ id: S1 }, { id: S2 }] }],
      ["sprints:update", { data: [{ id: SPRINT }] }],
    );
    assert.deepEqual(await closeSprint(SPRINT, null), {});
    assert.deepEqual(writes(), ["user_stories:update", "sprints:update"]); // le sprint reste « en cours » et rejouable si le déplacement échoue
    const open = fake.on("user_stories", "select")[0];
    assert.equal(filterValue(open, "eq", "sprint_id"), SPRINT);
    assert.equal(filterValue(open, "neq", "status"), "done");
    const [moved] = fake.on("user_stories", "update");
    assert.deepEqual(moved.payload, { sprint_id: null, position: 5 }); // à la suite du backlog
    const tail = fake.on("user_stories", "select").find((o) => o.columns === "position");
    assert.ok(tail!.filters.some((f) => f.kind === "is" && f.args[0] === "sprint_id" && f.args[1] === null));
    assert.equal(filterValue(tail!, "eq", "mission_id"), MISSION);
    assert.deepEqual(moved.filters.find((f) => f.kind === "in")?.args, ["id", [S1, S2]]);
    const [closed] = fake.on("sprints", "update");
    assert.deepEqual(closed.payload, { status: "closed" });
    assert.equal(filterValue(closed, "eq", "status"), "active");
    assert.deepEqual(fake.revalidated, [PAGE]);
  });

  test("aucune story ouverte : aucun déplacement, le sprint est clos directement", async () => {
    routes(["sprints:select", active], ["user_stories:select", { data: [] }], ["sprints:update", { data: [{ id: SPRINT }] }]);
    assert.deepEqual(await closeSprint(SPRINT, null), {});
    assert.deepEqual(writes(), ["sprints:update"]);
    fake.reset();
    routes(["sprints:select", active], ["user_stories:select", { data: [] }], ["sprints:update", { data: [{ id: SPRINT }] }]);
    assert.deepEqual(await closeSprint(SPRINT, TARGET), {}); // une cible n'est contrôlée que s'il y a des stories à y mettre
    assert.deepEqual(writes(), ["sprints:update"]);
  });

  test("vers un sprint planifié de la même mission : positions à la suite de ce sprint", async () => {
    routes(
      ["sprints:select", (op) => (filterValue(op, "eq", "id") === TARGET ? { data: [{ status: "planned", mission_id: MISSION }] } : active)],
      ["user_stories:select", (op) => (op.columns === "id" ? { data: [{ id: S1 }] } : { data: [] })],
      ["user_stories:update", { data: [{ id: S1 }] }],
      ["sprints:update", { data: [{ id: SPRINT }] }],
    );
    assert.deepEqual(await closeSprint(SPRINT, TARGET), {});
    assert.deepEqual(fake.on("user_stories", "update")[0].payload, { sprint_id: TARGET, position: 0 });
    const tail = fake.on("user_stories", "select").find((o) => o.columns === "position");
    assert.equal(filterValue(tail!, "eq", "sprint_id"), TARGET); // la fin de la liste d'arrivée, pas du backlog
    assert.equal(filterValue(tail!, "eq", "mission_id"), MISSION);
  });

  test("cible d'une autre mission, close ou en cours : refus, rien n'est déplacé, le sprint reste en cours", async () => {
    for (const target of [{ status: "planned", mission_id: "autre" }, { status: "closed", mission_id: MISSION }, { status: "active", mission_id: MISSION }]) {
      fake.reset();
      routes(["sprints:select", (op) => (filterValue(op, "eq", "id") === TARGET ? { data: [target] } : active)], ["user_stories:select", { data: [{ id: S1 }] }]);
      assert.match((await closeSprint(SPRINT, TARGET)).message ?? "", /n'existe plus ou n'est plus planifié/);
      assert.deepEqual(writes(), []);
    }
  });

  test("sprint qui n'est plus en cours, disparu, ou identifiants invalides : refus sans écriture", async () => {
    routes(["sprints:select", { data: [{ status: "planned", mission_id: MISSION }] }]);
    assert.match((await closeSprint(SPRINT, null)).message ?? "", /n'est plus en cours/);
    routes();
    assert.match((await closeSprint(SPRINT, null)).message ?? "", /n'existe plus/);
    assert.equal((await closeSprint("x", null)).gone, true);
    assert.equal((await closeSprint(SPRINT, "x")).gone, true);
    assert.deepEqual(writes(), []);
  });

  test("échec du déplacement des stories : le sprint n'est PAS clos ; état changé pendant la clôture (aucune ligne) : « n'est plus en cours »", async () => {
    routes(["sprints:select", active], ["user_stories:select", (op) => (op.columns === "id" ? { data: [{ id: S1 }] } : { data: [] })], ["user_stories:update", { error: { code: "XX000" } }]);
    assert.match((await closeSprint(SPRINT, null)).message ?? "", /Le sprint reste en cours/);
    assert.deepEqual(writes(), ["user_stories:update"]);
    fake.reset();
    routes(["sprints:select", active], ["sprints:update", { data: [] }]);
    assert.match((await closeSprint(SPRINT, null)).message ?? "", /n'est plus en cours/);
    assert.deepEqual(fake.revalidated, [PAGE]);
  });
});

describe("deleteSprint", () => {
  test("les stories du sprint passent d'abord à la suite du backlog, dans leur ordre, PUIS le sprint est supprimé", async () => {
    routes(
      ["user_stories:select", (op) => (op.columns === "id, mission_id" ? { data: [{ id: S1, mission_id: MISSION }, { id: S2, mission_id: MISSION }] } : { data: [{ position: 6 }] })],
      ["user_stories:update", { data: [{ id: S1 }] }],
      ["sprints:delete", { data: [{ id: SPRINT, mission_id: MISSION }] }],
    );
    assert.deepEqual(await deleteSprint(SPRINT), {});
    assert.deepEqual(writes(), ["user_stories:update", "user_stories:update", "sprints:delete"]);
    assert.deepEqual(fake.on("user_stories", "update").map((u) => [filterValue(u, "eq", "id"), (u.payload as { position: number }).position]), [[S1, 7], [S2, 8]]);
    assert.equal(filterValue(fake.on("sprints", "delete")[0], "eq", "id"), SPRINT);
    const own = fake.on("user_stories", "select").find((o) => o.columns === "id, mission_id")!;
    assert.equal(filterValue(own, "eq", "sprint_id"), SPRINT);
    assert.deepEqual(own.filters.filter((f) => f.kind === "order").map((f) => f.args[0]), ["position", "created_at"]); // leur ordre actuel
    const tail = fake.on("user_stories", "select").find((o) => o.columns === "position")!;
    assert.equal(filterValue(tail, "eq", "mission_id"), MISSION);
    assert.ok(tail.filters.some((f) => f.kind === "is" && f.args[0] === "sprint_id" && f.args[1] === null)); // la fin du backlog
    assert.deepEqual(fake.revalidated, [PAGE]);
  });

  test("sprint sans story : supprimé directement", async () => {
    routes(["sprints:delete", { data: [{ id: SPRINT, mission_id: MISSION }] }]);
    assert.deepEqual(await deleteSprint(SPRINT), {});
    assert.deepEqual(writes(), ["sprints:delete"]);
  });

  test("sprint déjà supprimé : succès sans revalidation ; erreur : « conservé » ; échec du déplacement : le sprint n'est pas supprimé", async () => {
    assert.deepEqual(await deleteSprint(SPRINT), {});
    assert.deepEqual(fake.revalidated, []);
    routes(["sprints:delete", { error: { code: "XX000" } }]);
    assert.match((await deleteSprint(SPRINT)).message ?? "", /conservé/);
    fake.reset();
    routes(["user_stories:select", (op) => (op.columns === "id, mission_id" ? { data: [{ id: S1, mission_id: MISSION }] } : { data: [] })], ["user_stories:update", { error: { code: "XX000" } }]);
    assert.match((await deleteSprint(SPRINT)).message ?? "", /conservé/);
    assert.equal(fake.on("sprints", "delete").length, 0);
  });
});

test("sans session : redirection vers la connexion, aucune requête", async () => {
  fake.claims = null;
  await assert.rejects(() => createSprint(MISSION, {}, form(VALID)), toLogin);
  await assert.rejects(() => updateSprint(SPRINT, {}, form(VALID)), toLogin);
  await assert.rejects(() => startSprint(SPRINT), toLogin);
  await assert.rejects(() => closeSprint(SPRINT, null), toLogin);
  await assert.rejects(() => deleteSprint(SPRINT), toLogin);
  assert.equal(fake.ops.length, 0);
});
