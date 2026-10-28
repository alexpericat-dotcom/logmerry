import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { deleteDeadline, markDeadlineDone, reopenDeadline } from "../../app/(app)/calendrier/actions.ts";
import { fake, filterValue, toLogin, withHarness } from "../helpers/harness.ts";

const ID = "66666666-6666-4666-8666-666666666666";
const SERIES = "77777777-7777-4777-8777-777777777777";

withHarness();

describe("markDeadlineDone / reopenDeadline", () => {
  test("marquer faite : n'écrase jamais la date de réalisation (filtre done_at nul) et revalide calendrier et cockpit", async () => {
    fake.respond = () => ({ data: [{ id: ID }] });
    assert.deepEqual(await markDeadlineDone(ID), {});
    const [op] = fake.on("deadlines", "update");
    assert.ok(op.filters.some((f) => f.kind === "is" && f.args[0] === "done_at" && f.args[1] === null));
    assert.equal(filterValue(op, "eq", "id"), ID);
    assert.notEqual((op.payload as { done_at: string | null }).done_at, null);
    assert.equal(op.returning, true);
    assert.deepEqual(fake.revalidated, ["/calendrier", "/aujourd-hui"]);
  });

  test("rouvrir : remet done_at à null, seulement si elle est faite", async () => {
    fake.respond = () => ({ data: [{ id: ID }] });
    await reopenDeadline(ID);
    const [op] = fake.on("deadlines", "update");
    assert.equal((op.payload as { done_at: string | null }).done_at, null);
    assert.deepEqual(op.filters.find((f) => f.kind === "not")?.args, ["done_at", "is", null]);
    assert.equal(op.returning, true);
    assert.deepEqual(fake.revalidated, ["/calendrier", "/aujourd-hui"]);
  });

  test("rien de modifié : déjà dans l'état voulu = succès, ligne disparue = « n'existe plus »", async () => {
    fake.respond = (op) => (op.op === "select" ? { data: [{ id: ID }] } : { data: [] });
    assert.deepEqual(await markDeadlineDone(ID), {});
    assert.equal(fake.on("deadlines", "select").length, 1); // elle a bien relu la ligne pour distinguer « déjà faite » de « disparue »
    fake.respond = () => ({ data: [] });
    assert.match((await markDeadlineDone(ID)).message ?? "", /n'existe plus/);
  });

  test("erreur de la base : message, rien de revalidé", async () => {
    fake.revalidated = [];
    fake.respond = () => ({ error: { code: "XX000" } });
    assert.match((await markDeadlineDone(ID)).message ?? "", /Enregistrement impossible/);
    assert.deepEqual(fake.revalidated, []);
  });

  test("identifiant invalide : aucune requête", async () => {
    assert.match((await markDeadlineDone("x")).message ?? "", /n'existe plus/);
    assert.equal(fake.ops.length, 0);
  });

  test("sans session : redirection vers la connexion, aucune requête", async () => {
    fake.claims = null;
    await assert.rejects(() => markDeadlineDone(ID), toLogin);
    await assert.rejects(() => reopenDeadline(ID), toLogin);
    await assert.rejects(() => deleteDeadline(ID), toLogin);
    assert.equal(fake.ops.length, 0);
  });
});

describe("deleteDeadline", () => {
  test("échéance isolée : suppression filtrée sur l'identifiant, relue", async () => {
    fake.respond = (op) => (op.op === "select" && !op.returning ? { data: [{ series_id: null, recurrence: null }] } : { data: [{ id: ID }] });
    assert.deepEqual(await deleteDeadline(ID), {});
    const [op] = fake.on("deadlines", "delete");
    assert.equal(filterValue(op, "eq", "id"), ID);
    assert.equal(op.returning, true);
    assert.equal(fake.on("delete_deadline_series").length, 0);
    assert.deepEqual(fake.revalidated, ["/calendrier", "/aujourd-hui"]);
  });

  test("occurrence d'une série : supprime TOUTE la série (sinon la lecture la recréerait), puis l'occurrence elle-même", async () => {
    fake.respond = (op) => (op.op === "select" ? { data: [{ series_id: SERIES, recurrence: "monthly" }] } : { data: [] });
    assert.deepEqual(await deleteDeadline(ID), {});
    const [rpc] = fake.on("delete_deadline_series");
    assert.deepEqual(rpc.payload, { p_series_id: SERIES });
    assert.equal(filterValue(fake.on("deadlines", "delete")[0], "eq", "id"), ID);
    const order = fake.ops.map((o) => `${o.table}:${o.op}`);
    assert.ok(order.indexOf("delete_deadline_series:rpc") < order.indexOf("deadlines:delete"), "la série part avant l'occurrence");
    assert.deepEqual(fake.revalidated, ["/calendrier", "/aujourd-hui"]);
  });

  test("échéance introuvable (la RLS la rend invisible) : « n'existe plus », rien de supprimé", async () => {
    fake.respond = () => ({ data: [] });
    assert.match((await deleteDeadline(ID)).message ?? "", /n'existe plus/);
    assert.equal(fake.on("deadlines", "delete").length, 0);
  });

  test("échec de la suppression de série : « conservée », l'occurrence n'est pas supprimée seule", async () => {
    fake.respond = (op) => (op.op === "rpc" ? { error: { code: "XX000" } } : { data: [{ series_id: SERIES, recurrence: "yearly" }] });
    assert.match((await deleteDeadline(ID)).message ?? "", /conservée/);
    assert.equal(fake.on("deadlines", "delete").length, 0);
  });
});
