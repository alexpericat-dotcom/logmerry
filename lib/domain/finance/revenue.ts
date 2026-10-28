import { ceilingPeriod } from "./ceilings.ts";

/** CA encaissé de l'année civile de `asOf` : somme des montants hors taxe saisis du 1er janvier à `asOf` (jour de Paris), en centimes entiers. Un total de ce qui est saisi, pas un calcul réglementaire. */
export function collectedRevenue(payments: { amount_ht_cents: number; received_on: string }[], asOf: string): { cents: number; from: string; to: string } {
  const { from, to } = ceilingPeriod("calendar_year", asOf);
  const cents = payments.filter((p) => p.received_on >= from && p.received_on <= to).reduce((sum, p) => sum + p.amount_ht_cents, 0);
  return { cents, from, to };
}
