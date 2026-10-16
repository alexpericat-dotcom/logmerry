export const TASK_TITLE_MAX = 200;

/** Une tâche n'a qu'un titre (1 à 200 caractères, points de code, caractère nul retiré) et une case « faite ». */
export function validateTaskTitle(raw: string): { ok: true; value: string } | { ok: false; error: string } {
  const title = raw.replaceAll("\u0000", "").trim();
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
