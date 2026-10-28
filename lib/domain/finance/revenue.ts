import { ceilingPeriod } from "./ceilings.ts";

/** CA encaissé de l'année civile de `asOf` : somme des montants hors taxe saisis du 1er janvier à `asOf` (jour de Paris), en centimes entiers. Un total de ce qui est saisi, pas un calcul réglementaire. */
export function collectedRevenue(payments: { amount_ht_cents: number; received_on: string }[], asOf: string): { cents: number; from: string; to: string } {
  const { from, to } = ceilingPeriod("calendar_year", asOf);
  const cents = payments.filter((p) => p.received_on >= from && p.received_on <= to).reduce((sum, p) => sum + p.amount_ht_cents, 0);
  return { cents, from, to };
}

export const MONTH_LABELS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."] as const;

/** Encaissements hors taxe par mois de l'année civile de `asOf` (douze mois, zéro quand rien) ; la somme égale `collectedRevenue` : un seul périmètre. */
export function monthlyRevenue(payments: { amount_ht_cents: number; received_on: string }[], asOf: string): { month: number; label: string; cents: number }[] {
  const { from, to } = ceilingPeriod("calendar_year", asOf);
  const months = MONTH_LABELS.map((label, i) => ({ month: i + 1, label, cents: 0 }));
  for (const p of payments) if (p.received_on >= from && p.received_on <= to) months[Number(p.received_on.slice(5, 7)) - 1].cents += p.amount_ht_cents;
  return months;
}
