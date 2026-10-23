import { THRESHOLDS } from "../profile.ts";
import { isDay } from "../missions.ts";
import { RULE_KEYS } from "./rule-keys.ts";
import { usableRule, type RuleRow } from "./rules.ts";

/**
 * Jauges de plafond (story 4.4). Fonction pure : elle reçoit les règles, le profil, les encaissements et `asOf` (jour de Paris), ne lit ni l'horloge ni la base.
 * Aucune valeur réglementaire ici : montant, période, base viennent de la règle ; seuils actifs du profil ; rien n'est supposé quand une donnée manque.
 * Les montants sont des centimes entiers (jamais de flottant).
 */
export const CEILING_KEYS = ["ceiling_turnover_micro", "ceiling_vat_franchise", "ceiling_vat_tolerance"] as const;
export type CeilingKey = (typeof CEILING_KEYS)[number];

export type CeilingProfile = {
  activity_category?: unknown;
  activity_category_confirmed_at?: unknown;
  activity_start_date?: unknown;
  alert_thresholds: number[];
} | null;

export type CeilingPayment = { amount_ht_cents: number; tax_cents: number | null; received_on: string };

export type MissingReason = "category_missing" | "rule_absent" | "rule_unverified" | "rule_stale" | "period_other" | "params_invalid";
export const MISSING_TEXT: Record<MissingReason, string> = {
  category_missing: "catégorie d'activité du profil à renseigner",
  rule_absent: "aucune règle en vigueur pour ce plafond",
  rule_unverified: "règle à vérifier à sa source officielle",
  rule_stale: "règle périmée, à revérifier",
  period_other: "période à préciser (le calcul ne sait pas lire une période libre)",
  params_invalid: "paramètres de la règle illisibles",
};

export type CeilingState = "below" | "threshold" | "reached" | "exceeded";

export type CeilingMissing = { status: "missing_parameter"; key: CeilingKey; label: string; reason: MissingReason; link: "/profil" | "/regles" };
export type CeilingGauge = {
  status: "ok";
  key: CeilingKey;
  label: string;
  demo: boolean;
  /** Catégorie d'activité « Déclaré » mais pas « Confirmé » : bandeau « calcul basé sur une donnée déclarée, non confirmée ». */
  declaredNotConfirmed: boolean;
  ceilingCents: number;
  consumedCents: number;
  /** Pourcentage entier, arrondi à l'inférieur (89,9 % vaut 89 : il n'atteint pas le seuil de 90 %). */
  percent: number;
  remainingCents: number;
  overCents: number;
  period: { kind: "calendar_year" | "rolling_12_months"; from: string; to: string };
  revenueCategory: string;
  basis: "excl_tax" | "incl_tax";
  /** Base taxe comprise avec des taxes d'encaissement vides (comptées pour zéro) : le montant est un minimum, jamais présenté comme exact. */
  minimum: boolean;
  paymentsMissingTax: number;
  /** Date du dernier encaissement pris en compte. */
  lastUpdate: string | null;
  source: string;
  effectiveFrom: string;
  /** Le plus haut seuil ACTIF atteint (pour l'alerte et, plus tard, les tâches du cockpit), ou null. */
  alertThreshold: number | null;
  state: CeilingState;
  /** Début d'activité dans la période : le prorata de première année n'est pas appliqué (règle bloquée jusqu'à la 4.5). */
  firstYearNotProrated: boolean;
};
export type CeilingResult = CeilingMissing | CeilingGauge;

const ceilingLabel = (key: CeilingKey) => RULE_KEYS.find((k) => k.key === key)?.label ?? key;

const dayNumber = (day: string) => Date.parse(`${day}T00:00:00Z`) / 86_400_000;
const toDay = (n: number) => new Date(n * 86_400_000).toISOString().slice(0, 10);

/** Premier jour d'une période de 12 mois glissants qui se termine à `asOf` (inclus) : un an avant, plus un jour. Le 29 février remonte au 28. */
export function rollingStart(asOf: string): string {
  const [y, m, d] = asOf.split("-").map(Number);
  const prev = `${String(y - 1).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(m === 2 && d === 29 ? 28 : d).padStart(2, "0")}`;
  return toDay(dayNumber(prev) + 1);
}

