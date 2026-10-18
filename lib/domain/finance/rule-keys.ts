import { formatCents, parseAmountToCents } from "../quotes.ts";

/**
 * Catalogue fermé des règles réglementaires (AD-12) : pour chaque clé, le schéma des `params`.
 * Ce fichier ne contient AUCUNE valeur réglementaire (ni montant, ni durée, ni taux) : seulement des noms, des types et des bornes de saisie.
 * Ajouter une clé = l'ajouter ici, avec ses champs.
 */
export type ParamOption = { value: string; label: string };
export type ParamField = {
  /** Nom stocké dans `params` (un montant en euros est stocké en centimes : nom en `_cents`). */
  name: string;
  label: string;
  kind: "euros" | "int" | "select" | "text";
  options?: ParamOption[];
  min?: number;
  max?: number;
  /** Champ affiché seulement quand un autre champ vaut cette valeur (ex. période « autre »). */
  showIf?: { field: string; equals: string };
};
export type RuleKeyDef = { key: string; label: string; fields: ParamField[] };

const PERIODS: ParamOption[] = [
  { value: "calendar_year", label: "Année civile" },
  { value: "rolling_12_months", label: "12 mois glissants" },
  { value: "other", label: "Autre" },
];
const TAX_BASES: ParamOption[] = [
  { value: "excl_tax", label: "Hors taxe" },
  { value: "incl_tax", label: "Taxe comprise" },
];
const ceilingFields = (): ParamField[] => [
  { name: "amount_cents", label: "Montant du plafond (€)", kind: "euros" },
  { name: "period", label: "Période de référence", kind: "select", options: PERIODS },
  { name: "period_other", label: "Période : précise", kind: "text", max: 200, showIf: { field: "period", equals: "other" } },
  { name: "revenue_category", label: "Catégorie de recettes prises en compte", kind: "text", max: 200 },
  { name: "tax_basis", label: "Base de calcul", kind: "select", options: TAX_BASES },
];

export const RULE_KEYS: RuleKeyDef[] = [
  { key: "ceiling_turnover_micro", label: "Plafond de chiffre d'affaires (micro)", fields: ceilingFields() },
  { key: "ceiling_vat_franchise", label: "Plafond de franchise de TVA", fields: ceilingFields() },
  { key: "ceiling_vat_tolerance", label: "Seuil de tolérance de TVA", fields: ceilingFields() },
  { key: "acre_duration", label: "Durée de l'ACRE", fields: [{ name: "months", label: "Durée (mois)", kind: "int", min: 1, max: 120 }] },
  { key: "first_year_prorata", label: "Prorata de la première année", fields: [{ name: "day_basis", label: "Base de jours", kind: "int", min: 1, max: 400 }] },
  {
    key: "vat_switch",
    label: "Bascule de TVA",
    fields: [
      { name: "delay", label: "Délai", kind: "int", min: 1, max: 1000 },
      { name: "unit", label: "Unité du délai", kind: "select", options: [{ value: "days", label: "Jours" }, { value: "months", label: "Mois" }] },
    ],
  },
];

export const ruleKeyDef = (key: string): RuleKeyDef | null => RULE_KEYS.find((k) => k.key === key) ?? null;

// Même décompte que char_length côté base (points de code).
const length = (s: string) => [...s].length;
const stripNul = (s: string) => s.replaceAll("\u0000", "");

/** Les champs visibles pour les valeurs saisies (un champ conditionnel n'existe que si sa condition est remplie). */
export const visibleFields = (def: RuleKeyDef, raw: Record<string, string>): ParamField[] =>
  def.fields.filter((f) => !f.showIf || raw[f.showIf.field] === f.showIf.equals);

/** Valide la saisie des paramètres d'une clé ; rend les `params` à stocker ou une erreur par champ. Rien n'est prérempli ni deviné. */
export function parseParams(key: string, raw: Record<string, string>): { ok: true; params: Record<string, string | number> } | { ok: false; errors: Record<string, string> } {
  const def = ruleKeyDef(key);
  if (!def) return { ok: false, errors: { _: "Règle inconnue." } };
  const params: Record<string, string | number> = {};
  const errors: Record<string, string> = {};
  for (const f of visibleFields(def, raw)) {
    const value = stripNul(raw[f.name] ?? "").trim();
    if (!value) {
      errors[f.name] = "Obligatoire.";
      continue;
    }
    if (f.kind === "euros") {
      const cents = parseAmountToCents(value);
      if (cents === null || cents <= 0) errors[f.name] = "Saisis un montant en euros supérieur à 0 (ex. 1 234,50).";
      else params[f.name] = cents;
    } else if (f.kind === "int") {
      const n = /^\d{1,6}$/.test(value) ? Number(value) : NaN;
      if (!Number.isInteger(n) || n < (f.min ?? 0) || n > (f.max ?? 1_000_000)) errors[f.name] = `Saisis un nombre entier entre ${f.min ?? 0} et ${f.max ?? 1_000_000}.`;
      else params[f.name] = n;
    } else if (f.kind === "select") {
      if (!f.options?.some((o) => o.value === value)) errors[f.name] = "Choisis une valeur de la liste.";
      else params[f.name] = value;
    } else if (length(value) > (f.max ?? 200)) errors[f.name] = `Au plus ${f.max ?? 200} caractères.`;
    else params[f.name] = value;
  }
  return Object.keys(errors).length ? { ok: false, errors } : { ok: true, params };
}

/** Lecture humaine des paramètres d'une règle (« Libellé : valeur »), dans l'ordre du schéma. */
export function describeParams(key: string, params: Record<string, unknown>): string[] {
  const def = ruleKeyDef(key);
  if (!def) return [];
  return def.fields
    .filter((f) => params[f.name] !== undefined && params[f.name] !== null)
    .map((f) => {
      const v = params[f.name];
      if (f.kind === "euros") return `${f.label.replace(/ \(€\)$/, "")} : ${formatCents(Number(v))}`;
      if (f.kind === "select") return `${f.label} : ${f.options?.find((o) => o.value === v)?.label ?? String(v)}`;
      return `${f.label} : ${String(v)}`;
    });
}

/** Valeurs de formulaire reprises de l'ancienne version (décision 3 : paramètres repris, jamais source ni dates). */
export function paramsToForm(key: string, params: Record<string, unknown>): Record<string, string> {
  const def = ruleKeyDef(key);
  const out: Record<string, string> = {};
  for (const f of def?.fields ?? []) {
    const v = params[f.name];
    if (v === undefined || v === null) continue;
    out[f.name] = f.kind === "euros" ? `${Math.floor(Number(v) / 100)},${String(Number(v) % 100).padStart(2, "0")}` : String(v);
  }
  return out;
}
