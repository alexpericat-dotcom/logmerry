import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { addTask, addTasks, deleteTask, reorderTasks, setTaskDone, updateTask } from "../../app/(app)/missions/task-actions.ts";
import { fake, filterValue, routes, toLogin, withHarness } from "../helpers/harness.ts";

const STORY = "a1a1a1a1-a1a1-41a1-81a1-a1a1a1a1a1a1";
const MISSION = "b2b2b2b2-b2b2-42b2-82b2-b2b2b2b2b2b2";
const T1 = "c3c3c3c3-c3c3-43c3-83c3-c3c3c3c3c3c3";
const T2 = "d4d4d4d4-d4d4-44d4-84d4-d4d4d4d4d4d4";
const T3 = "e5e5e5e5-e5e5-45e5-85e5-e5e5e5e5e5e5";

withHarness();

/** La story existe (et donne sa mission pour la revalidation) ; la dernière tâche est en position 2. */
const withStory = () => routes(["user_stories:select", { data: [{ id: STORY, mission_id: MISSION }] }], ["tasks:select", { data: [{ position: 2 }] }]);
const REFRESHED = ["/aujourd-hui", `/missions/${MISSION}`];

describe("addTask / addTasks", () => {
  test("ajoute à la dernière place de la story, puis revalide le cockpit et la mission", async () => {
    withStory();
    assert.deepEqual(await addTask(STORY, "  Écrire le brief  "), { ok: true });
    assert.deepEqual(fake.on("tasks", "insert")[0].payload, { story_id: STORY, title: "Écrire le brief", position: 3 });
    assert.deepEqual(fake.revalidated, REFRESHED);
  });

  test("première tâche d'une story vide : position 0", async () => {
    routes(["user_stories:select", { data: [{ id: STORY, mission_id: MISSION }] }]);
    await addTask(STORY, "Première");
    assert.equal((fake.on("tasks", "insert")[0].payload as { position: number }).position, 0);
  });

  test("titre vide ou non textuel : erreur de champ, aucune requête ; identifiant invalide ou story disparue : « n'existe plus »", async () => {
    assert.equal((await addTask(STORY, "  ")).error, "Saisis le titre de la tâche.");
    assert.ok((await addTask(STORY, 42 as unknown as string)).error);
    assert.equal(fake.ops.length, 0);
    assert.deepEqual(await addTask("x", "Tâche"), { message: "Cette user story n'existe plus.", gone: true });
    assert.equal(fake.ops.length, 0);
    assert.equal((await addTask(STORY, "Tâche")).gone, true); // la story n'existe pas (réponse vide)
    assert.equal(fake.on("tasks", "insert").length, 0);
  });

  test("erreur de la base (lecture ou écriture) : message général, rien de revalidé", async () => {
    routes(["user_stories:select", { data: [{ id: STORY, mission_id: MISSION }] }], ["tasks:insert", { error: { code: "XX000" } }]);
    assert.match((await addTask(STORY, "Tâche")).message ?? "", /Enregistrement impossible/);
    routes(["user_stories:select", { error: { code: "XX000" } }]);
    assert.match((await addTask(STORY, "Tâche")).message ?? "", /Enregistrement impossible/);
    assert.deepEqual(fake.revalidated, []);
  });

  test("addTasks : une seule insertion (tout ou rien), positions à la suite, nombre ajouté renvoyé", async () => {
    withStory();
    assert.deepEqual(await addTasks(STORY, ["A", " B ", "C"]), { ok: true, added: 3 });
    const inserts = fake.on("tasks", "insert");
    assert.equal(inserts.length, 1);
    assert.deepEqual(inserts[0].payload, [{ story_id: STORY, title: "A", position: 3 }, { story_id: STORY, title: "B", position: 4 }, { story_id: STORY, title: "C", position: 5 }]);
  });

  test("addTasks : liste vide ou titre invalide = rien n'est écrit", async () => {
    assert.equal((await addTasks(STORY, [])).error, "Aucune tâche à ajouter.");
    assert.ok((await addTasks(STORY, ["ok", " "])).error);
    assert.equal(fake.ops.length, 0);
  });
});

