import { daysUntil } from "../deadlines.ts";
import { daysLate, isOverdue } from "../invoices.ts";

/** Tâche du jour du cockpit, calculée à la lecture (AD-5) : jamais stockée, tri unique règle → date → identifiant. */
export type TodayTask = {
  rule: 1 | 2;
  /** Identifiant de la source (échéance ou facture) : une source, une tâche. */
  id: string;
  kind: "deadline" | "invoice";
  title: string;
  reason: string;
  date: string;
  done: boolean;
};

type DeadlineInput = { id: string; title: string; due_on: string; done_at: string | null };
type InvoiceInput = { id: string; reference: string | null; due_on: string; status: "unpaid" | "partial" | "paid"; mission: { title: string } | null };

const days = (n: number) => `${n} jour${n > 1 ? "s" : ""}`;

/**
 * Règle 1 : échéances saisies dans 0 à 3 jours (une échéance en retard relève du calendrier). Les faites restent, cochées.
 * Règle 2 : factures non soldées dont l'échéance est dépassée d'au moins 1 jour. `checkedInvoiceIds` : coches du jour (`task_checks`).
 * Les tâches cochées descendent en bas ; l'ordre reste règle, date la plus proche, identifiant.
 */
export function todayTasks(deadlines: DeadlineInput[], invoices: InvoiceInput[], checkedInvoiceIds: Set<string>, asOf: string): TodayTask[] {
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
      done: checkedInvoiceIds.has(i.id),
    });
  }
  return tasks.sort((a, b) => Number(a.done) - Number(b.done) || a.rule - b.rule || a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
}
