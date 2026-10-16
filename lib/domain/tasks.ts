export const TASK_TITLE_MAX = 200;
/** Précision facultative donnée à l'IA pour proposer des tâches (points de code). */
export const HINT_MAX = 1000;
/** Tâches ajoutées en une fois (propositions de l'IA gardées). */
export const TASKS_ADD_MAX = 50;

/** Une tâche n'a qu'un titre (1 à 200 caractères, points de code, caractère nul retiré) et une case « faite ». */
export function validateTaskTitle(raw: unknown): { ok: true; value: string } | { ok: false; error: string } {
  // Une Server Action peut être appelée à la main avec n'importe quoi : un titre qui n'est pas du texte est un titre vide.
  const title = typeof raw === "string" ? raw.replaceAll("\u0000", "").trim() : "";
  if (!title) return { ok: false, error: "Saisis le titre de la tâche." };
  if ([...title].length > TASK_TITLE_MAX) return { ok: false, error: `Le titre doit faire ${TASK_TITLE_MAX} caractères au plus.` };
  return { ok: true, value: title };
}

export type TaskProgress = { done: number; total: number };

export const taskProgress = (tasks: { done: boolean }[]): TaskProgress => ({ done: tasks.filter((t) => t.done).length, total: tasks.length });

/** « 3 sur 4 tâches faites » ; sans tâche, rien (jamais « 0 sur 0 »). */
export function taskProgressLabel({ done, total }: TaskProgress): string {
  if (total === 0) return "";
  return `${done} sur ${total} ${total > 1 ? "tâches faites" : "tâche faite"}`;
}

/** Lot de titres à ajouter d'un coup : un tableau de 1 à 50 titres valides, nettoyés ; sinon la première erreur. */
export function validateTaskBatch(titles: unknown): { ok: true; value: string[] } | { ok: false; error: string } {
  if (!Array.isArray(titles) || titles.length === 0 || titles.length > TASKS_ADD_MAX) return { ok: false, error: "Aucune tâche à ajouter." };
  const value: string[] = [];
  for (const title of titles) {
    const checked = validateTaskTitle(title);
    if (!checked.ok) return checked;
    value.push(checked.value);
  }
  return { ok: true, value };
}

/** Précision pour l'IA : du texte de 1 000 points de code au plus (vide accepté) ; tout autre type est refusé. */
export function validateHint(raw: unknown): { ok: true; value: string } | { ok: false; error: string } {
  if (raw === undefined || raw === null) return { ok: true, value: "" };
  if (typeof raw !== "string") return { ok: false, error: "La précision doit être du texte." };
  // Pré-filtre sur la longueur en unités UTF-16 avant de compter les points de code d'une chaîne énorme.
  if (raw.length > HINT_MAX * 2 || [...raw].length > HINT_MAX) return { ok: false, error: `La précision est trop longue (${HINT_MAX.toLocaleString("fr-FR")} caractères au plus).` };
  return { ok: true, value: raw };
}
