import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { addContact, deleteContact, updateContact } from "../../app/(app)/clients/contact-actions.ts";
import { fake, filterValue, form, toLogin, withHarness } from "../helpers/harness.ts";

const CLIENT = "10101010-1010-4010-8010-101010101010";
const ID = "20202020-2020-4020-8020-202020202020";
const VALID = { name: "Camille Martin", job_title: "Directrice", email: "camille@example.com", phone: "", address: "" };

const STORED = { ...VALID, phone: null, address: null };

withHarness();

describe("addContact", () => {
  test("vérifie la fiche, insère le contact rattaché à elle (jamais d'owner_id du formulaire), revalide la fiche", async () => {
    fake.respond = (op) => (op.table === "clients" ? { data: [{ id: CLIENT }] } : { data: [] });
    assert.deepEqual(await addContact(CLIENT, {}, form(VALID)), { ok: true });
    assert.equal(filterValue(fake.on("clients", "select")[0], "eq", "id"), CLIENT);
    const [op] = fake.on("contacts", "insert");
    assert.deepEqual(op.payload, { ...STORED, client_id: CLIENT }); // toutes les valeurs saisies (un champ vide est NULL, jamais ""), rattachées à la fiche vérifiée
    assert.equal("owner_id" in (op.payload as object), false);
    assert.deepEqual(fake.revalidated, [`/clients/${CLIENT}`]);
  });

  test("fiche disparue : « fiche n'existe plus », aucun contact créé ; lecture de la fiche en erreur : message général", async () => {
    assert.match((await addContact(CLIENT, {}, form(VALID))).message ?? "", /fiche n'existe plus/);
    fake.respond = (op) => (op.table === "clients" ? { error: { code: "XX000" } } : { data: [] });
    assert.match((await addContact(CLIENT, {}, form(VALID))).message ?? "", /Enregistrement impossible/);
    assert.equal(fake.on("contacts").length, 0);
  });

  test("identifiants invalides : « n'existe plus » et aucune requête, même si la base répondrait", async () => {
    fake.respond = () => ({ data: [{ id: ID, client_id: CLIENT }] });
    assert.match((await addContact("x", {}, form(VALID))).message ?? "", /fiche n'existe plus/);
    assert.match((await updateContact("x", {}, form(VALID))).message ?? "", /contact n'existe plus/);
    assert.match((await deleteContact("x")).message ?? "", /contact n'existe plus/);
    assert.equal(fake.ops.length, 0);
  });

  test("saisie invalide : erreurs par champ, aucune requête ; erreur de la base : message général, rien de revalidé", async () => {
    assert.ok((await addContact(CLIENT, {}, form({ ...VALID, name: " " }))).errors?.name);
    assert.equal(fake.ops.length, 0);
    fake.respond = (op) => (op.table === "contacts" ? { error: { code: "XX000" } } : { data: [{ id: CLIENT }] });
    assert.match((await addContact(CLIENT, {}, form(VALID))).message ?? "", /Enregistrement impossible/);
    assert.deepEqual(fake.revalidated, []);
  });
});

describe("updateContact", () => {
  test("filtre sur l'identifiant, relit (identifiant et fiche) et revalide la fiche du contact", async () => {
    fake.respond = () => ({ data: [{ id: ID, client_id: CLIENT }] });
    assert.deepEqual(await updateContact(ID, {}, form(VALID)), { ok: true });
    const [op] = fake.on("contacts", "update");
    assert.equal(filterValue(op, "eq", "id"), ID);
    assert.equal(op.columns, "id, client_id");
    assert.deepEqual(op.payload, STORED); // ni client_id (un contact ne change pas de fiche) ni owner_id
    assert.deepEqual(fake.revalidated, [`/clients/${CLIENT}`]);
  });

  test("saisie invalide : erreurs par champ, aucune requête", async () => {
    assert.ok((await updateContact(ID, {}, form({ ...VALID, email: "pas-un-email" }))).errors?.email);
    assert.equal(fake.ops.length, 0);
  });

  test("contact disparu, identifiant invalide ou erreur de la base : messages distincts, rien de revalidé", async () => {
    assert.match((await updateContact(ID, {}, form(VALID))).message ?? "", /contact n'existe plus/);
    assert.match((await updateContact("x", {}, form(VALID))).message ?? "", /contact n'existe plus/);
    fake.respond = () => ({ error: { code: "XX000" } });
    assert.match((await updateContact(ID, {}, form(VALID))).message ?? "", /Enregistrement impossible/);
    assert.deepEqual(fake.revalidated, []);
  });
});

describe("deleteContact", () => {
  test("suppression filtrée sur l'identifiant, relue, fiche revalidée", async () => {
    fake.respond = () => ({ data: [{ id: ID, client_id: CLIENT }] });
    assert.deepEqual(await deleteContact(ID), {});
    const [op] = fake.on("contacts", "delete");
    assert.equal(filterValue(op, "eq", "id"), ID);
    assert.equal(op.returning, true);
    assert.deepEqual(fake.revalidated, [`/clients/${CLIENT}`]);
  });

  test("aucune ligne : « n'existe plus » ; erreur ou session impossible à ouvrir : « conservé »", async () => {
    assert.match((await deleteContact(ID)).message ?? "", /n'existe plus/);
    fake.respond = () => ({ error: { code: "XX000" } });
    assert.match((await deleteContact(ID)).message ?? "", /conservé/);
    fake.reset();
    fake.failCreate = true;
    assert.match((await deleteContact(ID)).message ?? "", /conservé/);
  });
});

test("sans session : redirection vers la connexion, aucune requête", async () => {
  fake.claims = null;
  await assert.rejects(() => addContact(CLIENT, {}, form(VALID)), toLogin);
  await assert.rejects(() => updateContact(ID, {}, form(VALID)), toLogin);
  await assert.rejects(() => deleteContact(ID), toLogin);
  assert.equal(fake.ops.length, 0);
});
