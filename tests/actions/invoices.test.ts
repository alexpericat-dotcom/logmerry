import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { createInvoice, deleteInvoice, updateInvoice } from "../../app/(app)/factures/actions.ts";
import { Redirect, fake, filterValue, withHarness } from "../helpers/harness.ts";

const MISSION = "22222222-2222-4222-8222-222222222222";
const ID = "33333333-3333-4333-8333-333333333333";

const form = (o: Record<string, string>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(o)) f.set(k, v);
  return f;
};
const VALID = { mission_id: MISSION, quote_id: "", amount_ht: "1500,00", tax: "", due_on: "2099-12-31", issued_on: "", reference: "F-1", note: "" };
const REFRESHED = ["/factures", "/missions/[id]#page", "/aujourd-hui", "/plafonds"]; // la fiche d'une mission montre ses factures : revalidée avec le type « page »

withHarness();

describe("createInvoice", () => {
  test("saisie valide : insertion dans invoices (montant en centimes), pages revalidées", async () => {
    const r = await createInvoice({}, form(VALID));
    assert.deepEqual(r, { saved: true });
    const [op] = fake.on("invoices", "insert");
    assert.equal((op.payload as { amount_ht_cents: number }).amount_ht_cents, 150000);
    assert.equal((op.payload as { mission_id: string }).mission_id, MISSION);
    assert.deepEqual(fake.revalidated, REFRESHED);
  });

  test("saisie invalide : erreurs par champ, aucune requête", async () => {
    const r = await createInvoice({}, form({ ...VALID, amount_ht: "abc", mission_id: "" }));
    assert.ok(r.errors?.amount_ht && r.errors.mission_id);
    assert.equal(fake.ops.length, 0);
  });

  test("42501 et 23503 : « la mission ou le devis n'existe plus » ; autre erreur : message général", async () => {
    for (const code of ["42501", "23503"]) {
      fake.respond = () => ({ error: { code } });
      assert.match((await createInvoice({}, form(VALID))).message ?? "", /La mission ou le devis choisi n'existe plus/);
    }
    fake.respond = () => ({ error: { code: "XX000" } });
    assert.match((await createInvoice({}, form(VALID))).message ?? "", /Enregistrement impossible/);
    assert.deepEqual(fake.revalidated, []);
  });

  test("sans session : redirection vers la connexion, aucune requête (aussi pour modifier et supprimer)", async () => {
    fake.claims = null;
    const toLogin = (e: unknown) => e instanceof Redirect && e.url === "/auth/login";
    await assert.rejects(() => createInvoice({}, form(VALID)), toLogin);
    await assert.rejects(() => updateInvoice(ID, {}, form(VALID)), toLogin);
    await assert.rejects(() => deleteInvoice(ID), toLogin);
    assert.equal(fake.ops.length, 0);
  });

  test("session impossible à ouvrir (createClient lève) : message d'échec, pas de plantage", async () => {
    fake.failCreate = true;
    assert.match((await createInvoice({}, form(VALID))).message ?? "", /Enregistrement impossible/);
  });
});

describe("updateInvoice", () => {
  test("met à jour la facture visée et relit la ligne (.select) : filtre sur l'identifiant", async () => {
    fake.respond = () => ({ data: [{ id: ID }] });
    assert.deepEqual(await updateInvoice(ID, {}, form(VALID)), { saved: true });
    const [op] = fake.on("invoices", "update");
    assert.equal(filterValue(op, "eq", "id"), ID);
    assert.equal(op.returning, true);
    assert.equal((op.payload as { amount_ht_cents: number }).amount_ht_cents, 150000);
    assert.deepEqual(fake.revalidated, REFRESHED);
  });

  test("42501 et 23503 : « la mission ou le devis n'existe plus » (et non « la facture »)", async () => {
    for (const code of ["42501", "23503"]) {
      fake.respond = () => ({ error: { code } });
      assert.match((await updateInvoice(ID, {}, form(VALID))).message ?? "", /La mission ou le devis choisi n'existe plus/);
    }
  });

  test("aucune ligne touchée (facture disparue ou d'un autre compte) : « n'existe plus », rien de revalidé", async () => {
    fake.respond = () => ({ data: [] });
    assert.match((await updateInvoice(ID, {}, form(VALID))).message ?? "", /Cette facture n'existe plus/);
    assert.deepEqual(fake.revalidated, []);
  });

  test("identifiant qui n'est pas un UUID : aucune requête", async () => {
    assert.match((await updateInvoice("pas-un-uuid", {}, form(VALID))).message ?? "", /n'existe plus/);
    assert.equal(fake.ops.length, 0);
  });
});

describe("deleteInvoice", () => {
  test("suppression filtrée sur l'identifiant, relue, pages revalidées", async () => {
    fake.respond = () => ({ data: [{ id: ID }] });
    assert.deepEqual(await deleteInvoice(ID), {});
    const [op] = fake.on("invoices", "delete");
    assert.equal(filterValue(op, "eq", "id"), ID);
    assert.equal(op.returning, true);
    assert.deepEqual(fake.revalidated, REFRESHED);
  });

  test("23503 (encaissements rattachés) : message dédié, facture conservée", async () => {
    fake.respond = () => ({ error: { code: "23503" } });
    assert.match((await deleteInvoice(ID)).message ?? "", /encaissements/);
    assert.deepEqual(fake.revalidated, []);
  });

  test("aucune ligne supprimée : « n'existe plus » ; autre erreur : « conservée »", async () => {
    assert.match((await deleteInvoice(ID)).message ?? "", /n'existe plus/);
    fake.respond = () => ({ error: { code: "XX000" } });
    assert.match((await deleteInvoice(ID)).message ?? "", /conservée/);
  });
});
