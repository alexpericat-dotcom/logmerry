import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { createPayment, deletePayment, updatePayment } from "../../app/(app)/factures/payment-actions.ts";
import { Redirect, fake, filterValue, withHarness } from "../helpers/harness.ts";

const INVOICE = "44444444-4444-4444-8444-444444444444";
const ID = "55555555-5555-4555-8555-555555555555";

const form = (o: Record<string, string>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(o)) f.set(k, v);
  return f;
};
const REFRESHED_PAGE = "/missions/[id]#page";
const VALID = { amount_ht: "500,00", tax: "", received_on: "2026-10-01", note: "" };

withHarness();

describe("createPayment", () => {
  test("insère l'encaissement rattaché à la facture et revalide cockpit et plafonds", async () => {
    assert.deepEqual(await createPayment(INVOICE, {}, form(VALID)), { saved: true });
    const [op] = fake.on("payments", "insert");
    assert.equal((op.payload as { invoice_id: string }).invoice_id, INVOICE);
    assert.equal((op.payload as { amount_ht_cents: number }).amount_ht_cents, 50000);
    assert.ok(fake.revalidated.includes("/aujourd-hui") && fake.revalidated.includes("/plafonds") && fake.revalidated.includes(REFRESHED_PAGE));
  });

  test("facture disparue (42501, 23503) : message dédié ; autre erreur : message général", async () => {
    for (const code of ["42501", "23503"]) {
      fake.respond = () => ({ error: { code } });
      assert.match((await createPayment(INVOICE, {}, form(VALID))).message ?? "", /facture n'existe plus/);
    }
    fake.respond = () => ({ error: { code: "XX000" } });
    assert.match((await createPayment(INVOICE, {}, form(VALID))).message ?? "", /Enregistrement impossible/);
  });

  test("sans session : redirection, aucune requête (création, modification, suppression)", async () => {
    fake.claims = null;
    const toLogin = (e: unknown) => e instanceof Redirect && e.url === "/auth/login";
    await assert.rejects(() => createPayment(INVOICE, {}, form(VALID)), toLogin);
    await assert.rejects(() => updatePayment(ID, INVOICE, {}, form(VALID)), toLogin);
    await assert.rejects(() => deletePayment(ID), toLogin);
    assert.equal(fake.ops.length, 0);
  });
});

describe("updatePayment", () => {
  test("n'envoie jamais la facture (figée par la base) : seulement montants, date, note", async () => {
    fake.respond = () => ({ data: [{ id: ID }] });
    await updatePayment(ID, INVOICE, {}, form(VALID));
    const [op] = fake.on("payments", "update");
    assert.deepEqual(Object.keys(op.payload as object).sort(), ["amount_ht_cents", "note", "received_on", "tax_cents"]);
    assert.equal(filterValue(op, "eq", "id"), ID);
    assert.equal(op.returning, true); // sans `.select("id")` la base ne renvoie rien : tout paraîtrait « disparu »
    assert.ok(fake.revalidated.includes("/aujourd-hui") && fake.revalidated.includes("/plafonds"));
  });

  test("aucune ligne touchée : « n'existe plus » ; erreur de la base : message général", async () => {
    assert.match((await updatePayment(ID, INVOICE, {}, form(VALID))).message ?? "", /n'existe plus/);
    fake.respond = () => ({ error: { code: "XX000" } });
    assert.match((await updatePayment(ID, INVOICE, {}, form(VALID))).message ?? "", /Enregistrement impossible/);
  });
});

describe("deletePayment", () => {
  test("supprime l'encaissement visé et revalide", async () => {
    fake.respond = () => ({ data: [{ id: ID }] });
    assert.deepEqual(await deletePayment(ID), {});
    const [op] = fake.on("payments", "delete");
    assert.equal(filterValue(op, "eq", "id"), ID);
    assert.equal(op.returning, true);
    assert.ok(fake.revalidated.includes("/aujourd-hui"));
  });

  test("erreur de la base : « conservé », rien de revalidé", async () => {
    fake.respond = () => ({ error: { code: "XX000" } });
    assert.match((await deletePayment(ID)).message ?? "", /conservé/);
    assert.deepEqual(fake.revalidated, []);
  });
});
