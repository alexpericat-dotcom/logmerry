import { isUuid } from "./notes.ts";

export const STORY_TITLE_MAX = 200;
export const STORY_ROLE_MAX = 200;
export const STORY_BENEFIT_MAX = 300;
export const STORY_CRITERIA_MAX = 4000;

export const STORY_STATUSES = ["todo", "in_progress", "done"] as const;
export type StoryStatus = (typeof STORY_STATUSES)[number];
export const STORY_STATUS_LABELS: Record<StoryStatus, string> = { todo: "À faire", in_progress: "En cours", done: "Terminée" };

/** Suite de Fibonacci des points d'effort (jamais des heures). */
export const STORY_POINTS = [1, 2, 3, 5, 8, 13] as const;

export const parseStoryStatus = (value: unknown): StoryStatus | null => STORY_STATUSES.find((s) => s === value) ?? null;

export type StoryInput = { title: string; role: string; benefit: string; acceptance_criteria: string; points: string; status: string };
export type StoryValues = { title: string; role: string | null; benefit: string | null; acceptance_criteria: string | null; points: number | null; status: StoryStatus };
export type StoryErrors = { title?: string; role?: string; benefit?: string; acceptance_criteria?: string; points?: string; status?: string };

const stripNul = (s: string) => s.replaceAll("\u0000", "");
// Même décompte que char_length côté base (points de code, pas unités UTF-16).
const length = (s: string) => [...s].length;

/** Valide une user story ; un champ facultatif vide devient `null` ; les points viennent de la suite de Fibonacci. */
export function validateStoryInput(input: StoryInput): { ok: true; value: StoryValues } | { ok: false; errors: StoryErrors } {
  const title = stripNul(input.title).trim();
  const role = stripNul(input.role).trim();
  const benefit = stripNul(input.benefit).trim();
  const criteria = stripNul(input.acceptance_criteria).trim();
  const status = parseStoryStatus(input.status);
  const pointsText = input.points.trim();
  const points = pointsText === "" ? null : Number(pointsText);
  const errors: StoryErrors = {};
  if (!title) errors.title = "Saisis le titre de la user story (ce que tu veux faire).";
  else if (length(title) > STORY_TITLE_MAX) errors.title = `Le titre doit faire ${STORY_TITLE_MAX} caractères au plus.`;
  if (length(role) > STORY_ROLE_MAX) errors.role = `Le rôle doit faire ${STORY_ROLE_MAX} caractères au plus.`;
  if (length(benefit) > STORY_BENEFIT_MAX) errors.benefit = `Le bénéfice doit faire ${STORY_BENEFIT_MAX} caractères au plus.`;
  if (length(criteria) > STORY_CRITERIA_MAX) errors.acceptance_criteria = `Les critères doivent faire ${STORY_CRITERIA_MAX.toLocaleString("fr-FR")} caractères au plus.`;
  if (points !== null && !STORY_POINTS.some((p) => p === points)) errors.points = `Choisis des points parmi ${STORY_POINTS.join(", ")}.`;
  if (!status) errors.status = "Choisis un statut.";
  if (Object.keys(errors).length || !status) return { ok: false, errors };
  return { ok: true, value: { title, role: role || null, benefit: benefit || null, acceptance_criteria: criteria || null, points, status } };
}

/** « En tant que {rôle}, je veux {titre}, afin de {bénéfice} » ; les parties absentes sont omises, le titre seul en dernier recours. */
export function storySentence(s: { title: string; role: string | null; benefit: string | null }): string {
  const parts = [s.role ? `En tant que ${s.role}` : null, `${s.role ? "je" : "Je"} veux ${s.title}`, s.benefit ? `afin de ${s.benefit}` : null];
  return parts.filter(Boolean).join(", ");
}

export type StoryRow = { id: string; status: StoryStatus };

/** Progression d'un backlog : stories terminées sur stories totales. */
export function storyProgress(stories: StoryRow[]): { done: number; total: number } {
  return { done: stories.filter((s) => s.status === "done").length, total: stories.length };
}

/** « 2 sur 5 stories terminées » ; sans story, « Aucune user story » (jamais « 0 sur 0 »). */
export function progressLabel({ done, total }: { done: number; total: number }): string {
  if (total === 0) return "Aucune user story";
  return `${done} sur ${total} ${total > 1 ? "stories terminées" : "story terminée"}`;
}

/** Position de la prochaine story : la dernière place du backlog. */
export const nextPosition = (positions: number[]): number => (positions.length ? Math.max(...positions) + 1 : 0);

/**
 * Nouvel ordre après avoir monté (`up`) ou descendu (`down`) la story `id` d'une place ; `null` si elle est déjà en haut ou en bas, ou inconnue.
 * Les identifiants sont renvoyés dans l'ordre de priorité : la position de chacun est son rang (0, 1, 2…), ce qui répare aussi d'éventuels doublons.
 */
export function reorder(ids: string[], id: string, direction: "up" | "down"): string[] | null {
  const i = ids.indexOf(id);
  const j = direction === "up" ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= ids.length) return null;
  const next = [...ids];
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}

export { isUuid };
