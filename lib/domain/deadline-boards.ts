import { dayFromNumber, dayNumber } from "./dates.ts";
import { DEADLINE_CATEGORY_LABELS, daysUntil, inView, type CalendarLine, type DeadlineCategory } from "./deadlines.ts";

/** Affichages du calendrier (`?affichage=`) : la liste reste celui par défaut. */
export const DISPLAYS = ["liste", "kanban", "gantt"] as const;
export type Display = (typeof DISPLAYS)[number];
export const DISPLAY_LABELS: Record<Display, string> = { liste: "Liste", kanban: "Kanban", gantt: "Gantt" };

export const parseDisplay = (value: string | string[] | undefined): Display => {
  const v = Array.isArray(value) ? value[0] : value;
  return DISPLAYS.find((x) => x === v) ?? "liste";
};

/** Urgence d'une échéance : en retard, urgent (aujourd'hui à 3 jours), cette semaine (4 à 7 jours), plus tard ; faite à part. */
export type Urgency = "overdue" | "urgent" | "week" | "later" | "done";
export const URGENT_DAYS = 3;
export const WEEK_DAYS = 7;

export function urgency(due_on: string, done: boolean, today: string): Urgency {
  if (done) return "done";
  const days = daysUntil(due_on, today);
  if (days < 0) return "overdue";
  if (days <= URGENT_DAYS) return "urgent";
  return days <= WEEK_DAYS ? "week" : "later";
}

export const URGENCY_LABELS: Record<Urgency, string> = { overdue: "En retard", urgent: "Urgent", week: "Sous 7 jours", later: "Plus tard", done: "Faite" }; // « Sous 7 jours » (glissant) ne se confond pas avec la colonne « Cette semaine » (jusqu'au dimanche)

/** Classes (jetons seulement) : pastille pleine, bordure et losange. Le texte de `URGENCY_LABELS` accompagne toujours la couleur. */
export const URGENCY_STYLES: Record<Urgency, { pill: string; border: string; top: string; fill: string }> = {
  overdue: { pill: "bg-destructive text-destructive-foreground", border: "border-l-destructive", top: "border-t-destructive", fill: "bg-destructive" },
  urgent: { pill: "bg-tone-orange text-action-foreground", border: "border-l-tone-orange", top: "border-t-tone-orange", fill: "bg-tone-orange" },
  week: { pill: "bg-tone-yellow text-action-foreground", border: "border-l-tone-yellow", top: "border-t-tone-yellow", fill: "bg-tone-yellow" },
  later: { pill: "bg-tone-teal text-action-foreground", border: "border-l-tone-teal", top: "border-t-tone-teal", fill: "bg-tone-teal" },
  done: { pill: "bg-muted text-muted-foreground", border: "border-l-muted-foreground/40", top: "border-t-muted-foreground/40", fill: "bg-muted-foreground/50" },
};

/** Colonnes du kanban : le temps qui reste (une échéance faite va en « Faites », quelle que soit sa date). */
export const KANBAN_COLUMNS = ["overdue", "week", "month", "later", "done"] as const;
export type KanbanColumn = (typeof KANBAN_COLUMNS)[number];
export const KANBAN_LABELS: Record<KanbanColumn, string> = { overdue: "En retard", week: "Cette semaine", month: "Ce mois-ci", later: "Plus tard", done: "Faites" };

export function kanbanColumn(item: { due_on: string; done: boolean }, today: string): KanbanColumn {
  if (item.done) return "done";
  if (item.due_on < today) return "overdue";
  if (inView("semaine", item, today)) return "week";
  return inView("mois", item, today) ? "month" : "later";
}

export function kanbanColumns<T extends { due_on: string; done: boolean }>(items: T[], today: string): Record<KanbanColumn, T[]> {
  const out: Record<KanbanColumn, T[]> = { overdue: [], week: [], month: [], later: [], done: [] };
  for (const i of items) out[kanbanColumn(i, today)].push(i);
  for (const c of KANBAN_COLUMNS) out[c].sort((a, b) => a.due_on.localeCompare(b.due_on));
  return out;
}

const GANTT_MIN_DAYS = 30;
const GANTT_PAD_DAYS = 7;

