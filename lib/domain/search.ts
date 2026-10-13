export const SEARCH_MAX = 100;

/** Requête prête à envoyer : espaces réduits, `max` caractères au plus (100 par défaut) ; chaîne vide si rien à chercher. */
export function normalizeQuery(raw: string, max = SEARCH_MAX): string {
  return [...raw.replace(/\s+/g, " ").trim()].slice(0, max).join("").trim();
}
