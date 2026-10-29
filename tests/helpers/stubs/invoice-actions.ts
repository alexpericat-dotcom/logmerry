// Doublure de `app/(app)/factures/actions` pour les tests de composants : toutes les actions réussissent.
// Un test peut imposer la réponse (ex. un refus) avec `globalThis.__stubResult`.
export const createInvoice = async () => (globalThis as { __stubResult?: object }).__stubResult ?? { saved: true };
export const updateInvoice = async () => ({ saved: true });
export const deleteInvoice = async () => ({}) as { message?: string };
