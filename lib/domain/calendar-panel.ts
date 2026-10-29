import { DISPLAY_LABELS, type Display } from "./deadline-boards.ts";
import { DEADLINE_VIEW_LABELS, groupDeadlines, inView, type CalendarLine, type DeadlineView } from "./deadlines.ts";
import { invoiceBalance, type InvoiceAmounts, type InvoiceStatus, type PaymentAmounts } from "./payments.ts";

type DeadlineRow = { id: string; due_on: string; created_at: string; done_at: string | null };

/** « Rien en retard. » ou « N élément(s) en retard (échéances et factures). » */
export const overdueText = (count: number) => (count === 0 ? "Rien en retard." : `${count} élément${count > 1 ? "s" : ""} en retard (échéances et factures).`);

/** Texte de la section « À venir » vide : aucune échéance ni ligne du tout, ou seulement rien à venir. */
export const upcomingEmptyText = (nothingAtAll: boolean) => (nothingAtAll ? "Aucune échéance pour l'instant." : "Rien à venir.");

/**
 * Composition du panneau du calendrier : la vue filtre les échéances stockées et les lignes datées (`inView`) ; les lignes sans date (« À confirmer ») ne sont
 * que dans « Toutes ». Le compteur « en retard » ignore la vue (toutes les échéances non faites et toutes les lignes datées avant aujourd'hui).
 * `show` : les sections de la Liste affichées selon la vue.
 */
export function calendarSections<D extends DeadlineRow>(deadlines: D[], lines: CalendarLine[], view: DeadlineView, today: string) {
  const visible = deadlines.filter((d) => inView(view, { due_on: d.due_on, done: d.done_at !== null }, today));
  const datedLines = lines.filter((l) => l.due_on !== null && inView(view, { due_on: l.due_on, done: false }, today));
  const undatedLines = view === "toutes" ? lines.filter((l) => l.due_on === null) : [];
  const { overdue, upcoming, done: finished } = groupDeadlines(visible, today);
  const overdueCount = groupDeadlines(deadlines, today).overdue.length + lines.filter((l) => l.due_on !== null && l.due_on < today).length;
  return {
    visible,
    datedLines,
    undatedLines,
    overdue,
    upcoming,
    finished,
    overdueLines: datedLines.filter((l) => (l.due_on as string) < today),
    upcomingLines: datedLines.filter((l) => (l.due_on as string) >= today),
    overdueCount,
    show: { overdue: view === "toutes" || view === "retard", upcoming: view !== "retard", done: view === "toutes" },
    upcomingEmpty: upcomingEmptyText(deadlines.length === 0 && lines.length === 0),
  };
}

type InvoiceForLines = InvoiceAmounts & { id: string; reference: string | null; issued_on: string | null; due_on: string; mission: unknown; payments: PaymentAmounts[] };

/** Factures sous la forme que `invoiceLines` attend, avec leur statut (solde calculé une fois par facture). */
export function calendarInvoiceInputs<I extends InvoiceForLines>(invoices: I[]): { id: string; reference: string | null; issued_on: string | null; due_on: string; status: InvoiceStatus; mission: I["mission"] }[] {
  return invoices.map((i) => ({ id: i.id, reference: i.reference, issued_on: i.issued_on, due_on: i.due_on, status: invoiceBalance(i, i.payments).status, mission: i.mission }));
}

/** Annonce vocale d'un changement d'affichage ou de période du calendrier ; `null` si rien n'a changé (jamais d'annonce au premier rendu). */
export function viewChangeAnnouncement(prev: { view: DeadlineView; display: Display }, next: { view: DeadlineView; display: Display }): string | null {
  if (next.display !== prev.display) return `Affichage : ${DISPLAY_LABELS[next.display]}`;
  if (next.view !== prev.view) return `Période : ${DEADLINE_VIEW_LABELS[next.view]}`;
  return null;
}