describe("updateTask / setTaskDone", () => {
  test("renommer : seul le titre change, filtre sur l'identifiant, relu, mission revalidée", async () => {
    routes(["tasks:update", { data: [{ id: T1, story_id: STORY }] }], ["user_stories:select", { data: [{ mission_id: MISSION }] }]);
    assert.deepEqual(await updateTask(T1, " Nouveau titre "), { ok: true });
    const [op] = fake.on("tasks", "update");
    assert.deepEqual(op.payload, { title: "Nouveau titre" });
    assert.equal(filterValue(op, "eq", "id"), T1);
    assert.equal(op.returning, true);
    assert.deepEqual(fake.revalidated, REFRESHED);
  });

  test("cocher : seule la coche change (jamais le statut de la story) ; valeur non booléenne ou identifiant invalide refusés sans requête", async () => {
    routes(["tasks:update", { data: [{ id: T1, story_id: STORY }] }], ["user_stories:select", { data: [{ mission_id: MISSION }] }]);
    assert.deepEqual(await setTaskDone(T1, true), { ok: true });
    assert.deepEqual(fake.on("tasks", "update")[0].payload, { done: true });
    assert.equal(fake.on("user_stories", "update").length, 0);
    fake.reset();
    assert.equal((await setTaskDone(T1, "oui" as unknown as boolean)).gone, true);
    assert.equal((await setTaskDone("x", true)).gone, true);
    assert.equal(fake.ops.length, 0);
  });

  test("tâche disparue : « n'existe plus » et l'écran se recharge ; erreur de la base : message ; cocher a son propre message", async () => {
    assert.deepEqual(await updateTask(T1, "Titre"), { message: "Cette tâche n'existe plus.", gone: true });
    routes(["tasks:update", { error: { code: "XX000" } }]);
    assert.match((await updateTask(T1, "Titre")).message ?? "", /Enregistrement impossible/);
    assert.match((await setTaskDone(T1, true)).message ?? "", /Changement impossible/);
  });

  test("la lecture de la mission qui échoue (erreur renvoyée ou exception) après l'écriture ne fait pas croire à un échec", async () => {
    routes(["tasks:update", { data: [{ id: T1, story_id: STORY }] }], ["user_stories:select", { error: { code: "XX000" } }]);
    assert.deepEqual(await setTaskDone(T1, false), { ok: true });
    assert.deepEqual(fake.revalidated, ["/aujourd-hui"]);
    fake.reset();
    routes(["tasks:update", { data: [{ id: T1, story_id: STORY }] }], ["user_stories:select", () => { throw new Error("réseau coupé"); }]);
    assert.deepEqual(await setTaskDone(T1, false), { ok: true });
    assert.deepEqual(fake.revalidated, ["/aujourd-hui"]);
  });
});