export function ceilingPeriod(kind: "calendar_year" | "rolling_12_months", asOf: string): { from: string; to: string } {
  return { from: kind === "calendar_year" ? `${asOf.slice(0, 4)}-01-01` : rollingStart(asOf), to: asOf };
}

type Params = { amount: number; period: "calendar_year" | "rolling_12_months" | "other"; basis: "excl_tax" | "incl_tax"; category: string };

/** Lit les paramètres d'une règle de plafond ; `null` si l'un est absent ou d'un autre type (jamais de valeur par défaut). */
const readParams = (p: Record<string, unknown>): Params | null => {
  const { amount_cents: amount, period, tax_basis: basis, revenue_category: category } = p;
  if (typeof amount !== "number" || !Number.isSafeInteger(amount) || amount <= 0) return null;
  if (period !== "calendar_year" && period !== "rolling_12_months" && period !== "other") return null;
  if (basis !== "excl_tax" && basis !== "incl_tax") return null;
  if (typeof category !== "string") return null;
  return { amount, period, basis, category };
};

function oneCeiling(key: CeilingKey, rules: RuleRow[], profile: CeilingProfile, payments: CeilingPayment[], asOf: string): CeilingResult {
  const label = ceilingLabel(key);
  const missing = (reason: MissingReason, link: "/profil" | "/regles"): CeilingMissing => ({ status: "missing_parameter", key, label, reason, link });

  const category = profile?.activity_category;
  if (category !== "bnc" && category !== "bic") return missing("category_missing", "/profil");

  const usable = usableRule(rules, key, category, asOf);
  if (usable.status === "missing_parameter") {
    return missing(usable.reason === "absente" ? "rule_absent" : usable.reason === "non_verifiee" ? "rule_unverified" : "rule_stale", "/regles");
  }
  const params = readParams(usable.rule.params);
  if (!params) return missing("params_invalid", "/regles");
  if (params.period === "other") return missing("period_other", "/regles");

  const period = { kind: params.period, ...ceilingPeriod(params.period, asOf) };
  const counted = payments.filter((p) => p.received_on >= period.from && p.received_on <= period.to);
  const consumedCents = counted.reduce((sum, p) => sum + p.amount_ht_cents + (params.basis === "incl_tax" ? (p.tax_cents ?? 0) : 0), 0);
  const paymentsMissingTax = params.basis === "incl_tax" ? counted.filter((p) => p.tax_cents === null).length : 0;
  const percent = Math.floor((consumedCents * 100) / params.amount);
  const active = [...new Set(profile?.alert_thresholds ?? [])].filter((t) => (THRESHOLDS as readonly number[]).includes(t)).sort((a, b) => a - b);
  const reached = active.filter((t) => percent >= t);
  const alertThreshold = reached.length ? Math.max(...reached) : null;
  const state: CeilingState = consumedCents > params.amount ? "exceeded" : consumedCents === params.amount ? "reached" : alertThreshold !== null ? "threshold" : "below";
  const start = profile?.activity_start_date;

  return {
    status: "ok",
    key,
    label,
    demo: usable.demo,
    declaredNotConfirmed: !profile?.activity_category_confirmed_at,
    ceilingCents: params.amount,
    consumedCents,
    percent,
    remainingCents: Math.max(0, params.amount - consumedCents),
    overCents: Math.max(0, consumedCents - params.amount),
    period,
    revenueCategory: params.category,
    basis: params.basis,
    minimum: paymentsMissingTax > 0,
    paymentsMissingTax,
    lastUpdate: counted.reduce<string | null>((max, p) => (max === null || p.received_on > max ? p.received_on : max), null),
    source: usable.rule.source,
    effectiveFrom: usable.rule.effective_from,
    alertThreshold,
    state,
    firstYearNotProrated: typeof start === "string" && isDay(start) && start >= period.from && start <= period.to,
  };
}

/** Les trois jauges, toujours (décision 4), dans l'ordre du catalogue ; chacune est un résultat chiffré ou « paramètre manquant » avec sa raison et un lien. */
export function computeCeilings(rules: RuleRow[], profile: CeilingProfile, payments: CeilingPayment[], asOf: string): CeilingResult[] {
  return CEILING_KEYS.map((key) => oneCeiling(key, rules, profile, payments, asOf));
}
