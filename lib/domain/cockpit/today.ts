import { addMonths, daysUntil } from "../deadlines.ts";
import { MISSING_TEXT, type CeilingResult } from "../finance/ceilings.ts";
import { usableRule, type RuleRow } from "../finance/rules.ts";
import { daysLate, isOverdue } from "../invoices.ts";
import { isDay } from "../missions.ts";
import { fieldState } from "../profile.ts";

/** Tâche du jour du cockpit, calculée à la lecture (AD-5) : jamais stockée, tri unique règle → date → identifiant. */
export type TodayTask = {
  rule: 1 | 2 | 3 | 4;
  /** Identifiant de la source (échéance ou facture) : une source, une tâche. Règle 3 : plafond et seuil ; règle 4 : « acre ». */
  id: string;
  kind: "deadline" | "invoice" | "ceiling" | "acre";
  /** Règle 3 : clé de coche (plafond, seuil). */
  ceilingKey?: string;
  threshold?: number;
  /** Bandeau « donnée déclarée, non confirmée » et étiquette « DEMO, non officielle » (règles 3 et 4). */
  declared?: boolean;
  demo?: boolean;
  title: string;
  reason: string;
  date: string;
  done: boolean;
};

type DeadlineInput = { id: string; title: string; due_on: string; done_at: string | null };
type InvoiceInput = { id: string; reference: string | null; due_on: string; status: "unpaid" | "partial" | "paid"; mission: { title: string } | null };

/** Profil lu par la règle 4 (ACRE : acre, activity_start_date, activity_category et leurs dates de confirmation) ; `null` = pas de profil. */
export type AcreProfile = Record<string, unknown> | null;

export type MissingLine = { text: string; link: "/profil" | "/regles" };

/** Clé de coche du jour : règle, source, plafond, seuil (cocher 90 % ne masque pas 100 %). */
export const checkKey = (rule: number, sourceId?: string | null, ceilingKey?: string | null, threshold?: number | null) => `${rule}|${sourceId ?? ""}|${ceilingKey ?? ""}|${threshold ?? ""}`;

type Acre = { status: "none" } | { status: "missing"; text: string; link: "/profil" | "/regles" } | { status: "ok"; endsOn: string; demo: boolean; declared: boolean };

/** Fin d'ACRE estimée = début d'activité + durée (en mois) lue dans la règle `acre_duration`. Convention de code, pas une valeur réglementaire. */
function acreEnd(rules: RuleRow[], profile: AcreProfile, asOf: string): Acre {
  const state = fieldState(profile?.acre, profile?.acre_confirmed_at as string | null, "acre");
  if (profile?.acre === "not_eligible") return { status: "none" };
  if (state === "missing" || profile?.acre !== "eligible") return { status: "missing", text: "fin d'ACRE : éligibilité à l'ACRE à renseigner dans ton profil", link: "/profil" };
  const start = profile.activity_start_date;
  const startState = fieldState(start, profile.activity_start_date_confirmed_at as string | null);
  const category = profile.activity_category;
  const lacks: string[] = [];
  if (startState === "missing" || typeof start !== "string" || !isDay(start)) lacks.push("date de début d'activité");
  if (category !== "bnc" && category !== "bic") lacks.push("catégorie d'activité");
  if (lacks.length) return { status: "missing", text: `fin d'ACRE : ${lacks.join(" et ")} du profil à renseigner`, link: "/profil" };
  const usable = usableRule(rules, "acre_duration", category as "bnc" | "bic", asOf);
  if (usable.status === "missing_parameter") {
    const reason = usable.reason === "absente" ? "rule_absent" : usable.reason === "non_verifiee" ? "rule_unverified" : "rule_stale";
    return { status: "missing", text: `fin d'ACRE : durée de l'ACRE, ${MISSING_TEXT[reason]}`, link: "/regles" };
  }
  const months = usable.rule.params.months;
  if (typeof months !== "number" || !Number.isSafeInteger(months) || months <= 0) return { status: "missing", text: `fin d'ACRE : durée de l'ACRE, ${MISSING_TEXT.params_invalid}`, link: "/regles" };
  return { status: "ok", endsOn: addMonths(start as string, months), demo: usable.demo, declared: startState === "declared" };
}

