// Doublure de `app/(app)/realisations/actions` pour les tests de composants : enregistre les appels de publication dans `globalThis.__publicationCalls`
// et répond `globalThis.__stubResult` s'il est posé.
type G = { __publicationCalls?: { id: string; publish: boolean }[]; __stubResult?: object };
export const setRealisationPublication = async (id: string, publish: boolean) => {
  const g = globalThis as G;
  (g.__publicationCalls ??= []).push({ id, publish });
  return g.__stubResult ?? {};
};
export const createRealisation = async () => ({});
export const updateRealisation = async () => ({});
export const deleteRealisation = async () => ({});
export const addRealisationImage = async (...args: unknown[]) => {
  const g = globalThis as { __imageCalls?: unknown[][]; __imageResult?: object | Error };
  (g.__imageCalls ??= []).push(args);
  if (g.__imageResult instanceof Error) throw g.__imageResult;
  return g.__imageResult ?? {};
};
export const deleteRealisationImage = async () => ({});
