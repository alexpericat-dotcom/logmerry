import "../helpers/dom.ts";

import assert from "node:assert/strict";
import { afterEach, describe, test } from "node:test";

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { InvoicePayments } from "../../components/invoice-payments.tsx";

afterEach(cleanup);

const invoice = { amount_ht_cents: 100000, tax_cents: 20000 };
const balance = { paidCents: 50000, dueCents: 120000, remainingCents: 70000, overpaidCents: 0, basis: "ttc", paymentsMissingTax: 0 };
const payments = [{ id: "p1", amount_ht_cents: 50000, tax_cents: 10000, received_on: "2026-10-10", note: null, created_at: "2026-10-10T10:00:00Z" }];

const show = () =>
  render(<InvoicePayments invoiceId="inv1" invoice={invoice as never} payments={payments} balance={balance as never} today="2026-10-29" />);

async function deleteThePayment(user: ReturnType<typeof userEvent.setup>) {
  const button = (starts: string, exact = false) => screen.getAllByRole("button").find((b) => (exact ? b.textContent === starts : b.textContent?.startsWith(starts))) as HTMLElement;
  await user.click(button("Supprimer"));
  await user.click(button("Supprimer", true));
  await waitFor(() => assert.ok(screen.getByText("Encaissement supprimé.")));
}

describe("InvoicePayments : focus après une suppression", () => {
  test("formulaire d'ajout fermé : le focus va au bouton « Ajouter un encaissement »", async () => {
    const user = userEvent.setup();
    show();
    await deleteThePayment(user);
    assert.equal(document.activeElement?.textContent, "Ajouter un encaissement");
  });

  test("formulaire d'ajout ouvert : le focus va à son premier champ (il ne se perd pas)", async () => {
    const user = userEvent.setup();
    show();
    await user.click(screen.getByRole("button", { name: "Ajouter un encaissement" }));
    await deleteThePayment(user);
    assert.equal(document.activeElement?.id, "new-inv1-amount_ht");
  });
});
