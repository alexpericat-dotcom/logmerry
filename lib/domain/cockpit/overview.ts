import { daysUntil } from "../deadlines.ts";

/** Fenêtre du chiffre « échéances » : aujourd'hui et les 6 jours suivants (7 jours au total). */
export const WEEK_DAYS = 7;

/** Chiffres-clés du tableau de bord du cockpit : de simples décomptes de ce que le propriétaire a déjà saisi. */
export type Kpis = {
  clients: number;
  prospects: number;
  missionsInProgress: number;
  missionsPlanned: number;
  quotesSent: number;
  invoicesToCollect: number;
  invoicesOverdue: number;
  deadlinesThisWeek: number;
};

/** Échéance à venir : non faite, du jour `asOf` (inclus) en avant ; `days` = jours restants. Tri date puis identifiant. */
export function upcomingDeadlines<T extends { id: string; due_on: string; done_at: string | null }>(deadlines: T[], asOf: string, limit: number): (T & { days: number })[] {
  return deadlines
    .filter((d) => d.done_at === null && d.due_on >= asOf)
    .sort((a, b) => a.due_on.localeCompare(b.due_on) || a.id.localeCompare(b.id))
    .slice(0, limit)
    .map((d) => ({ ...d, days: daysUntil(d.due_on, asOf) }));
}

export function cockpitKpis(
  input: {
    clients: { status: string }[];
    missions: { status: string }[];
    quotes: { status: string }[];
    /** `overdue` : échue d'au moins un jour (même règle que la tâche de règle 2). */
    invoices: { status: "unpaid" | "partial" | "paid"; overdue: boolean }[];
    deadlines: { due_on: string; done_at: string | null }[];
  },
  asOf: string,
): Kpis {
  const open = input.invoices.filter((i) => i.status !== "paid");
  return {
    clients: input.clients.filter((c) => c.status === "client").length,
    prospects: input.clients.filter((c) => c.status === "prospect").length,
    missionsInProgress: input.missions.filter((m) => m.status === "in_progress").length,
    missionsPlanned: input.missions.filter((m) => m.status === "planned").length,
    quotesSent: input.quotes.filter((q) => q.status === "sent").length,
    invoicesToCollect: open.length,
    invoicesOverdue: open.filter((i) => i.overdue).length,
    deadlinesThisWeek: input.deadlines.filter((d) => d.done_at === null && d.due_on >= asOf && daysUntil(d.due_on, asOf) < WEEK_DAYS).length,
  };
}

/** Grille du mois de `asOf`, semaine du lundi au dimanche : `null` pour les cases hors du mois. */
export function monthGrid(asOf: string): { label: string; year: number; month: number; weeks: (number | null)[][] } {
  const [y, m] = asOf.split("-").map(Number);
  const first = new Date(Date.UTC(y, m - 1, 1));
  const lead = (first.getUTCDay() + 6) % 7; // lundi = 0
  const count = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const cells: (number | null)[] = [...Array<null>(lead).fill(null), ...Array.from({ length: count }, (_, i) => i + 1)];
  while (cells.length % 7) cells.push(null);
  const weeks = Array.from({ length: cells.length / 7 }, (_, i) => cells.slice(i * 7, i * 7 + 7));
  const label = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric", timeZone: "UTC" }).format(first);
  return { label, year: y, month: m, weeks };
}

/** Échéances ouvertes du mois de `asOf`, comptées par jour du mois (pour les points du calendrier). Une échéance faite, ou d'un autre mois, n'est pas comptée. */
export function deadlineDaysOfMonth(deadlines: { due_on: string; done_at: string | null }[], asOf: string): Map<number, number> {
  const days = new Map<number, number>();
  for (const d of deadlines) {
    if (d.done_at !== null || d.due_on.slice(0, 7) !== asOf.slice(0, 7)) continue;
    const day = Number(d.due_on.slice(8, 10));
    days.set(day, (days.get(day) ?? 0) + 1);
  }
  return days;
}
