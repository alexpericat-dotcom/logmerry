import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { missionsRefusal } from "../../lib/domain/missions.ts";
import { quotesRefusal } from "../../lib/domain/quotes.ts";
import { createClientRecord, deleteClientRecord, promoteToClient, updateClientRecord } from "../../app/(app)/clients/actions.ts";
import { fake, filterValue, form, redirectsTo, withHarness } from "../helpers/harness.ts";

const ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

const VALID = { name: "Atelier Test", status: "prospect", origin: "demo" };

withHarness();

describe("createClientRecord / updateClientRecord", () => {
  test("création valide : insertion, liste revalidée, retour à la liste", async () => {
    await assert.rejects(() => createClientRecord({}, form(VALID)), redirectsTo("/clients"));
    const [op] = fake.on("clients", "insert");
    assert.equal((op.payload as { name: string }).name, "Atelier Test");
    assert.equal("owner_id" in (op.payload as object), false); // le propriétaire vient de la base, jamais du formulaire
    assert.ok(fake.revalidated.includes("/clients"));
  });

  test("saisie invalide : erreurs par champ, aucune requête ni redirection", async () => {
    const r = await createClientRecord({}, form({ ...VALID, name: "  " }));
    assert.ok(r.errors?.name);
    assert.equal(fake.ops.length, 0);
  });

  test("erreur de la base : message, pas de redirection", async () => {
    fake.respond = () => ({ error: { code: "XX000" } });
    assert.match((await createClientRecord({}, form(VALID))).message ?? "", /Enregistrement impossible/);
    assert.deepEqual(fake.revalidated, []);
  });

  test("modification : filtre sur l'identifiant, relue, retour à la fiche", async () => {
    fake.respond = () => ({ data: [{ id: ID }] });
    await assert.rejects(() => updateClientRecord(ID, {}, form(VALID)), redirectsTo(`/clients/${ID}`));
    const [op] = fake.on("clients", "update");
    assert.equal(filterValue(op, "eq", "id"), ID);
    assert.equal(op.returning, true);
    assert.deepEqual(fake.revalidated, ["/clients", `/clients/${ID}`]);
  });

  test("modification : fiche disparue ou identifiant invalide = « n'existe plus », jamais de redirection", async () => {
    assert.match((await updateClientRecord(ID, {}, form(VALID))).message ?? "", /n'existe plus/);
    fake.reset();
    assert.match((await updateClientRecord("x", {}, form(VALID))).message ?? "", /n'existe plus/);
    assert.equal(fake.ops.length, 0);
  });
});

describe("deleteClientRecord", () => {
  test("suppression filtrée sur l'identifiant, relue, retour à la liste", async () => {
    fake.respond = () => ({ data: [{ id: ID }] });
    await assert.rejects(() => deleteClientRecord(ID), redirectsTo("/clients"));
    const [op] = fake.on("clients", "delete");
    assert.equal(filterValue(op, "eq", "id"), ID);
    assert.equal(op.returning, true);
  });

  test("23503 avec des missions : dit combien, ne supprime rien ; puis avec des devis seulement", async () => {
    fake.respond = (op) => (op.table === "clients" ? { error: { code: "23503" } } : { count: op.table === "missions" ? 2 : 0 });
    assert.equal((await deleteClientRecord(ID)).message, missionsRefusal(2));
    assert.deepEqual(fake.on("missions", "select")[0].selectOptions, { count: "exact", head: true });
    assert.equal(filterValue(fake.on("missions", "select")[0], "eq", "client_id"), ID); // compte les missions de CETTE fiche
    assert.equal(filterValue(fake.on("quotes", "select")[0], "eq", "client_id"), ID);
    fake.reset();
    fake.respond = (op) => (op.table === "clients" ? { error: { code: "23503" } } : { count: op.table === "quotes" ? 3 : 0 });
    assert.equal((await deleteClientRecord(ID)).message, quotesRefusal(3));
  });

  test("missions et devis à la fois : le motif « missions » passe en premier", async () => {
    fake.respond = (op) => (op.table === "clients" ? { error: { code: "23503" } } : { count: op.table === "missions" ? 2 : 3 });
    assert.equal((await deleteClientRecord(ID)).message, missionsRefusal(2));
  });

  test("23503 sans mission ni devis lisible (autre clé étrangère) : pas de faux « a des missions », message général", async () => {
    fake.respond = (op) => (op.table === "clients" ? { error: { code: "23503" } } : { count: 0 });
    assert.match((await deleteClientRecord(ID)).message ?? "", /Suppression impossible/);
  });

  test("aucune ligne : « n'existe plus » ; autre erreur : « conservée »", async () => {
    assert.match((await deleteClientRecord(ID)).message ?? "", /n'existe plus/);
    fake.respond = () => ({ error: { code: "XX000" } });
    assert.match((await deleteClientRecord(ID)).message ?? "", /conservée/);
  });
});

describe("promoteToClient", () => {
  test("ne change que le statut de la fiche visée (contacts et reste intacts), relu, fiche et liste revalidées", async () => {
    fake.respond = () => ({ data: [{ id: ID }] });
    assert.deepEqual(await promoteToClient(ID), {});
    const [op] = fake.on("clients", "update");
    assert.deepEqual(op.payload, { status: "client" });
    assert.equal(filterValue(op, "eq", "id"), ID);
    assert.equal(op.returning, true);
    assert.deepEqual(fake.revalidated, ["/clients", `/clients/${ID}`]);
    assert.equal(fake.ops.length, 1);
  });

  test("fiche disparue : « n'existe plus » ; erreur de la base : message ; identifiant invalide : aucune requête", async () => {
    assert.match((await promoteToClient(ID)).message ?? "", /n'existe plus/);
    fake.respond = () => ({ error: { code: "XX000" } });
    assert.match((await promoteToClient(ID)).message ?? "", /Changement impossible/);
    fake.reset();
    assert.match((await promoteToClient("x")).message ?? "", /n'existe plus/);
    assert.equal(fake.ops.length, 0);
  });
});

test("session impossible à ouvrir : messages d'échec, pas de plantage", async () => {
  fake.failCreate = true;
  assert.match((await deleteClientRecord(ID)).message ?? "", /conservée/);
  assert.match((await promoteToClient(ID)).message ?? "", /Changement impossible/);
  assert.match((await createClientRecord({}, form(VALID))).message ?? "", /Enregistrement impossible/);
});

test("sans session : redirection vers la connexion, aucune requête, pour toutes les actions", async () => {
  fake.claims = null;
  await assert.rejects(() => createClientRecord({}, form(VALID)), redirectsTo("/auth/login"));
  await assert.rejects(() => updateClientRecord(ID, {}, form(VALID)), redirectsTo("/auth/login"));
  await assert.rejects(() => deleteClientRecord(ID), redirectsTo("/auth/login"));
  await assert.rejects(() => promoteToClient(ID), redirectsTo("/auth/login"));
  assert.equal(fake.ops.length, 0);
});
