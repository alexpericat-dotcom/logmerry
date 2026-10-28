import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { invoicesRefusal } from "../../lib/domain/invoices.ts";
import { createMission, deleteMission, updateMission } from "../../app/(app)/missions/actions.ts";
import { fake, filterValue, form, redirectsTo, withHarness } from "../helpers/harness.ts";

const CLIENT = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const OTHER_CLIENT = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const ID = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";

const VALID = { client_id: CLIENT, title: "Audit des outils", status: "planned", start_date: "", end_date: "" };

withHarness();

describe("createMission", () => {
  test("vérifie la fiche, insère, relit l'identifiant, revalide liste, fiche de la mission et du client, redirige vers la mission", async () => {
    fake.respond = (op) => (op.table === "clients" ? { data: [{ id: CLIENT }] } : { data: [{ id: ID }] });
    await assert.rejects(() => createMission({}, form(VALID)), redirectsTo(`/missions/${ID}`));
    assert.equal(filterValue(fake.on("clients", "select")[0], "eq", "id"), CLIENT);
    const [op] = fake.on("missions", "insert");
    assert.equal((op.payload as { client_id: string }).client_id, CLIENT);
    assert.equal(op.returning, true); // il faut l'identifiant pour rediriger
    assert.equal("owner_id" in (op.payload as object), false); // le propriétaire vient de la base, jamais du formulaire
    assert.deepEqual(fake.revalidated, ["/missions", `/missions/${ID}`, `/missions/${ID}/modifier`, `/clients/${CLIENT}`]);
  });

  test("fiche disparue : message, aucune mission créée ; saisie invalide : erreurs, aucune requête", async () => {
    assert.match((await createMission({}, form(VALID))).message ?? "", /fiche n'existe plus/);
    assert.equal(fake.on("missions").length, 0);
    fake.reset();
    assert.ok((await createMission({}, form({ ...VALID, title: " " }))).errors?.title);
    assert.equal(fake.ops.length, 0);
  });

  test("erreur d'insertion : message général, rien de revalidé", async () => {
    fake.respond = (op) => (op.table === "clients" ? { data: [{ id: CLIENT }] } : { error: { code: "XX000" } });
    assert.match((await createMission({}, form(VALID))).message ?? "", /Enregistrement impossible/);
    assert.deepEqual(fake.revalidated, []);
  });
});

describe("updateMission", () => {
  test("le client d'une mission ne change jamais : le champ du formulaire est ignoré, client_id absent de la mise à jour", async () => {
    fake.respond = (op) => {
      if (op.table === "missions" && op.op === "select") return { data: [{ client_id: CLIENT }] };
      if (op.table === "clients") return { data: [{ id: CLIENT }] };
      return { data: [{ id: ID }] };
    };
    await assert.rejects(() => updateMission(ID, {}, form({ ...VALID, client_id: OTHER_CLIENT, title: "Nouveau titre" })), redirectsTo(`/missions/${ID}`));
    const [op] = fake.on("missions", "update");
    assert.equal("client_id" in (op.payload as object), false);
    assert.equal((op.payload as { title: string }).title, "Nouveau titre");
    assert.equal(filterValue(op, "eq", "id"), ID);
    assert.equal(op.returning, true);
    // la fiche vérifiée est celle de la mission, pas celle du formulaire ; la mission lue est celle visée
    assert.equal(filterValue(fake.on("clients", "select")[0], "eq", "id"), CLIENT);
    assert.equal(filterValue(fake.on("missions", "select")[0], "eq", "id"), ID);
  });

  test("mission disparue ou identifiant invalide : « n'existe plus », aucune écriture", async () => {
    assert.match((await updateMission(ID, {}, form(VALID))).message ?? "", /mission n'existe plus/);
    fake.reset();
    assert.match((await updateMission("x", {}, form(VALID))).message ?? "", /mission n'existe plus/);
    assert.equal(fake.ops.length, 0);
  });

  test("aucune ligne touchée à l'écriture : « n'existe plus », pas de redirection", async () => {
    fake.respond = (op) => {
      if (op.table === "missions" && op.op === "select") return { data: [{ client_id: CLIENT }] };
      if (op.table === "clients") return { data: [{ id: CLIENT }] };
      return { data: [] };
    };
    assert.match((await updateMission(ID, {}, form(VALID))).message ?? "", /mission n'existe plus/);
    assert.deepEqual(fake.revalidated, []);
  });

  test("erreur de la base à l'écriture : message général, rien de revalidé", async () => {
    fake.respond = (op) => {
      if (op.table === "missions" && op.op === "select") return { data: [{ client_id: CLIENT }] };
      if (op.table === "clients") return { data: [{ id: CLIENT }] };
      return { error: { code: "XX000" } };
    };
    assert.match((await updateMission(ID, {}, form(VALID))).message ?? "", /Enregistrement impossible/);
    assert.deepEqual(fake.revalidated, []);
  });
});

describe("deleteMission", () => {
  test("suppression filtrée sur l'identifiant, relue (identifiant et client), pages revalidées, retour à la liste", async () => {
    fake.respond = () => ({ data: [{ id: ID, client_id: CLIENT }] });
    await assert.rejects(() => deleteMission(ID), redirectsTo("/missions"));
    const [op] = fake.on("missions", "delete");
    assert.equal(filterValue(op, "eq", "id"), ID);
    assert.equal(op.columns, "id, client_id");
    assert.deepEqual(fake.revalidated, ["/missions", `/missions/${ID}`, `/missions/${ID}/modifier`, `/clients/${CLIENT}`]);
  });

  test("déjà supprimée (autre onglet) : l'état voulu est atteint, retour à la liste sans erreur", async () => {
    await assert.rejects(() => deleteMission(ID), redirectsTo("/missions"));
    assert.deepEqual(fake.revalidated, ["/missions", `/missions/${ID}`, `/missions/${ID}/modifier`]); // pas de fiche à revalider : on ne sait pas laquelle
  });

  test("23503 : factures liées = leur nombre ; devis lié = refus dédié ; rien de lisible = pas de faux motif", async () => {
    fake.respond = (op) => (op.table === "missions" ? { error: { code: "23503" } } : { count: op.table === "invoices" ? 2 : 1 });
    assert.equal((await deleteMission(ID)).message, invoicesRefusal(2));
    assert.equal(filterValue(fake.on("invoices", "select")[0], "eq", "mission_id"), ID); // compte les factures de CETTE mission
    assert.equal(filterValue(fake.on("quotes", "select")[0], "eq", "mission_id"), ID);
    fake.reset();
    fake.respond = (op) => (op.table === "missions" ? { error: { code: "23503" } } : { count: op.table === "quotes" ? 1 : 0 });
    assert.match((await deleteMission(ID)).message ?? "", /devis/i);
    fake.reset();
    fake.respond = (op) => (op.table === "missions" ? { error: { code: "23503" } } : { count: 0 });
    assert.match((await deleteMission(ID)).message ?? "", /Suppression impossible/);
    assert.deepEqual(fake.revalidated, []);
  });

  test("autre erreur ou session impossible à ouvrir : « conservée »", async () => {
    fake.failCreate = true;
    assert.match((await deleteMission(ID)).message ?? "", /conservée/);
    assert.match((await createMission({}, form(VALID))).message ?? "", /Enregistrement impossible/);
  });

  test("autre erreur : « conservée » ; sans session : redirection vers la connexion", async () => {
    fake.respond = () => ({ error: { code: "XX000" } });
    assert.match((await deleteMission(ID)).message ?? "", /conservée/);
    fake.reset();
    fake.claims = null;
    await assert.rejects(() => deleteMission(ID), redirectsTo("/auth/login"));
    await assert.rejects(() => createMission({}, form(VALID)), redirectsTo("/auth/login"));
    await assert.rejects(() => updateMission(ID, {}, form(VALID)), redirectsTo("/auth/login"));
    assert.equal(fake.ops.length, 0);
  });
});
