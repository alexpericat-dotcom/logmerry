import { isDay } from "./missions.ts";
import { isUuid } from "./notes.ts";
import { parseAmountToCents } from "./quotes.ts";

/** 1 000 000 € : garde-fou de saisie, pas une règle métier (la base le fait respecter aussi). */
export const INVOICE_AMOUNT_MAX_CENTS = 100_000_000;
export const INVOICE_REFERENCE_MAX = 60;
export const INVOICE_NOTE_MAX = 500;

export type InvoiceInput = { mission_id: string; quote_id: string; amount_ht: string; tax: string; due_on: string; issued_on: string; reference: string; note: string };
export type InvoiceValues = {
  mission_id: string;
  quote_id: string | null;
  amount_ht_cents: number;
  tax_cents: number | null;
  due_on: string;
  issued_on: string | null;
  reference: string | null;
  note: string | null;
};
export type InvoiceErrors = Partial<Record<keyof InvoiceInput, string>>;

/** La base compte en points de code (`char_length`), pas en unités UTF-16. */
const length = (s: string) => Array.from(s).length;
const stripNul = (s: string) => s.replaceAll("\u0000", ""); // Postgres refuse NUL (22021) : on le retire avant de valider

/**
 * Valide une facture (décisions 4 et 5 de la spec 4.2). Mission, hors taxe strictement positif et échéance obligatoires ;
 * taxe vide = inconnue (`null`, jamais 0) ; échéance possible dans le passé, jamais avant l'émission ; émission jamais dans le futur.
 * `today` (jour de Paris) est reçu en argument : la règle ne lit pas l'horloge.
 */
export function validateInvoiceInput(input: InvoiceInput, today: string): { ok: true; value: InvoiceValues } | { ok: false; errors: InvoiceErrors } {
  const errors: InvoiceErrors = {};
  const mission = input.mission_id.trim();
  const quote = input.quote_id.trim();
  const ht = input.amount_ht.trim();
  const tax = input.tax.trim();
  const due = input.due_on.trim();
  const issued = input.issued_on.trim();
  const reference = stripNul(input.reference).trim();
  const note = stripNul(input.note).trim();

  if (!isUuid(mission)) errors.mission_id = "Choisis une mission de la liste.";
  if (quote && !isUuid(quote)) errors.quote_id = "Choisis un devis de la liste.";

  const htCents = ht ? parseAmountToCents(ht) : null;
  if (!ht) errors.amount_ht = "Saisis le montant hors taxe.";
  else if (htCents === null) errors.amount_ht = "Saisis un montant valide, par exemple 1 250,50.";
  else if (htCents <= 0) errors.amount_ht = "Le montant hors taxe doit être supérieur à 0.";
  else if (htCents > INVOICE_AMOUNT_MAX_CENTS) errors.amount_ht = "Ce montant est trop élevé (1 000 000 € au plus).";

  const taxCents = tax ? parseAmountToCents(tax) : null;
  if (tax && taxCents === null) errors.tax = "Saisis un montant de taxe valide, ou laisse vide si tu ne la connais pas.";
  else if (taxCents !== null && taxCents > INVOICE_AMOUNT_MAX_CENTS) errors.tax = "Ce montant est trop élevé (1 000 000 € au plus).";

  if (!due) errors.due_on = "Saisis la date d'échéance.";
  else if (!isDay(due)) errors.due_on = "Saisis une date d'échéance valide.";

  if (issued && !isDay(issued)) errors.issued_on = "Saisis une date d'émission valide.";
  else if (issued && issued > today) errors.issued_on = "La date d'émission ne peut pas être dans le futur.";
  else if (issued && due && isDay(due) && due < issued) errors.due_on = "L'échéance ne peut pas être avant l'émission.";

  if (length(reference) > INVOICE_REFERENCE_MAX) errors.reference = `La référence fait ${INVOICE_REFERENCE_MAX} caractères au plus.`;
  if (length(note) > INVOICE_NOTE_MAX) errors.note = `La remarque fait ${INVOICE_NOTE_MAX} caractères au plus.`;

  if (Object.keys(errors).length || htCents === null) return { ok: false, errors };
  return { ok: true, value: { mission_id: mission, quote_id: quote || null, amount_ht_cents: htCents, tax_cents: taxCents, due_on: due, issued_on: issued || null, reference: reference || null, note: note || null } };
}

const dayNumber = (day: string) => Date.parse(`${day}T00:00:00Z`) / 86_400_000;

/**
 * Échue : l'échéance est strictement avant aujourd'hui (le jour même, elle ne l'est pas encore).
 * Story 4.3 : « pas totalement payée » s'ajoutera ici quand les encaissements existeront ; jusque-là toute facture est non payée.
 */
export const isOverdue = (due_on: string, today: string) => due_on < today;

/** Jours de retard (0 si pas échue). */
export const daysLate = (due_on: string, today: string) => Math.max(0, Math.round(dayNumber(today) - dayNumber(due_on)));

export const INVOICE_FILTERS = ["toutes", "non-payees", "echues"] as const;
export type InvoiceFilter = (typeof INVOICE_FILTERS)[number];
export const INVOICE_FILTER_LABELS: Record<InvoiceFilter, string> = { toutes: "Toutes", "non-payees": "Non payées", echues: "Échues" };

export const parseInvoiceFilter = (value: string | string[] | undefined): InvoiceFilter => INVOICE_FILTERS.find((f) => f === value) ?? "toutes";

type Row = { id: string; due_on: string; created_at: string };

/**
 * Filtre puis trie par échéance croissante (les plus anciennes échues en tête), départage stable par création puis identifiant.
 * Story 4.3 : « non payées » comprendra les partiellement payées, et exclura les payées.
 */
export function viewInvoices<T extends Row>(all: T[], filter: InvoiceFilter, today: string): T[] {
  const kept = filter === "echues" ? all.filter((i) => isOverdue(i.due_on, today)) : all;
  return [...kept].sort((a, b) => a.due_on.localeCompare(b.due_on) || a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id));
}

/** Devis qu'on propose de lier : acceptés, du même client que la mission (décision 3). */
export const linkableQuotes = <T extends { client_id: string; status: string }>(quotes: T[], clientId: string): T[] =>
  quotes.filter((q) => q.status === "accepted" && q.client_id === clientId);

/** Refus de supprimer une mission qui a des factures (une facture se garde, donc la mission aussi). */
export const invoicesRefusal = (n: number) =>
  `Cette mission a ${n} facture${n > 1 ? "s" : ""} : une facture se garde tant qu'elle existe, donc la mission aussi (supprime d'abord la facture).`;

/** Un devis lié à une facture ne se supprime pas (clé étrangère sans cascade). */
export const QUOTE_INVOICE_REFUSAL = "Ce devis est lié à une facture : supprime d'abord la facture.";

export const INVOICE_NOT_LEGAL = "Ce suivi n'est pas une facture légale : émets tes factures dans ton outil de facturation.";