export type GanttScale = { start: string; end: string; days: number; position: (day: string) => number };

/** Axe du temps du Gantt : du jour le plus ancien (au plus tôt, aujourd'hui) au plus lointain, avec une marge, au moins 30 jours (jamais de division par zéro). `position` donne le pourcentage de 0 à 100. */
export function ganttScale(dates: string[], today: string): GanttScale {
  const all = [...dates, today].sort();
  const first = dayNumber(all[0]) - GANTT_PAD_DAYS;
  const last = Math.max(dayNumber(all[all.length - 1]) + GANTT_PAD_DAYS, first + GANTT_MIN_DAYS);
  const days = last - first;
  return { start: dayFromNumber(first), end: dayFromNumber(last), days, position: (day) => Math.min(100, Math.max(0, ((dayNumber(day) - first) / days) * 100)) };
}

/** Une échéance faite figure au Gantt tant que sa date limite n'est pas plus ancienne que ce nombre de jours (l'axe reste lisible ; le reste est en Liste et en Kanban). */
export const GANTT_DONE_DAYS = 30;

/** Jalon du Gantt : `kind` « deadline » ouvre la fiche de l'échéance, « invoice » est un lien (`href`) vers les factures. */
export type GanttMark = { key: string; title: string; due_on: string; level: Urgency; row: string; kind: "deadline" | "invoice"; href?: string };

/**
 * Jalons du Gantt : les échéances à faire (toute date), les échéances faites des `GANTT_DONE_DAYS` derniers jours ou à venir (niveau « faite »),
 * et les lignes datées de factures. Le filtre de période (`inView`) a déjà été appliqué par l'appelant.
 */
export function ganttMarks(deadlines: { id: string; title: string; due_on: string; category: DeadlineCategory; done_at: string | null }[], lines: CalendarLine[], today: string): GanttMark[] {
  const marks: GanttMark[] = [];
  for (const d of deadlines) {
    const done = d.done_at !== null;
    if (done && daysUntil(d.due_on, today) < -GANTT_DONE_DAYS) continue;
    marks.push({ key: d.id, title: d.title, due_on: d.due_on, level: urgency(d.due_on, done, today), row: DEADLINE_CATEGORY_LABELS[d.category], kind: "deadline" });
  }
  for (const l of lines) if (l.due_on) marks.push({ key: l.key, title: l.title, due_on: l.due_on, level: urgency(l.due_on, false, today), row: "Factures", kind: "invoice", href: l.href });
  return marks;
}

/** Niveaux d'affichage de jalons sur une même ligne : un jalon va sur le premier niveau libre (sa place en pixels, plus la largeur de son intitulé, est la fin du niveau). */
export function assignLanes(lefts: number[], labelPx: number): { lanes: number[]; count: number } {
  const ends: number[] = [];
  const lanes = lefts.map((left) => {
    let lane = ends.findIndex((end) => end <= left);
    if (lane === -1) lane = ends.length;
    ends[lane] = left + labelPx;
    return lane;
  });
  return { lanes, count: Math.max(1, ends.length) };
}

/** Adresse du calendrier : la période (`vue`) et l'affichage (`affichage`) se gardent l'une l'autre ; les valeurs par défaut n'y figurent pas. */
export function calendarHref(view: string, display: Display): string {
  const q = new URLSearchParams();
  if (view !== "toutes") q.set("vue", view);
  if (display !== "liste") q.set("affichage", display);
  const qs = q.toString();
  return qs ? `/calendrier?${qs}` : "/calendrier";
}

/** Premiers jours de mois dans l'axe (graduations du Gantt). */
export function monthTicks(scale: GanttScale): { day: string; label: string }[] {
  const out: { day: string; label: string }[] = [];
  const [y, m] = scale.start.split("-").map(Number);
  for (let i = 1; i <= 40; i++) {
    const d = new Date(Date.UTC(y, m - 1 + i, 1));
    const day = d.toISOString().slice(0, 10);
    if (day > scale.end) break;
    out.push({ day, label: d.toLocaleDateString("fr-FR", { month: "short", year: "2-digit", timeZone: "UTC" }) });
  }
  return out;
}
