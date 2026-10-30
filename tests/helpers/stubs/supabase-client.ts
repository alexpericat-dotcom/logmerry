// Doublure de `lib/supabase/client` pour les tests de composants : le stockage enregistre ses appels dans `globalThis.__storage`.
type Storage = { uploads: { path: string; type: string }[]; removed: string[][]; uploadError: boolean };
const store = () => ((globalThis as { __storage?: Storage }).__storage ??= { uploads: [], removed: [], uploadError: false });
export function createClient() {
  return {
    storage: {
      from: () => ({
        upload: async (path: string, file: { type: string }) => {
          store().uploads.push({ path, type: file.type });
          return store().uploadError ? { error: { message: "boom" } } : { error: null };
        },
        remove: async (paths: string[]) => {
          store().removed.push(paths);
          return { error: null };
        },
      }),
    },
  };
}
