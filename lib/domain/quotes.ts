import { isDay } from "./missions.ts";
import { isUuid } from "./notes.ts";

export const QUOTE_STATUSES = ["draft", "sent", "accepted", "refused"] as const;
export type QuoteStatus = (typeof QUOTE_STATUSES)[number];
export const QUOTE_STATUS_LABELS: Record<QuoteStatus, string> = { draft: "Brouillon", sent: "Envoyé", accepted: "Accepté", refused: "Refusé" };

/** Ce que chaque statut permet (la base le fait respecter aussi : déclencheur et règles d'accès). */
export const canEditQuote = (s: QuoteStatus) => s === "draft" || s === "sent";
export const canSendQuote = (s: QuoteStatus) => s === "draft";
export const canRefuseQuote = (s: QuoteStatus) => s === "sent";
export const canAcceptQuote = (s: QuoteStatus) => s === "sent";
export const canDeleteQuote = (s: QuoteStatus) => s === "draft";

/** 100 000 000 € : très au-delà d'un devis réel, très en deçà de ce que JavaScript compte sans erreur. */
export const QUOTE_AMOUNT_MAX_CENTS = 10_000_000_000;

/**
 * « 1 250,50 », « 1250.5 », « 1250 » → centimes entiers (jamais de flottant). Refuse le négatif, plus de deux décimales, tout texte.
 * Espaces (dont insécables) et un seul séparateur décimal (virgule ou point) acceptés ; pas de séparateur de milliers autre que l'espace.
 */
export function parseAmountToCents(raw: string): number | null {
  const s = raw.replace(/[\s  ]/g, "");
  const m = /^(\d{1,12})(?:[.,](\d{1,2}))?$/.exec(s);
  if (!m) return null;
  return Number(m[1]) * 100 + Number((m[2] ?? "").padEnd(2, "0"));
}

export type QuoteInput = { amount_ht: string; tax: string; sent_on: string; mission_id: string };
export type QuoteValues = { amount_ht_cents: number; tax_cents: number | null; sent_on: string | null; mission_id: string | null };
export type QuoteErrors = { amount_ht?: string; tax?: string; sent_on?: string; mission_id?: string };

/**
 * Valide un devis. Montant hors taxe obligatoire et positif ; taxe vide = inconnue (`null`, jamais 0) ; la date d'envoi n'est
 * obligatoire que pour un devis envoyé (`sentRequired`). Un champ vide devient `null`.
 */
export function validateQuoteInput(input: QuoteInput, sentRequired: boolean): { ok: true; value: QuoteValues } | { ok: false; errors: QuoteErrors } {
  const errors: QuoteErrors = {};
  const ht = input.amount_ht.trim();
  const tax = input.tax.trim();
  const sent = input.sent_on.trim();
  const mission = input.mission_id.trim();

  const htCents = ht ? parseAmountToCents(ht) : null;
  if (!ht) errors.amount_ht = "Saisis le montant hors taxe.";
  else if (htCents === null) errors.amount_ht = "Saisis un montant valide, par exemple 1 250,50.";
  else if (htCents <= 0) errors.amount_ht = "Le montant hors taxe doit être supérieur à 0.";
  else if (htCents > QUOTE_AMOUNT_MAX_CENTS) errors.amount_ht = "Ce montant est trop élevé.";

  const taxCents = tax ? parseAmountToCents(tax) : null;
  if (tax && taxCents === null) errors.tax = "Saisis un montant de taxe valide, ou laisse vide si tu ne la connais pas.";
  else if (taxCents !== null && taxCents > QUOTE_AMOUNT_MAX_CENTS) errors.tax = "Ce montant est trop élevé.";

  if (sent && !isDay(sent)) errors.sent_on = "Saisis une date d'envoi valide.";
  else if (!sent && sentRequired) errors.sent_on = "Saisis la date d'envoi.";

  if (mission && !isUuid(mission)) errors.mission_id = "Choisis une mission de la liste.";

  if (Object.keys(errors).length || htCents === null) return { ok: false, errors };
  return { ok: true, value: { amount_ht_cents: htCents, tax_cents: taxCents, sent_on: sent || null, mission_id: mission || null } };
}

/** Montant TTC : seulement si la taxe est connue (sinon `null`, on n'invente rien). */
export const totalCents = (q: { amount_ht_cents: number; tax_cents: number | null }): number | null => (q.tax_cents == null ? null : q.amount_ht_cents + q.tax_cents);

/** Centimes → « 1 250,50 € » (espace insécable de la locale française). */
export const formatCents = (cents: number): string => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(cents / 100);

/** Centimes → texte de saisie « 1250,50 » pour préremplir un champ. */
export const centsToInput = (cents: number): string => `${Math.floor(cents / 100)},${String(cents % 100).padStart(2, "0")}`;

/** Refus de supprimer une fiche qui a des devis (un devis envoyé, refusé ou accepté se garde ; un brouillon se supprime d'abord). */
export const quotesRefusal = (n: number) =>
  n === 1
    ? "Cette fiche a 1 devis : un devis envoyé, refusé ou accepté se garde, donc la fiche aussi (un brouillon se supprime d'abord)."
    : `Cette fiche a ${n} devis : un devis envoyé, refusé ou accepté se garde, donc la fiche aussi (un brouillon se supprime d'abord).`;

export const MISSION_QUOTE_REFUSAL = "Cette mission est liée à un devis : le devis se garde, donc la mission aussi.";
