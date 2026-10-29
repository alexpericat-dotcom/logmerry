import "../helpers/dom.ts";

import assert from "node:assert/strict";
import { afterEach, describe, test } from "node:test";

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { PaymentForm } from "../../components/payment-form.tsx";

afterEach(cleanup);

const INVOICE = { amount_ht_cents: 100_000, tax_cents: 20_000 };
const noop = () => {};
const action = async () => ({});
const date = (c: HTMLElement) => c.querySelector<HTMLInputElement>('input[name="received_on"]');

describe("PaymentForm : date d'encaissement", () => {
  test("nouvel encaissement (date vide) : la date du jour (Paris, donnée par le serveur) est préremplie et c'est aussi la date maximale", () => {
    const { container } = render(
      <PaymentForm idPrefix="n" action={action} initial={{ invoice_id: "i", amount_ht: "", tax: "", received_on: "", note: "" }} invoice={INVOICE} others={[]} today="2026-10-29" submitLabel="Enregistrer" onDone={noop} onCancel={noop} />,
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

describe("PaymentForm : description de la taxe (aide ET erreur)", () => {
  const view = (action: () => Promise<object>) => (
    <PaymentForm idPrefix="n" action={action as never} initial={{ invoice_id: "i", amount_ht: "", tax: "", received_on: "", note: "" }} invoice={INVOICE} others={[]} today="2026-10-29" submitLabel="Enregistrer" onDone={noop} onCancel={noop} />
  );
  const tax = (c: HTMLElement) => c.querySelector<HTMLInputElement>('input[name="tax"]');

  test("sans erreur : l'aide seule ; avec une erreur sur la taxe : l'erreur puis l'aide", async () => {
    const user = userEvent.setup();
    const { container } = render(view(async () => ({ errors: { tax: "Saisis une taxe valide." }, values: { invoice_id: "i", amount_ht: "10", tax: "x", received_on: "2026-10-29", note: "" } })));
    assert.equal(tax(container)?.getAttribute("aria-describedby"), "n-tax-help");
    await user.click(screen.getByRole("button", { name: "Enregistrer" }));
    await waitFor(() => assert.equal(tax(container)?.getAttribute("aria-describedby"), "n-tax-error n-tax-help"));
    assert.equal(tax(container)?.getAttribute("aria-invalid"), "true");
  });
});
