import { isDay } from "../missions.ts";
import { parseParams, ruleKeyDef } from "./rule-keys.ts";

export type RuleStatus = "a_verifier" | "verifiee" | "essai";
export type ActivityCategory = "bnc" | "bic";
export type RuleRow = {
  id: string;
  rule_key: string;
  activity_category: ActivityCategory;
  description: string | null;
  params: Record<string, unknown>;
  effective_from: string;
  effective_to: string | null;
  source: string;
  verified_on: string;
  revalidate_after: string;
  status: RuleStatus;
  previous_version_id: string | null;
};

export const ACTIVITY_CATEGORY_LABELS: Record<ActivityCategory, string> = { bnc: "BNC", bic: "BIC" };
export const RULE_STATUS_LABELS = { a_verifier: "À vérifier", verifiee: "Vérifiée", perimee: "Périmée", essai: "DEMO, non officielle" } as const;
export type RuleDisplayState = keyof typeof RULE_STATUS_LABELS;

/** Même motif que la contrainte de la base : « Vérifiée » exige un vrai lien https. */
export const isOfficialLink = (source: string): boolean => /^https:\/\/\S+$/.test(source);

/** « Périmée » est dérivée, jamais stockée : une règle EN VIGUEUR dont la date de revérification est dépassée. Une version close est de l'histoire. */
export function displayState(rule: RuleRow, asOf: string): RuleDisplayState {
  if (rule.status === "verifiee" && rule.effective_to === null && rule.revalidate_after < asOf) return "perimee";
  return rule.status;
}

export const isInForce = (rule: RuleRow, asOf: string): boolean => rule.effective_from <= asOf && (rule.effective_to === null || asOf < rule.effective_to);

export type RuleUsability =
  | { status: "ok"; rule: RuleRow; demo: boolean }
  | { status: "missing_parameter"; reason: "absente" | "non_verifiee" | "perimee" };

/**
 * La règle à utiliser pour une clé et une catégorie à une date, ou la raison pour laquelle on n'en a pas.
 * Une règle absente, « à vérifier » ou périmée n'est jamais utilisée en silence ; une règle d'essai l'est, avec le drapeau `demo`.
 */
export function usableRule(rules: RuleRow[], key: string, category: ActivityCategory, asOf: string): RuleUsability {
  const rule = rules.find((r) => r.rule_key === key && r.activity_category === category && isInForce(r, asOf));
  if (!rule) return { status: "missing_parameter", reason: "absente" };
  const state = displayState(rule, asOf);
  if (state === "a_verifier") return { status: "missing_parameter", reason: "non_verifiee" };
  if (state === "perimee") return { status: "missing_parameter", reason: "perimee" };
  return { status: "ok", rule, demo: state === "essai" };
}

export type RuleInput = {
  rule_key: string;
  activity_category: string;
  effective_from: string;
  source: string;
  verified_on: string;
  revalidate_after: string;
  description: string;
  params: Record<string, string>;
};
export type RuleErrors = Record<string, string>;
export type RuleValues = {
  rule_key: string;
  activity_category: ActivityCategory;
  effective_from: string;
  params: Record<string, string | number>;
  source: string;
  verified_on: string;
  revalidate_after: string;
  description: string | null;
};

const stripNul = (s: string) => s.replaceAll("\u0000", "");
const length = (s: string) => [...s].length;

/** Valide la saisie d'une règle (nouvelle règle ou nouvelle version). Aucune valeur n'est préremplie ni devinée. */
export function validateRuleInput(input: RuleInput): { ok: true; value: RuleValues } | { ok: false; errors: RuleErrors } {
  const errors: RuleErrors = {};
  if (!ruleKeyDef(input.rule_key)) errors.rule_key = "Règle inconnue.";
  if (input.activity_category !== "bnc" && input.activity_category !== "bic") errors.activity_category = "Choisis une catégorie d'activité.";
  const effective = input.effective_from.trim();
  if (!isDay(effective)) errors.effective_from = "Saisis une date d'effet qui existe (JJ/MM/AAAA).";
  const source = stripNul(input.source).trim();
  if (!source) errors.source = "Indique la source officielle (lien).";
  else if (length(source) > 500) errors.source = "La source doit faire 500 caractères au plus.";
  else if (source === "DEMO") errors.source = "« DEMO » est réservée aux règles d'essai du compte de démonstration.";
  const verified = input.verified_on.trim();
  if (!isDay(verified)) errors.verified_on = "Saisis la date à laquelle tu as vérifié la source.";
  const revalidate = input.revalidate_after.trim();
  if (!isDay(revalidate)) errors.revalidate_after = "Saisis la date de revérification.";
  else if (isDay(verified) && revalidate < verified) errors.revalidate_after = "La revérification ne peut pas précéder la vérification.";
  const description = stripNul(input.description).trim();
  if (description && length(description) > 500) errors.description = "La description doit faire 500 caractères au plus.";
  const params = parseParams(input.rule_key, input.params);
  if (!params.ok) for (const [k, v] of Object.entries(params.errors)) errors[`param:${k}`] = v;
  if (Object.keys(errors).length || !params.ok) return { ok: false, errors };
  return {
    ok: true,
    value: {
      rule_key: input.rule_key,
      activity_category: input.activity_category as ActivityCategory,
      effective_from: effective,
      params: params.params,
      source,
      verified_on: verified,
      revalidate_after: revalidate,
      description: description || null,
    },
  };
}

/** Actions permises sur une version, selon son statut (la base les impose aussi). */
export const canVerify = (r: RuleRow): boolean => r.status === "a_verifier" && isOfficialLink(r.source);
export const canUnverify = (r: RuleRow): boolean => r.status === "verifiee";
export const canRevalidate = (r: RuleRow): boolean => r.status === "verifiee";
export const canDeleteRule = (r: RuleRow): boolean => r.status === "a_verifier";
