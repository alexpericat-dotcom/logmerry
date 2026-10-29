// Doublure de `app/(app)/clients/quote-actions` pour les tests de composants : toutes les actions réussissent.
// Un test peut imposer la réponse (ex. un refus) avec `globalThis.__stubResult`.
export const createQuote = async () => (globalThis as { __stubResult?: object }).__stubResult ?? { saved: true };
export const updateQuote = async () => ({ saved: true });
export const sendQuote = async () => ({});
export const refuseQuote = async () => ({});
export const acceptQuote = async () => ({});
export const deleteQuote = async () => ({});
