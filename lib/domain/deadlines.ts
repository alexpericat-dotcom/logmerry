import { addDays, daysBetween, daysInMonth } from "./dates.ts";
import { isOfficialLink } from "./finance/rules.ts";
import { isDay } from "./missions.ts";
import { PROFILE_FIELDS, fieldState, type ProfileRow } from "./profile.ts";

export const DEADLINE_TITLE_MAX = 200;
export const DEADLINE_SOURCE_MAX = 2000;
export const DEADLINE_NOTE_MAX = 500;

export const DEADLINE_CATEGORIES = ["urssaf", "france_travail", "tax", "vat", "cfe", "supporting_documents", "renewals", "custom"] as const;
export type DeadlineCategory = (typeof DEADLINE_CATEGORIES)[number];
export const DEADLINE_CATEGORY_LABELS: Record<DeadlineCategory, string> = {
  urssaf: "Urssaf",
  france_travail: "France Travail",
  tax: "Fiscale",
  vat: "TVA",
  cfe: "CFE",
  supporting_documents: "Justificatifs",
  renewals: "Renouvellements",
  custom: "Personnalisée",
};

export const DEADLINE_PRIORITIES = ["low", "normal", "high"] as const;
export type DeadlinePriority = (typeof DEADLINE_PRIORITIES)[number];
export const DEADLINE_PRIORITY_LABELS: Record<DeadlinePriority, string> = { low: "Basse", normal: "Normale", high: "Haute" };

export const DEADLINE_RECURRENCES = ["monthly", "quarterly", "yearly"] as const;
export type DeadlineRecurrence = (typeof DEADLINE_RECURRENCES)[number];
export const DEADLINE_RECURRENCE_LABELS: Record<DeadlineRecurrence, string> = { monthly: "Tous les mois", quarterly: "Tous les trimestres", yearly: "Tous les ans" };
const RECURRENCE_MONTHS: Record<DeadlineRecurrence, number> = { monthly: 1, quarterly: 3, yearly: 12 };

export type DeadlineInput = { title: string; due_on: string; category: string; source: string; note: string; priority: string; recurrence: string };
export type DeadlineValues = {
  title: string;
  due_on: string;
  category: DeadlineCategory;
  source: string;
  note: string | null;
  priority: DeadlinePriority;
  recurrence: DeadlineRecurrence | null;
};
export type DeadlineErrors = Partial<Record<keyof DeadlineInput, string>>;

/** La base compte en points de code (`char_length`), pas en unités UTF-16. */
const length = (s: string) => Array.from(s).length;
const stripNul = (s: string) => s.replaceAll("\u0000", ""); // Postgres refuse NUL (22021) : on le retire avant de valider

/**
 * Valide une échéance (décisions 2 et 4 de la spec 5.1a). Titre, date, catégorie et source obligatoires ;
 * la date peut être dans le passé ; la source est un lien `https://` (même motif que la base et que les règles vérifiées).
 * Story 5.1b : priorité (« normale » si vide) et récurrence facultative ; la première date d'une série ne remonte pas à plus d'un an.
 * `today` (jour de Paris) est reçu en argument : la règle ne lit pas l'horloge.
 */
export function validateDeadlineInput(input: DeadlineInput, today: string): { ok: true; value: DeadlineValues } | { ok: false; errors: DeadlineErrors } {
  const errors: DeadlineErrors = {};
  const title = stripNul(input.title).trim();
  const due = input.due_on.trim();
  const category = input.category.trim();
  const source = stripNul(input.source).trim();
  const note = stripNul(input.note).trim();
  const priority = input.priority.trim() || "normal";
  const recurrence = input.recurrence.trim();

  if (!title) errors.title = "Donne un titre à l'échéance.";
  else if (length(title) > DEADLINE_TITLE_MAX) errors.title = `Le titre fait ${DEADLINE_TITLE_MAX} caractères au plus.`;

  if (!due) errors.due_on = "Saisis la date de l'échéance.";
  else if (!isDay(due)) errors.due_on = "Saisis une date valide.";

  if (!(DEADLINE_CATEGORIES as readonly string[]).includes(category)) errors.category = "Choisis une catégorie de la liste.";

  if (!source) errors.source = "Saisis le lien officiel de la source (https://…).";
  else if (!isOfficialLink(source)) errors.source = "La source doit être un lien qui commence par https://, sans espace.";
  else if (length(source) > DEADLINE_SOURCE_MAX) errors.source = `Le lien fait ${DEADLINE_SOURCE_MAX} caractères au plus.`;

  if (!(DEADLINE_PRIORITIES as readonly string[]).includes(priority)) errors.priority = "Choisis une priorité de la liste.";

  if (recurrence && !(DEADLINE_RECURRENCES as readonly string[]).includes(recurrence)) errors.recurrence = "Choisis une récurrence de la liste.";
  else if (recurrence && !errors.due_on && (due < addMonths(today, -12) || due > addMonths(today, 12))) errors.due_on = "Pour une échéance récurrente, la première date est comprise entre un an avant et un an après aujourd'hui.";

  if (length(note) > DEADLINE_NOTE_MAX) errors.note = `La remarque fait ${DEADLINE_NOTE_MAX} caractères au plus.`;

  if (Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, value: {
      title,
      due_on: due,
      category: category as DeadlineCategory,
      source,
      note: note || null,
      priority: priority as DeadlinePriority,
      recurrence: (recurrence || null) as DeadlineRecurrence | null,
    },
  };
}

