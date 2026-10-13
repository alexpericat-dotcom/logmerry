export const SEARCH_MAX = 100;

/** Requête prête à envoyer : espaces réduits, 100 caractères au plus ; chaîne vide si rien à chercher. */
export function normalizeQuery(raw: string): string {
  return [...raw.replace(/\s+/g, " ").trim()].slice(0, SEARCH_MAX).join("").trim();
}
