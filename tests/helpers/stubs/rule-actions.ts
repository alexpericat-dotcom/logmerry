// Doublure de `app/(app)/regles/actions` pour les tests de composants : toutes les actions réussissent.
// Un test peut imposer la réponse (ex. un refus) avec `globalThis.__stubResult`.
export const createRule = async () => (globalThis as { __stubResult?: object }).__stubResult ?? { saved: true };
export const updateRule = async () => ({});
