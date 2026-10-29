import { todayParis } from "../../format.ts";
import { isOverdue } from "../invoices.ts";
import { invoiceBalance, type InvoiceAmounts, type InvoiceStatus, type PaymentAmounts } from "../payments.ts";
import type { CeilingResult } from "../finance/ceilings.ts";
import type { MissionPipelineInput, SprintWork } from "./today.ts";

/** Facture lue avec ses encaissements : de quoi calculer son statut. */
type InvoiceWithPayments = InvoiceAmounts & { id: string; reference: string | null; due_on: string; mission: unknown; payments: PaymentAmounts[] };

/**
 * Les factures sous les deux formes que la page cockpit donne à `todayTasks` (`forTasks`) et à `cockpitKpis` (`rows`, avec « échue »).
 * Le solde de chaque facture n'est calculé qu'une fois.
 */
export function invoiceViews<I extends InvoiceWithPayments>(invoices: I[], today: string) {
  const forTasks: { id: string; reference: string | null; due_on: string; status: InvoiceStatus; mission: I["mission"] }[] = [];
  const rows: { status: InvoiceStatus; overdue: boolean }[] = [];
  for (const i of invoices) {
    const { status } = invoiceBalance(i, i.payments);
    forTasks.push({ id: i.id, reference: i.reference, due_on: i.due_on, status, mission: i.mission });
    rows.push({ status, overdue: isOverdue(i.due_on, today, status) });
  }
  return { forTasks, rows };
}

type SprintTaskRow = Omit<SprintWork["stories"][number]["tasks"][number], "done_on"> & { done_at: string | null };
type SprintRow = Omit<SprintWork, "stories"> & { stories: (Omit<SprintWork["stories"][number], "tasks"> & { tasks: SprintTaskRow[] })[] };

/** Sprints actifs avec, pour chaque tâche, le jour de Paris où elle a été faite (`done_on`, d'après `done_at` : vide si elle n'est pas faite). */
export function sprintsWithParisDay(rows: SprintRow[]): SprintWork[] {
  return rows.map((sp) => ({
    ...sp,
    stories: sp.stories.map((st) => ({ ...st, tasks: st.tasks.map((t) => ({ ...t, done_on: t.done_at ? todayParis(new Date(t.done_at)) : "" })) })),
  }));
}

/** Devis avec le jour de Paris de leur dernière modification (`updated_on`). */
export function quotesWithParisDay<Q extends { updated_at: string }>(quotes: Q[]): (Q & { updated_on: string })[] {
  return quotes.map((q) => ({ ...q, updated_on: todayParis(new Date(q.updated_at)) }));
}

/** Tâches du jour faites, et pourcentage arrondi (0 sans tâche). */
export function taskProgress(tasks: { done: boolean }[]): { done: number; percent: number } {
  const done = tasks.filter((t) => t.done).length;
  return { done, percent: tasks.length ? Math.round((done * 100) / tasks.length) : 0 };
}

const plural = (n: number, one: string, many: string) => `${n} ${n > 1 ? many : one}`;

/** Phrase du bandeau : « 2 tâches à faire aujourd'hui, 1 déjà faite. » */
export function bannerDescription(total: number, done: number): string {
  return total ? `${plural(total - done, "tâche à faire", "tâches à faire")} aujourd'hui, ${done} déjà faite${done > 1 ? "s" : ""}.` : "Rien à faire pour aujourd'hui.";
}

/** Plafond calculé (hors « paramètre manquant ») le plus avancé ; à égalité, le premier de la liste. */
export function topCeiling(ceilings: CeilingResult[]) {
  return ceilings.flatMap((c) => (c.status === "ok" ? [c] : [])).sort((a, b) => b.percent - a.percent)[0];
}

/**
 * Les missions sous la forme que lit `todayTasks` : avec leur titre, le nom de leur client et `invoiced` (au moins une facture enregistrée pour la mission,
 * quel que soit son statut), de quoi produire le rappel « Facturer » de la règle 8.
 */
export function missionsForCockpit(missions: { id: string; status: string; title: string; client: { name: string } | null }[], invoices: { mission_id: string }[]): MissionPipelineInput[] {
  const invoiced = new Set(invoices.map((i) => i.mission_id));
  return missions.map((m) => ({ id: m.id, status: m.status, title: m.title, client_name: m.client?.name ?? null, invoiced: invoiced.has(m.id) }));
}
