import assert from "node:assert/strict";
import test from "node:test";

import { computeCeilings } from "./ceilings.ts";
import type { RuleRow } from "./rules.ts";
import { collectedRevenue } from "./revenue.ts";

const pay = (amount_ht_cents: number, received_on: string) => ({ amount_ht_cents, received_on });
const TODAY = "2026-10-28";

test("CA de l'année : janvier et octobre comptés, l'an dernier non, hors taxe", () => {
  assert.deepEqual(collectedRevenue([pay(10_000, "2026-01-01"), pay(25_050, "2026-10-28"), pay(99_999, "2025-12-31")], TODAY), { cents: 35_050, from: "2026-01-01", to: TODAY });
});

test("sans encaissement : zéro", () => {
  assert.equal(collectedRevenue([], TODAY).cents, 0);
});

test("encaissement postérieur à asOf : non compté", () => {
  assert.equal(collectedRevenue([pay(10_000, "2026-10-29"), pay(500, TODAY)], TODAY).cents, 500);
});

test("même chiffre que la jauge : le CA hors taxe de l'année = le consommé d'un plafond en année civile, hors taxe", () => {
  const rule: RuleRow = {
    id: "r", rule_key: "ceiling_turnover_micro", activity_category: "bnc", description: null,
    params: { amount_cents: 8_360_000, period: "calendar_year", tax_basis: "excl_tax", revenue_category: "services" },
    effective_from: "2026-01-01", effective_to: null, source: "https://example.org", verified_on: "2026-10-01", revalidate_after: "2027-10-01", status: "verifiee", previous_version_id: null,
  };
  const payments = [{ amount_ht_cents: 10_000, tax_cents: 2_000, received_on: "2026-01-01" }, { amount_ht_cents: 25_050, tax_cents: null, received_on: TODAY }, { amount_ht_cents: 99_999, tax_cents: null, received_on: "2025-12-31" }, { amount_ht_cents: 500, tax_cents: null, received_on: "2026-12-31" }];
  const gauge = computeCeilings([rule], { activity_category: "bnc", alert_thresholds: [] }, payments, TODAY)[0];
  assert.equal(gauge.status, "ok");
  assert.equal(gauge.status === "ok" && gauge.consumedCents, collectedRevenue(payments, TODAY).cents);
});
