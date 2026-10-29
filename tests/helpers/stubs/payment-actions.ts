// Doublure de `app/(app)/factures/payment-actions` pour les tests de composants : toutes les actions réussissent.
export const createPayment = async () => ({ saved: true });
export const updatePayment = async () => ({ saved: true });
export const deletePayment = async () => ({}) as { message?: string };
