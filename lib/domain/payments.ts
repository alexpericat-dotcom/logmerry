import { isDay } from "./missions.ts";
import { isUuid } from "./notes.ts";
import { parseAmountToCents } from "./quotes.ts";

/** 1 000 000 € : garde-fou de saisie, pas une règle métier (la base le fait respecter aussi). */
export const PAYMENT_AMOUNT_MAX_CENTS = 100_000_000;
export const PAYMENT_NOTE_MAX = 500;

export type PaymentInput = { invoice_id: string; amount_ht: string; tax: string; received_on: string; note: string };
export type PaymentValues = { invoice_id: string; amount_ht_cents: number; tax_cents: number | null; received_on: string; note: string | null };
export type PaymentErrors = Partial<Record<keyof PaymentInput, string>>;

/** La base compte en points de code (`char_length`), pas en unités UTF-16. */
const length = (s: string) => Array.from(s).length;
const stripNul = (s: string) => s.replaceAll("\u0000", ""); // Postgres refuse NUL (22021) : on le retire avant de valider

/**
 * Valide un encaissement (décision 2 de la spec 4.3). Facture, hors taxe strictement positif et date obligatoires ;
 * taxe vide = inconnue (`null`, jamais 0) ; date jamais dans le futur, mais possible avant l'émission ou l'échéance de la facture.
 * `today` (jour de Paris) est reçu en argument : la règle ne lit pas l'horloge.
 */
export function validatePaymentInput(input: PaymentInput, today: string): { ok: true; value: PaymentValues } | { ok: false; errors: PaymentErrors } {
  const errors: PaymentErrors = {};
  const invoice = input.invoice_id.trim();
  const ht = input.amount_ht.trim();
  const tax = input.tax.trim();
  const received = input.received_on.trim();
  const note = stripNul(input.note).trim();

  if (!isUuid(invoice)) errors.invoice_id = "Cette facture n'existe plus.";

  const htCents = ht ? parseAmountToCents(ht) : null;
  if (!ht) errors.amount_ht = "Saisis le montant hors taxe encaissé.";
  else if (htCents === null) errors.amount_ht = "Saisis un montant valide, par exemple 1 250,50.";
  else if (htCents <= 0) errors.amount_ht = "Le montant hors taxe doit être supérieur à 0.";
  else if (htCents > PAYMENT_AMOUNT_MAX_CENTS) errors.amount_ht = "Ce montant est trop élevé (1 000 000 € au plus).";

  const taxCents = tax ? parseAmountToCents(tax) : null;
  if (tax && taxCents === null) errors.tax = "Saisis un montant de taxe valide, ou laisse vide si tu ne la connais pas.";
  else if (taxCents !== null && taxCents > PAYMENT_AMOUNT_MAX_CENTS) errors.tax = "Ce montant est trop élevé (1 000 000 € au plus).";

  if (!received) errors.received_on = "Saisis la date d'encaissement.";
  else if (!isDay(received)) errors.received_on = "Saisis une date d'encaissement valide.";
  else if (received > today) errors.received_on = "La date d'encaissement ne peut pas être dans le futur.";

  if (length(note) > PAYMENT_NOTE_MAX) errors.note = `La remarque fait ${PAYMENT_NOTE_MAX} caractères au plus.`;

  if (Object.keys(errors).length || htCents === null) return { ok: false, errors };
  return { ok: true, value: { invoice_id: invoice, amount_ht_cents: htCents, tax_cents: taxCents, received_on: received, note: note || null } };
}

export const INVOICE_STATUSES = ["unpaid", "partial", "paid"] as const;
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];
export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = { unpaid: "Non payée", partial: "Partiellement payée", paid: "Payée" };

export type InvoiceAmounts = { amount_ht_cents: number; tax_cents: number | null };
export type PaymentAmounts = { amount_ht_cents: number; tax_cents: number | null };

export type InvoiceBalance = {
  status: InvoiceStatus;
  /** Base du calcul : toutes taxes comprises, ou hors taxe seulement quand la taxe de la facture est inconnue. */
  basis: "ttc" | "ht";
  dueCents: number;
  paidCents: number;
  remainingCents: number;
  overpaidCents: number;
  /** Nombre d'encaissements sans taxe saisie alors que celle de la facture est connue (comptée pour zéro, jamais répartie). */
  paymentsMissingTax: number;
};

/**
 * Statut d'une facture, déduit de ses encaissements (décisions 4 et 5 de la spec 4.3).
 * Taxe de la facture connue : on compare le total encaissé (hors taxe + taxe) au toutes taxes comprises ; la taxe vide d'un encaissement
 * compte pour zéro (« partiellement payée » tant qu'elle manque), rien n'est réparti ni inventé.
 * Taxe de la facture inconnue : on compare le hors taxe encaissé au hors taxe de la facture.
 */
export function invoiceBalance(invoice: InvoiceAmounts, payments: PaymentAmounts[]): InvoiceBalance {
  const basis = invoice.tax_cents === null ? "ht" : "ttc";
  const dueCents = invoice.amount_ht_cents + (invoice.tax_cents ?? 0);
  const paidCents = payments.reduce((sum, p) => sum + p.amount_ht_cents + (basis === "ttc" ? (p.tax_cents ?? 0) : 0), 0);
  const status: InvoiceStatus = payments.length === 0 ? "unpaid" : paidCents >= dueCents ? "paid" : "partial";
  return {
    status,
    basis,
    dueCents,
    paidCents,
    remainingCents: Math.max(0, dueCents - paidCents),
    overpaidCents: Math.max(0, paidCents - dueCents),
    paymentsMissingTax: basis === "ttc" ? payments.filter((p) => p.tax_cents === null).length : 0,
  };
}

/**
 * Trop-perçu que ferait l'encaissement en cours de saisie (en centimes, 0 si aucun ou si le montant n'est pas encore valide).
 * `others` : les autres encaissements de la facture (sans celui qu'on modifie). Avertissement seulement : rien ne bloque (un trop-perçu existe).
 */
export function overpaymentIfSaved(invoice: InvoiceAmounts, others: PaymentAmounts[], draft: { amount_ht: string; tax: string }): number {
  const ht = parseAmountToCents(draft.amount_ht.trim());
  if (ht === null || ht <= 0 || ht > PAYMENT_AMOUNT_MAX_CENTS) return 0;
  const taxText = draft.tax.trim();
  const tax = taxText ? parseAmountToCents(taxText) : null;
  if (taxText && tax === null) return 0;
  const before = invoiceBalance(invoice, others).overpaidCents;
  const after = invoiceBalance(invoice, [...others, { amount_ht_cents: ht, tax_cents: tax }]).overpaidCents;
  return after - before; // seulement ce que CET encaissement ajoute au dépassement
}
