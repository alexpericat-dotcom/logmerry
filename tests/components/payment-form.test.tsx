import "../helpers/dom.ts";

import assert from "node:assert/strict";
import { afterEach, describe, test } from "node:test";

import { cleanup, render } from "@testing-library/react";

import { PaymentForm } from "../../components/payment-form.tsx";

afterEach(cleanup);

const INVOICE = { amount_ht_cents: 100_000, tax_cents: 20_000 };
const noop = () => {};
const action = async () => ({});
const date = (c: HTMLElement) => c.querySelector<HTMLInputElement>('input[name="received_on"]');

describe("PaymentForm : date d'encaissement", () => {
  test("nouvel encaissement : la date du jour (Paris, donnée par le serveur) est préremplie et c'est aussi la date maximale", () => {
    const { container } = render(
      <PaymentForm idPrefix="n" action={action} initial={{ invoice_id: "i", amount_ht: "", tax: "", received_on: "2026-10-29", note: "" }} invoice={INVOICE} others={[]} today="2026-10-29" submitLabel="Enregistrer" onDone={noop} onCancel={noop} />,
    );
    assert.equal(date(container)?.value, "2026-10-29");
    assert.equal(date(container)?.max, "2026-10-29");
    assert.equal(date(container)?.type, "date");
  });

  test("modification : la date enregistrée est conservée, la date maximale reste le jour de Paris", () => {
    const { container } = render(
      <PaymentForm idPrefix="e" action={action} initial={{ invoice_id: "i", amount_ht: "500", tax: "", received_on: "2026-09-01", note: "" }} invoice={INVOICE} others={[]} today="2026-10-29" submitLabel="Enregistrer" onDone={noop} onCancel={noop} />,
    );
    assert.equal(date(container)?.value, "2026-09-01");
    assert.equal(date(container)?.max, "2026-10-29");
  });
});