describe("reorderTasks", () => {
  const rows = [{ id: T1, position: 0 }, { id: T2, position: 1 }, { id: T3, position: 2 }];

  test("n'écrit que les positions qui changent, une mise à jour par tâche déplacée, puis revalide", async () => {
    routes(["tasks:select", { data: rows }], ["tasks:update", { data: [{ id: T1 }] }], ["user_stories:select", { data: [{ mission_id: MISSION }] }]);
    assert.deepEqual(await reorderTasks(STORY, [T2, T1, T3]), { ok: true });
    const updates = fake.on("tasks", "update");
    assert.deepEqual(updates.map((u) => [filterValue(u, "eq", "id"), (u.payload as { position: number }).position]), [[T2, 0], [T1, 1]]); // T3 reste en place
    assert.equal(filterValue(fake.on("tasks", "select")[0], "eq", "story_id"), STORY);
    assert.deepEqual(fake.revalidated, REFRESHED);
  });

  test("la liste a changé entre-temps (autre ensemble de tâches) : rien n'est écrit, l'écran se recharge avec un message", async () => {
    routes(["tasks:select", { data: rows }]);
    const r = await reorderTasks(STORY, [T1, T2]);
    assert.equal(r.gone, true);
    assert.match(r.message ?? "", /ont changé entre-temps/);
    assert.equal(fake.on("tasks", "update").length, 0);
  });

  test("identifiants invalides, doublons ou story invalide : refus sans requête", async () => {
    assert.equal((await reorderTasks(STORY, ["x"])).gone, true);
    assert.equal((await reorderTasks("x", [T1])).gone, true);
    routes(["tasks:select", { data: rows }]);
    assert.equal((await reorderTasks(STORY, [T1, T1, T2])).gone, true); // un doublon n'est pas une permutation
    assert.equal(fake.on("tasks", "update").length, 0);
  });

  test("une tâche supprimée en route (aucune ligne à l'écriture) : « ont changé » ; lecture en erreur : « Déplacement impossible »", async () => {
    routes(["tasks:select", { data: rows }], ["tasks:update", { data: [] }]);
    assert.match((await reorderTasks(STORY, [T2, T1, T3])).message ?? "", /ont changé entre-temps/);
    routes(["tasks:select", { error: { code: "XX000" } }]);
    assert.match((await reorderTasks(STORY, [T2, T1, T3])).message ?? "", /Déplacement impossible/);
  });

  test("erreur d'écriture : message « Déplacement impossible », et l'écran est tout de même revalidé", async () => {
    routes(["tasks:select", { data: rows }], ["tasks:update", { error: { code: "XX000" } }], ["user_stories:select", { data: [{ mission_id: MISSION }] }]);
    assert.match((await reorderTasks(STORY, [T2, T1, T3])).message ?? "", /Déplacement impossible/);
    assert.deepEqual(fake.revalidated, REFRESHED);
  });
});

describe("deleteTask", () => {
  test("supprime la tâche visée (filtre sur l'identifiant, relu) puis revalide", async () => {
    routes(["tasks:delete", { data: [{ id: T1, story_id: STORY }] }], ["user_stories:select", { data: [{ mission_id: MISSION }] }]);
    assert.deepEqual(await deleteTask(T1), { ok: true });
    const [op] = fake.on("tasks", "delete");
    assert.equal(filterValue(op, "eq", "id"), T1);
    assert.equal(op.returning, true);
    assert.deepEqual(fake.revalidated, REFRESHED);
  });

  test("déjà supprimée (autre onglet) : succès sans revalidation ; erreur : « conservée » ; identifiant invalide : succès sans requête", async () => {
    assert.deepEqual(await deleteTask(T1), { ok: true });
    assert.deepEqual(fake.revalidated, []);
    routes(["tasks:delete", { error: { code: "XX000" } }]);
    assert.match((await deleteTask(T1)).message ?? "", /conservée/);
    fake.reset();
    assert.deepEqual(await deleteTask("x"), { ok: true }); // identifiant invalide : l'état voulu est atteint, rien n'est écrit
    assert.equal(fake.ops.length, 0);
  });
});

test("sans session : redirection vers la connexion, aucune requête", async () => {
  fake.claims = null;
  await assert.rejects(() => addTask(STORY, "T"), toLogin);
  await assert.rejects(() => addTasks(STORY, ["T"]), toLogin);
  await assert.rejects(() => updateTask(T1, "T"), toLogin);
  await assert.rejects(() => setTaskDone(T1, true), toLogin);
  await assert.rejects(() => reorderTasks(STORY, [T1]), toLogin);
  await assert.rejects(() => deleteTask(T1), toLogin);
  assert.equal(fake.ops.length, 0);
});