const plural = (n: number) => `${n} jour${n > 1 ? "s" : ""}`;

/** Jours entre aujourd'hui et la date (positif : à venir, négatif : en retard). */
export const daysUntil = (due_on: string, today: string) => Math.round(daysBetween(today, due_on));

/** « en retard de N jours », « aujourd'hui » ou « dans N jours ». */
export function deadlineWhen(due_on: string, today: string): string {
  const d = daysUntil(due_on, today);
  if (d < 0) return `en retard de ${plural(-d)}`;
  if (d === 0) return "aujourd'hui";
  return `dans ${plural(d)}`;
}

type Row = { id: string; due_on: string; created_at: string; done_at: string | null };

/**
 * Trois sections (décision 4) : En retard (à faire, avant aujourd'hui, la plus ancienne d'abord), À venir (à faire, aujourd'hui ou après,
 * la plus proche d'abord), Faites (les plus récemment faites d'abord, jamais en retard). Départage stable : date, création, identifiant.
 */
export function groupDeadlines<T extends Row>(all: T[], today: string): { overdue: T[]; upcoming: T[]; done: T[] } {
  const byDate = (a: T, b: T) => a.due_on.localeCompare(b.due_on) || a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id);
  const todo = all.filter((d) => d.done_at === null).sort(byDate);
  return {
    overdue: todo.filter((d) => d.due_on < today),
    upcoming: todo.filter((d) => d.due_on >= today),
    done: all.filter((d) => d.done_at !== null).sort((a, b) => Date.parse(b.done_at as string) - Date.parse(a.done_at as string) || a.id.localeCompare(b.id)),
  };
}

// ---- Story 5.1b : récurrence, vues, lignes calculées -------------------------------------------------------------------------

const parts = (day: string) => day.split("-").map(Number) as [number, number, number];
const pad = (n: number) => String(n).padStart(2, "0");

/** Ajoute des mois à une date en visant `targetDay` (ramené au dernier jour des mois courts : 31 janv. + 1 mois = 28 ou 29 févr.). */
export function addMonths(day: string, months: number, targetDay: number = parts(day)[2]): string {
  const [y, m] = parts(day);
  const index = y * 12 + (m - 1) + months;
  const year = Math.floor(index / 12);
  const month = (index % 12) + 1;
  return `${year}-${pad(month)}-${pad(Math.min(targetDay, daysInMonth(year, month)))}`;
}


/** Dernier jour de l'horizon d'une série : douze mois après aujourd'hui. */
export const seriesHorizon = (today: string) => addMonths(today, 12);

/** Dates d'une série de la première occurrence à l'horizon (incluse). Chaque date est calculée depuis la première, jamais depuis la précédente (pas de dérive en fin de mois). */
export function seriesDates(first: string, recurrence: DeadlineRecurrence, seriesDay: number, horizon: string): string[] {
  const dates: string[] = [];
  for (let k = 0; k < 1000; k++) {
    const date = addMonths(first, k * RECURRENCE_MONTHS[recurrence], seriesDay);
    if (date > horizon) break;
    dates.push(date);
  }
  return dates;
}

export type SeriesRow = {
  series_id: string | null;
  recurrence: DeadlineRecurrence | null;
  series_day: number | null;
  due_on: string;
  title: string;
  category: DeadlineCategory;
  source: string;
  note: string | null;
  priority: DeadlinePriority;
};
export type OccurrenceInsert = Omit<SeriesRow, "series_id" | "recurrence" | "series_day"> & { series_id: string; recurrence: DeadlineRecurrence; series_day: number };

/** Occurrences qui manquent jusqu'à l'horizon, pour chaque série vivante (une occurrence copie la dernière de sa série). */
export function missingOccurrences(rows: SeriesRow[], today: string): OccurrenceInsert[] {
  const bySeries = new Map<string, SeriesRow[]>();
  for (const r of rows) if (r.series_id && r.recurrence && r.series_day) bySeries.set(r.series_id, [...(bySeries.get(r.series_id) ?? []), r]);
  const horizon = seriesHorizon(today);
  const out: OccurrenceInsert[] = [];
  for (const [series_id, list] of bySeries) {
    const sorted = [...list].sort((a, b) => a.due_on.localeCompare(b.due_on));
    const last = sorted[sorted.length - 1];
    const have = new Set(list.map((r) => r.due_on));
    for (const due_on of seriesDates(sorted[0].due_on, last.recurrence as DeadlineRecurrence, last.series_day as number, horizon)) {
      if (!have.has(due_on)) {
        out.push({ series_id, recurrence: last.recurrence as DeadlineRecurrence, series_day: last.series_day as number, due_on, title: last.title, category: last.category, source: last.source, note: last.note, priority: last.priority });
      }
    }
  }
  return out;
}

