// Doublure de `app/(app)/calendrier/actions` pour les tests de composants : aucune action n'agit, toutes réussissent.
export type DeadlineFormState = { errors?: Record<string, string>; message?: string; saved?: boolean; values?: Record<string, string> };
const ok = async () => ({ saved: true }) as DeadlineFormState;
export const createDeadline = ok;
export const updateDeadline = ok;
export const deleteDeadline = async () => ({}) as { message?: string };
export const markDeadlineDone = async () => ({}) as { message?: string };
export const reopenDeadline = async () => ({}) as { message?: string };
