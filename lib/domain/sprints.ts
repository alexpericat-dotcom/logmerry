import { daysBetween } from "./dates.ts";
import { isDay } from "./missions.ts";

export const SPRINT_NAME_MAX = 120;
export const SPRINT_GOAL_MAX = 300;

export const SPRINT_STATUSES = ["planned", "active", "closed"] as const;
export type SprintStatus = (typeof SPRINT_STATUSES)[number];
export const SPRINT_STATUS_LABELS: Record<SprintStatus, string> = { planned: "Planifié", active: "En cours", closed: "Clos" };
export const parseSprintStatus = (value: unknown): SprintStatus | null => SPRINT_STATUSES.find((s) => s === value) ?? null;

export type SprintInput = { name: string; goal: string; start_date: string; end_date: string };
export type SprintValues = { name: string; goal: string | null; start_date: string; end_date: string };
export type SprintErrors = { name?: string; goal?: string; start_date?: string; end_date?: string };

const stripNul = (s: string) => s.replaceAll("\u0000", "");
const length = (s: string) => [...s].length;

/** Valide un sprint : nom obligatoire, objectif facultatif (vide = absent), deux dates obligatoires qui existent au calendrier, la fin jamais avant le début. */
export function validateSprintInput(input: SprintInput): { ok: true; value: SprintValues } | { ok: false; errors: SprintErrors } {
  const name = stripNul(String(input.name ?? "")).trim();
  const goal = stripNul(String(input.goal ?? "")).trim();
  const start = String(input.start_date ?? "").trim();
  const end = String(input.end_date ?? "").trim();
  const errors: SprintErrors = {};
  if (!name) errors.name = "Saisis le nom du sprint.";
  else if (length(name) > SPRINT_NAME_MAX) errors.name = `Le nom doit faire ${SPRINT_NAME_MAX} caractères au plus.`;
  if (length(goal) > SPRINT_GOAL_MAX) errors.goal = `L'objectif doit faire ${SPRINT_GOAL_MAX} caractères au plus.`;
  if (!start) errors.start_date = "Saisis la date de début.";
  else if (!isDay(start)) errors.start_date = "Saisis une date de début valide.";
  if (!end) errors.end_date = "Saisis la date de fin.";
  else if (!isDay(end)) errors.end_date = "Saisis une date de fin valide.";
  if (!errors.start_date && !errors.end_date && end < start) errors.end_date = "La date de fin ne peut pas précéder la date de début.";
  if (Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, value: { name, goal: goal || null, start_date: start, end_date: end } };
}

export type SprintStory = { status: string; points: number | null };
export type SprintProgress = { done: number; total: number; pointsDone: number; pointsTotal: number };

/** Avancement d'un sprint : stories terminées sur stories, points des terminées sur points ; une story sans points compte 0. */
export function sprintProgress(stories: SprintStory[]): SprintProgress {
  let pointsDone = 0;
  let pointsTotal = 0;
  let done = 0;
  for (const s of stories) {
    pointsTotal += s.points ?? 0;
    if (s.status === "done") {
      done++;
      pointsDone += s.points ?? 0;
    }
  }
  return { done, total: stories.length, pointsDone, pointsTotal };
}

/** « 2 sur 5 stories terminées · 8 sur 21 points » ; sprint vide : « Aucune story dans ce sprint » (jamais « 0 sur 0 »). Sans aucun point, la partie points est omise. */
export function sprintProgressLabel(p: SprintProgress): string {
  if (p.total === 0) return "Aucune story dans ce sprint";
  const stories = `${p.done} sur ${p.total} ${p.total > 1 ? "stories terminées" : "story terminée"}`;
  return p.pointsTotal > 0 ? `${stories} · ${p.pointsDone} sur ${p.pointsTotal} points` : stories;
}

/** La date du jour à Paris (`YYYY-MM-DD`), sans heure : « aujourd'hui » se calcule ici, jamais dans le navigateur ni en UTC. */
export function parisToday(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

/** Jours entre deux dates `YYYY-MM-DD` (positif si `to` est après `from`). */
export { daysBetween };

const plural = (n: number, one: string, many: string) => `${n} ${n > 1 ? many : one}`;

/** Où en est un sprint par rapport à aujourd'hui, en une phrase (jours calendaires, à l'heure de Paris). */
export function sprintTimeLabel(sprint: { status: SprintStatus; start_date: string; end_date: string }, today: string): string {
  if (sprint.status === "closed") return "Sprint clos";
  if (sprint.status === "planned") {
    const until = daysBetween(today, sprint.start_date);
    if (until > 1) return `Commence dans ${until} jours`;
    if (until === 1) return "Commence demain";
    return "À démarrer";
  }
  const left = daysBetween(today, sprint.end_date);
  if (left > 1) return `Se termine dans ${left} jours`;
  if (left === 1) return "Se termine demain";
  if (left === 0) return "Se termine aujourd'hui";
  return `Terminé depuis ${plural(-left, "jour", "jours")} : à clore`;
}

/** Une story ne se place que dans un sprint planifié ou en cours, jamais dans un sprint clos. */
const AUTO_NAME = /^Sprint\s+(\d+)$/i;
const autoNumbers = (names: string[]): number[] => names.map((n) => AUTO_NAME.exec(n.trim())?.[1]).filter((n): n is string => !!n).map(Number);

/**
 * Prochain nom automatique d'un sprint d'une mission : « Sprint N », N étant le plus grand numéro des noms « Sprint N » existants plus 1 ; sans aucun nom de cette forme,
 * le nombre de sprints plus 1 (des sprints renommés à la main comptent quand même). Supprimer « Sprint 2 » ne fait pas réutiliser son numéro : jamais de doublon.
 */
export function nextSprintName(existingNames: string[]): string {
  const numbers = autoNumbers(existingNames);
  return `Sprint ${numbers.length ? Math.max(...numbers) + 1 : existingNames.length + 1}`;
}

/**
 * Nom à enregistrer à la création : vide = prochain nom automatique ; un nom de la forme « Sprint N » dont le numéro existe déjà dans la mission (deux onglets ont proposé
 * le même) passe au prochain numéro libre ; tout autre nom est gardé tel quel.
 */
export function sprintNameForCreate(typed: string, existingNames: string[]): string {
  const name = typed.replaceAll("\u0000", "").trim();
  if (!name) return nextSprintName(existingNames);
  const m = AUTO_NAME.exec(name);
  return m && autoNumbers(existingNames).includes(Number(m[1])) ? nextSprintName(existingNames) : name;
}

export const acceptsStories = (status: SprintStatus): boolean => status !== "closed";