/** Lignes « paramètre manquant » du cockpit : un plafond sans chiffre (règle 3) et une fin d'ACRE incalculable (règle 4). Jamais des tâches. */
export function todayMissing(ceilings: CeilingResult[], rules: RuleRow[], profile: AcreProfile, asOf: string): MissingLine[] {
  const lines: MissingLine[] = [];
  for (const c of ceilings) if (c.status === "missing_parameter") lines.push({ text: `Plafond ${c.label} : ${MISSING_TEXT[c.reason]}`, link: c.link });
  const acre = acreEnd(rules, profile, asOf);
  if (acre.status === "missing") lines.push({ text: acre.text.charAt(0).toUpperCase() + acre.text.slice(1), link: acre.link });
  return lines;
}

const days = (n: number) => `${n} jour${n > 1 ? "s" : ""}`;

/**
 * Règle 1 : échéances saisies dans 0 à 3 jours (une échéance en retard relève du calendrier). Les faites restent, cochées.
 * Règle 2 : factures non soldées dont l'échéance est dépassée d'au moins 1 jour. `checked` : clés de coche du jour (`task_checks`, voir `checkKey`).
 * Règle 3 : un plafond dont un seuil actif du profil est atteint (le plus haut seul, 100 % remplace 90 %). Règle 4 : fin d'ACRE estimée dans 0 à 31 jours.
 * Les tâches cochées descendent en bas ; l'ordre reste règle, date la plus proche, identifiant.
 */
export function todayTasks(
  deadlines: DeadlineInput[],
  invoices: InvoiceInput[],
  checked: Set<string>,
  ceilings: CeilingResult[],
  rules: RuleRow[],
  profile: AcreProfile,
  asOf: string,
): TodayTask[] {
  const tasks: TodayTask[] = [];
  for (const d of deadlines) {
    const n = daysUntil(d.due_on, asOf);
    if (n < 0 || n > 3) continue;
    tasks.push({ rule: 1, id: d.id, kind: "deadline", title: d.title, reason: n === 0 ? "échéance aujourd'hui" : `échéance dans ${days(n)}`, date: d.due_on, done: d.done_at !== null });
  }
  for (const i of invoices) {
    if (!isOverdue(i.due_on, asOf, i.status)) continue;
    tasks.push({
      rule: 2,
      id: i.id,
      kind: "invoice",
      title: `Encaisser la facture ${i.reference ?? i.mission?.title ?? "sans référence"}`,
      reason: `facture échue depuis ${days(daysLate(i.due_on, asOf))}`,
      date: i.due_on,
      done: checked.has(checkKey(2, i.id)),
    });
  }
  for (const c of ceilings) {
    if (c.status !== "ok" || c.alertThreshold === null) continue;
    tasks.push({
      rule: 3,
      id: `${c.key}-${c.alertThreshold}`,
      kind: "ceiling",
      ceilingKey: c.key,
      threshold: c.alertThreshold,
      title: c.label,
      reason: c.state === "exceeded" ? `${c.label} dépassé (estimation)` : `${c.label} à ${c.alertThreshold} % (estimation)`,
      date: asOf,
      done: checked.has(checkKey(3, null, c.key, c.alertThreshold)),
      declared: c.declaredNotConfirmed,
      demo: c.demo,
    });
  }
  const acre = acreEnd(rules, profile, asOf);
  if (acre.status === "ok") {
    const n = daysUntil(acre.endsOn, asOf);
    if (n >= 0 && n <= 31) {
      tasks.push({
        rule: 4,
        id: "acre",
        kind: "acre",
        title: "Fin de l'ACRE",
        reason: `fin d'ACRE estimée ${n === 0 ? "aujourd'hui" : `dans ${days(n)}`} (estimation)`,
        date: acre.endsOn,
        done: checked.has(checkKey(4)),
        declared: acre.declared,
        demo: acre.demo,
      });
    }
  }
  return tasks.sort((a, b) => Number(a.done) - Number(b.done) || a.rule - b.rule || a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
}
