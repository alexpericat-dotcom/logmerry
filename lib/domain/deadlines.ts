import { isOfficialLink } from "./finance/rules.ts";
import { isDay } from "./missions.ts";

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

export type DeadlineInput = { title: string; due_on: string; category: string; source: string; note: string };
export type DeadlineValues = { title: string; due_on: string; category: DeadlineCategory; source: string; note: string | null };
export type DeadlineErrors = Partial<Record<keyof DeadlineInput, string>>;

/** La base compte en points de code (`char_length`), pas en unités UTF-16. */
const length = (s: string) => Array.from(s).length;
const stripNul = (s: string) => s.replaceAll("\u0000", ""); // Postgres refuse NUL (22021) : on le retire avant de valider

/**
 * Valide une échéance (décisions 2 et 4 de la spec 5.1a). Titre, date, catégorie et source obligatoires ;
 * la date peut être dans le passé ; la source est un lien `https://` (même motif que la base et que les règles vérifiées).
 */
export function validateDeadlineInput(input: DeadlineInput): { ok: true; value: DeadlineValues } | { ok: false; errors: DeadlineErrors } {
  const errors: DeadlineErrors = {};
  const title = stripNul(input.title).trim();
  const due = input.due_on.trim();
  const category = input.category.trim();
  const source = stripNul(input.source).trim();
  const note = stripNul(input.note).trim();

  if (!title) errors.title = "Donne un titre à l'échéance.";
  else if (length(title) > DEADLINE_TITLE_MAX) errors.title = `Le titre fait ${DEADLINE_TITLE_MAX} caractères au plus.`;

  if (!due) errors.due_on = "Saisis la date de l'échéance.";
  else if (!isDay(due)) errors.due_on = "Saisis une date valide.";

  if (!(DEADLINE_CATEGORIES as readonly string[]).includes(category)) errors.category = "Choisis une catégorie de la liste.";

  if (!source) errors.source = "Saisis le lien officiel de la source (https://…).";
  else if (!isOfficialLink(source)) errors.source = "La source doit être un lien qui commence par https://, sans espace.";
  else if (length(source) > DEADLINE_SOURCE_MAX) errors.source = `Le lien fait ${DEADLINE_SOURCE_MAX} caractères au plus.`;

  if (length(note) > DEADLINE_NOTE_MAX) errors.note = `La remarque fait ${DEADLINE_NOTE_MAX} caractères au plus.`;

  if (Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, value: { title, due_on: due, category: category as DeadlineCategory, source, note: note || null } };
}

const dayNumber = (day: string) => Date.parse(`${day}T00:00:00Z`) / 86_400_000;
const plural = (n: number) => `${n} jour${n > 1 ? "s" : ""}`;

/** Jours entre aujourd'hui et la date (positif : à venir, négatif : en retard). */
export const daysUntil = (due_on: string, today: string) => Math.round(dayNumber(due_on) - dayNumber(today));

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
