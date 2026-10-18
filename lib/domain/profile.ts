import { isDay } from "./missions.ts";

export const OTHER = "other";
export const OTHER_MAX = 200;
export const FREE_TEXT_MAX = 2000;

type Option = { value: string; label: string };
export type ProfileFieldDef = {
  key: string;
  label: string;
  kind: "choice" | "date" | "text";
  options?: Option[];
  /** « Autre » avec un champ libre. */
  allowOther?: boolean;
  hint?: string;
};

const o = (value: string, label: string): Option => ({ value, label });

/** Ordre d'affichage de la page Profil. Aucune règle fiscale ici : seulement des étiquettes. */
export const PROFILE_FIELDS: ProfileFieldDef[] = [
  { key: "legal_status", label: "Statut juridique", kind: "choice", allowOther: true, options: [o("micro_enterprise", "Micro-entreprise"), o("sole_proprietorship", "Entreprise individuelle"), o("company", "Société (EURL, SASU)")] },
  { key: "tax_regime", label: "Régime fiscal", kind: "choice", allowOther: true, options: [o("micro_bnc", "Micro-BNC"), o("controlled_declaration", "Déclaration contrôlée")] },
  { key: "activity_category", label: "Catégorie", kind: "choice", options: [o("bnc", "BNC"), o("bic", "BIC")] },
  { key: "service_nature", label: "Nature des prestations", kind: "choice", allowOther: true, options: [o("services", "Prestation de services"), o("goods", "Vente de marchandises"), o("mixed", "Mixte")] },
  { key: "activity_start_date", label: "Date de début d'activité", kind: "date", hint: "Une date prévue (future) est acceptée." },
  { key: "urssaf_frequency", label: "Fréquence des déclarations Urssaf", kind: "choice", allowOther: true, options: [o("monthly", "Mensuelle"), o("quarterly", "Trimestrielle")] },
  { key: "vat_regime", label: "Régime de TVA", kind: "choice", allowOther: true, options: [o("franchise", "Franchise en base"), o("simplified", "Réel simplifié"), o("normal", "Réel normal")] },
  { key: "acre", label: "Éligibilité à l'ACRE", kind: "choice", options: [o("eligible", "Éligible"), o("not_eligible", "Non éligible"), o("unknown", "Je ne sais pas")] },
  { key: "job_seeker", label: "Situation France Travail", kind: "choice", allowOther: true, options: [o("registered", "Inscrit"), o("not_registered", "Non inscrit")] },
  { key: "financial_goals", label: "Objectifs financiers", kind: "text", hint: "Texte libre, sans calcul pour l'instant." },
  { key: "reserve_rates", label: "Taux de réserve personnels", kind: "text", hint: "Texte libre, sans calcul pour l'instant." },
  { key: "notification_prefs", label: "Préférences de notification", kind: "text", hint: "Pas encore utilisé : aucune notification n'existe pour l'instant." },
];

export const THRESHOLDS = [50, 75, 90, 100] as const;
export const DEFAULT_THRESHOLDS: readonly number[] = [90, 100];

export type FieldState = "missing" | "declared" | "confirmed";

/** « À confirmer » (vide), « Déclaré » (rempli, non confirmé) ou « Confirmé » (avec date). */
export function fieldState(value: unknown, confirmedAt: string | null | undefined): FieldState {
  if (value === null || value === undefined || value === "") return "missing";
  return confirmedAt ? "confirmed" : "declared";
}

export type FieldPatch = Record<string, string | null>;

const stripNul = (s: string) => s.replaceAll("\u0000", "");
// Même décompte que char_length côté base (points de code).
const length = (s: string) => [...s].length;

/**
 * Valide la saisie d'un champ et rend les colonnes à écrire. Champ vidé = « À confirmer » (null).
 * La date de confirmation n'est pas touchée ici : le déclencheur de la base la remet à zéro si la valeur change.
 */
export function parseFieldInput(key: string, input: { value: string; other?: string }): { ok: true; patch: FieldPatch } | { ok: false; error: string } {
  const def = PROFILE_FIELDS.find((f) => f.key === key);
  if (!def) return { ok: false, error: "Champ inconnu." };
  const value = stripNul(input.value).trim();
  if (def.kind === "choice") {
    if (value === "") return { ok: true, patch: def.allowOther ? { [key]: null, [`${key}_other`]: null } : { [key]: null } };
    if (value === OTHER && def.allowOther) {
      const other = stripNul(input.other ?? "").trim();
      if (!other) return { ok: false, error: "Précise la valeur « Autre »." };
      if (length(other) > OTHER_MAX) return { ok: false, error: `Le texte doit faire ${OTHER_MAX} caractères au plus.` };
      return { ok: true, patch: { [key]: OTHER, [`${key}_other`]: other } };
    }
    if (!def.options?.some((opt) => opt.value === value)) return { ok: false, error: "Choisis une valeur de la liste." };
    return { ok: true, patch: def.allowOther ? { [key]: value, [`${key}_other`]: null } : { [key]: value } };
  }
  if (def.kind === "date") {
    if (value === "") return { ok: true, patch: { [key]: null } };
    if (!isDay(value)) return { ok: false, error: "Saisis une date qui existe (JJ/MM/AAAA)." };
    return { ok: true, patch: { [key]: value } };
  }
  if (value === "") return { ok: true, patch: { [key]: null } };
  if (length(value) > FREE_TEXT_MAX) return { ok: false, error: `Le texte doit faire ${FREE_TEXT_MAX} caractères au plus.` };
  return { ok: true, patch: { [key]: value } };
}

/** Seuils cochés : sous-ensemble de 50, 75, 90, 100, sans doublon, triés. Aucune case cochée est permis. */
export function parseThresholds(values: string[]): { ok: true; value: number[] } | { ok: false; error: string } {
  const nums = values.map(Number);
  if (nums.some((n) => !THRESHOLDS.includes(n as (typeof THRESHOLDS)[number]))) return { ok: false, error: "Seuil inconnu." };
  return { ok: true, value: [...new Set(nums)].sort((a, b) => a - b) };
}

export type ProfileRow = Record<string, unknown> & { alert_thresholds: number[] };

/** Les champs encore « À confirmer » : utile aux règles qui en dépendent (« paramètre manquant »). */
export function missingFields(row: ProfileRow | null): string[] {
  return PROFILE_FIELDS.filter((f) => fieldState(row?.[f.key], row?.[`${f.key}_confirmed_at`] as string | null) === "missing").map((f) => f.key);
}