export const DEADLINE_VIEWS = ["toutes", "aujourd-hui", "semaine", "mois", "retard"] as const;
export type DeadlineView = (typeof DEADLINE_VIEWS)[number];
export const DEADLINE_VIEW_LABELS: Record<DeadlineView, string> = { toutes: "Toutes", "aujourd-hui": "Aujourd'hui", semaine: "Cette semaine", mois: "Ce mois-ci", retard: "En retard" };

export const parseDeadlineView = (value: string | string[] | undefined): DeadlineView => {
  const v = Array.isArray(value) ? value[0] : value;
  return DEADLINE_VIEWS.find((x) => x === v) ?? "toutes";
};

/** Une ligne à faire appartient-elle à la vue ? Semaine : jusqu'au dimanche ; mois : jusqu'au dernier jour du mois. Les lignes faites ne sont que dans « Toutes ». */
export function inView(view: DeadlineView, line: { due_on: string; done: boolean }, today: string): boolean {
  if (view === "toutes") return true;
  if (line.done) return false;
  const [y, m] = parts(today);
  const sunday = addDays(today, (7 - new Date(`${today}T00:00:00Z`).getUTCDay()) % 7);
  const endOfMonth = `${y}-${pad(m)}-${pad(daysInMonth(y, m))}`;
  if (view === "retard") return line.due_on < today;
  if (view === "aujourd-hui") return line.due_on === today;
  return line.due_on >= today && line.due_on <= (view === "semaine" ? sunday : endOfMonth);
}

export type CalendarLine = {
  kind: "invoice_issue" | "invoice_chase" | "to_confirm";
  key: string;
  title: string;
  /** Aucune date pour « À confirmer » : jamais estimée. */
  due_on: string | null;
  href: string;
  detail: string;
};

type InvoiceLineInput = { id: string; reference: string | null; issued_on: string | null; due_on: string; status: "unpaid" | "partial" | "paid"; mission: { title: string } | null };

/** Factures à émettre (sans date d'émission) et à relancer (émise, non soldée, échéance dépassée) : calculées, jamais stockées. */
export function invoiceLines(invoices: InvoiceLineInput[], today: string): CalendarLine[] {
  const lines: CalendarLine[] = [];
  for (const i of invoices) {
    if (i.status === "paid") continue;
    const name = i.reference ?? i.mission?.title ?? "sans référence";
    if (i.issued_on === null) lines.push({ kind: "invoice_issue", key: `issue-${i.id}`, title: `Émettre la facture ${name}`, due_on: i.due_on, href: "/factures", detail: deadlineWhen(i.due_on, today) });
    else if (i.due_on < today) lines.push({ kind: "invoice_chase", key: `chase-${i.id}`, title: `Relancer la facture ${name}`, due_on: i.due_on, href: "/factures", detail: deadlineWhen(i.due_on, today) });
  }
  return lines;
}

/** Obligations attendues d'après le profil. Aucune date, aucune règle fiscale : seulement « quelle catégorie surveiller ». */
const EXPECTED: { category: DeadlineCategory; title: string; field: string | null; skipWhen?: string }[] = [
  { category: "urssaf", title: "Déclaration Urssaf", field: "urssaf_frequency" },
  { category: "france_travail", title: "Actualisation France Travail", field: "job_seeker", skipWhen: "not_registered" },
  { category: "vat", title: "Déclaration de TVA", field: "vat_regime", skipWhen: "franchise" },
  { category: "cfe", title: "CFE", field: null },
];

/** Lignes « À confirmer » : une par obligation attendue sans échéance saisie dans sa catégorie. Sans date, avec leur raison. */
export function toConfirmLines(profile: ProfileRow | null, deadlines: { category: string }[]): CalendarLine[] {
  const lines: CalendarLine[] = [];
  for (const e of EXPECTED) {
    if (deadlines.some((d) => d.category === e.category)) continue;
    const value = e.field ? profile?.[e.field] : undefined;
    if (e.skipWhen && value === e.skipWhen) continue;
    const missing = e.field !== null && fieldState(value, profile?.[`${e.field}_confirmed_at`] as string | null | undefined, e.field) === "missing";
    const label = PROFILE_FIELDS.find((f) => f.key === e.field)?.label;
    lines.push({
      kind: "to_confirm",
      key: `confirm-${e.category}`,
      title: e.title,
      due_on: null,
      href: missing ? "/profil" : "/calendrier",
      detail: missing ? `« ${label} » est à confirmer dans ton profil.` : "Aucune règle de calendrier vérifiée : saisis l'échéance avec sa source officielle.",
    });
  }
  return lines;
}
