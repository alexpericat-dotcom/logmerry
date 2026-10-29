import { addMonths, daysUntil } from "../deadlines.ts";
import { MISSING_TEXT, type CeilingResult } from "../finance/ceilings.ts";
import { usableRule, type RuleRow } from "../finance/rules.ts";
import { daysLate, isOverdue } from "../invoices.ts";
import { isDay } from "../missions.ts";
import { fieldState } from "../profile.ts";

/** Tâche du jour du cockpit, calculée à la lecture (AD-5) : jamais stockée, tri unique règle → date → identifiant. */
export type TodayTask = {
  /** 1 à 8 : les règles du PRD (FR-14) ; 9 : les tâches du sprint (pas une règle, jamais cochées ici). */
  rule: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
  /** Identifiant de la source (échéance ou facture) : une source, une tâche. Règle 3 : plafond et seuil ; règle 4 : « acre ». */
  id: string;
  kind: "deadline" | "invoice" | "ceiling" | "acre" | "quote" | "pipeline" | "sprint-end" | "sprint-task" | "invoice-due";
  /** Règles 7 et 8 et tâches du sprint : « Client / Mission (/ Sprint X) » et la mission (lien). */
  context?: string;
  missionId?: string;
  /** Départage à date égale, avant l'identifiant (ordre du sprint, des stories, des tâches). */
  order?: number;
  /** Règle 5 : fiche du client du devis (lien de la tâche). */
  clientId?: string;
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

/** Ce qui identifie une coche du jour : règle 2 (facture), 3 (plafond et seuil), 4 et 6 (rien d'autre que la règle), 5 (devis), 7 (sprint) ou 8 (mission à facturer). */
export type CheckTarget = { rule: 2 | 3 | 4 | 5 | 6 | 7 | 8; sourceId?: string; ceilingKey?: string; threshold?: number };

/** Cible de coche d'une tâche du cockpit ; `null` pour une échéance (sa coche vit dans `deadlines.done_at`). Ici, dans le domaine : le composant client l'importe. */
export const targetOf = (t: TodayTask): CheckTarget | null =>
  t.rule === 2 ? { rule: 2, sourceId: t.id } : t.rule === 3 ? { rule: 3, ceilingKey: t.ceilingKey, threshold: t.threshold } : t.rule === 4 ? { rule: 4 } : t.rule === 5 ? { rule: 5, sourceId: t.id } : t.rule === 6 ? { rule: 6 } : t.rule === 7 ? { rule: 7, sourceId: t.id } : t.rule === 8 ? { rule: 8, sourceId: t.id } : null; // règle 9 (tâche de sprint) : la coche vit dans tasks.done

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

/** Seuils des règles 4 à 6 (jours avant la fin d'ACRE, jours sans modification, éléments au pipeline) : nommés, pas dispersés. */
export const QUOTE_IDLE_DAYS = 7;
export const PIPELINE_MIN = 2;
/** Règle 4 : la tâche apparaît à 31 jours ou moins de la fin d'ACRE estimée. */
export const ACRE_WARN_DAYS = 31;
/** Règle 7 : fin de sprint à 0 à 2 jours ; tâches de sprint affichées : 3 au plus. */
export const SPRINT_END_DAYS = 2;
export const SPRINT_TASKS_SHOWN = 3;

/** Sprint « en cours » avec ses stories et leurs tâches (lecture du cockpit) ; `done_on` = jour de Paris où la tâche a été faite. */
export type SprintWork = {
  id: string;
  name: string;
  end_date: string;
  mission: { id: string; title: string; client_name: string | null };
  stories: { id: string; status: string; position: number; tasks: { id: string; title: string; done: boolean; done_on: string; position: number }[] }[];
};

type SprintTasks = { shown: TodayTask[]; extra: number; extraMissionId: string | null };

/** Tâches des stories « en cours » des sprints actifs : non faites (trois au plus, ordre du sprint) puis faites aujourd'hui (cochées, hors décompte). */
function sprintTasks(sprints: SprintWork[], asOf: string): SprintTasks {
  const open: TodayTask[] = [];
  const doneToday: TodayTask[] = [];
  const ordered = [...sprints].sort((a, b) => a.end_date.localeCompare(b.end_date) || a.id.localeCompare(b.id));
  for (const sp of ordered) {
    const left = daysUntil(sp.end_date, asOf);
    const reason = left >= 0 ? `dans ton sprint, qui se termine dans ${days(left)}` : `dans ton sprint, dont la fin est dépassée de ${days(-left)}`;
    const context = `${sp.mission.client_name ?? "Sans client"} / ${sp.mission.title} / ${sp.name}`;
    const stories = sp.stories.filter((st) => st.status === "in_progress").sort((a, b) => a.position - b.position || a.id.localeCompare(b.id));
    for (const st of stories) {
      for (const t of [...st.tasks].sort((a, b) => a.position - b.position || a.id.localeCompare(b.id))) {
        if (t.done && t.done_on !== asOf) continue;
        const list = t.done ? doneToday : open;
        list.push({ rule: 9, id: t.id, kind: "sprint-task", title: t.title, reason, date: sp.end_date, done: t.done, context, missionId: sp.mission.id, order: list.length });
      }
    }
  }
  const shown = open.slice(0, SPRINT_TASKS_SHOWN);
  return { shown: [...shown, ...doneToday], extra: open.length - shown.length, extraMissionId: open[SPRINT_TASKS_SHOWN]?.missionId ?? null };
}

/** Ligne « N autres tâches dans ton sprint » (pas une tâche) : ce qui dépasse les trois affichées, avec la mission de la première tâche cachée. */
export function sprintOverflow(sprints: SprintWork[], asOf: string): { count: number; missionId: string } | null {
  const { extra, extraMissionId } = sprintTasks(sprints, asOf);
  return extra > 0 && extraMissionId ? { count: extra, missionId: extraMissionId } : null;
}

/** Devis lu par les règles 5 et 6 ; `updated_on` = jour de Paris de `updated_at`. Seul « sent » compte. */
export type QuoteInput = { id: string; status: string; client_id: string; client_name: string | null; mission_id: string | null; updated_on: string };
/**
 * Mission lue par les règles 6 et 8. `invoiced` (au moins une facture enregistrée pour la mission) n'est donné que pour la règle 8 : sans lui (`undefined`),
 * on ne sait pas, et aucun rappel de facturation n'est produit. `title` et `client_name` servent au texte de la tâche.
 */
export type MissionPipelineInput = { id: string; status: string; title?: string; client_name?: string | null; invoiced?: boolean };

/**
 * Ordre d'affichage des règles : la règle 8 (facturer) passe juste après la règle 2 (facture échue) : l'argent à encaisser, puis l'argent à facturer
 * (décision d'Alex, 29 octobre 2026) ; les autres gardent leur numéro, les tâches du sprint (9) restent après toutes les règles.
 */
const PRIORITY: Record<TodayTask["rule"], number> = { 1: 1, 2: 2, 8: 2.5, 3: 3, 4: 4, 5: 5, 6: 6, 7: 7, 9: 9 };

const days = (n: number) => `${n} jour${n > 1 ? "s" : ""}`;

/**
 * Règle 1 : échéances saisies dans 0 à 3 jours (une échéance en retard relève du calendrier). Les faites restent, cochées.
 * Règle 2 : factures non soldées dont l'échéance est dépassée d'au moins 1 jour. `checked` : clés de coche du jour (`task_checks`, voir `checkKey`).
 * Règle 5 : devis « envoyé » sans modification depuis plus de 7 jours. Règle 6 : moins de 2 éléments au pipeline (missions à planifier ou en cours, devis envoyés ; un devis lié à une telle mission compte une fois).
 * Règle 7 : sprint en cours qui se termine dans 0 à 2 jours avec des stories non terminées. Règle 8 : mission « terminée » sans aucune facture enregistrée.
 * Après toutes les règles : tâches du sprint (rang 9, trois au plus).
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
  quotes: QuoteInput[],
  missions: MissionPipelineInput[],
  sprints: SprintWork[],
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
      reason: c.state === "exceeded" ? "dépassé (estimation)" : `à ${c.alertThreshold} % (estimation)`,
      date: asOf,
      done: checked.has(checkKey(3, null, c.key, c.alertThreshold)),
      declared: c.declaredNotConfirmed,
      demo: c.demo,
    });
  }
  const acre = acreEnd(rules, profile, asOf);
  if (acre.status === "ok") {
    const n = daysUntil(acre.endsOn, asOf);
    if (n >= 0 && n <= ACRE_WARN_DAYS) {
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
  const sent = quotes.filter((q) => q.status === "sent");
  for (const q of sent) {
    const idle = -daysUntil(q.updated_on, asOf);
    if (idle <= QUOTE_IDLE_DAYS) continue;
    tasks.push({
      rule: 5,
      id: q.id,
      kind: "quote",
      clientId: q.client_id,
      title: `Relancer le devis ${q.client_name ?? "sans client"}`,
      reason: `devis sans réponse depuis ${days(idle)}`,
      date: q.updated_on,
      done: checked.has(checkKey(5, q.id)),
    });
  }
  const live = new Set(missions.filter((m) => m.status === "planned" || m.status === "in_progress").map((m) => m.id));
  const pipeline = live.size + sent.filter((q) => !q.mission_id || !live.has(q.mission_id)).length;
  if (pipeline < PIPELINE_MIN) {
    tasks.push({ rule: 6, id: "pipeline", kind: "pipeline", title: "Pipeline", reason: "ton pipeline se vide", date: asOf, done: checked.has(checkKey(6)) });
  }
  for (const sp of sprints) {
    const left = daysUntil(sp.end_date, asOf);
    const open = sp.stories.filter((st) => st.status !== "done").length;
    if (left < 0 || left > SPRINT_END_DAYS || open === 0) continue;
    tasks.push({
      rule: 7,
      id: sp.id,
      kind: "sprint-end",
      title: `Sprint ${sp.name}`,
      reason: `ton sprint se termine ${left === 0 ? "aujourd'hui" : `dans ${days(left)}`}, ${open} ${open > 1 ? "stories non terminées" : "story non terminée"}`,
      date: sp.end_date,
      done: checked.has(checkKey(7, sp.id)),
      missionId: sp.mission.id,
      context: `${sp.mission.client_name ?? "Sans client"} / ${sp.mission.title} / ${sp.name}`,
    });
  }
  // Ordre : titre de la mission, puis identifiant (le rang dans `order` départage à date égale : toutes ont la date du jour).
  const toInvoice = missions.filter((m) => m.status === "done" && m.invoiced === false).sort((a, b) => (a.title ?? "").localeCompare(b.title ?? "", "fr") || a.id.localeCompare(b.id));
  for (const [i, m] of toInvoice.entries()) {
    tasks.push({
      rule: 8,
      id: m.id,
      kind: "invoice-due",
      title: `Facturer la mission ${m.title ?? "sans titre"}`,
      reason: "mission terminée, aucune facture enregistrée",
      date: asOf,
      done: checked.has(checkKey(8, m.id)),
      missionId: m.id,
      order: i,
      context: `${m.client_name ?? "Sans client"} / ${m.title ?? "sans titre"}`,
    });
  }
  tasks.push(...sprintTasks(sprints, asOf).shown);
  return tasks.sort((a, b) => Number(a.done) - Number(b.done) || PRIORITY[a.rule] - PRIORITY[b.rule] || a.date.localeCompare(b.date) || (a.order ?? 0) - (b.order ?? 0) || a.id.localeCompare(b.id));
}
