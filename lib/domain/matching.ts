/** Seuil de similarité (0 à 1) de la recherche par sens. Provisoire : mesuré sur des textes fictifs avec mistral-embed
 *  (passages pertinents 0,79 à 0,82, sans rapport jusqu'à 0,73) ; à régler sur docs/rag-tests.md (story 8.14). */
export const MATCH_THRESHOLD = 0.76;
export const MATCH_COUNT = 8;
export const SENSE_QUERY_MAX = 300;

/** Score à l'affichage : « 0,79 ». */
export function formatScore(similarity: number): string {
  return similarity.toFixed(2).replace(".", ",");
}
