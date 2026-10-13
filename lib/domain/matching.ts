/** Seuil de similarité (0 à 1) de la recherche par sens et de l'assistant. Provisoire, à régler sur docs/rag-tests.md (story 8.14).
 *  Mesures (mistral-embed, textes fictifs) : les scores sont très resserrés. Questions pertinentes : 0,74 à 0,86 ; questions sans rapport :
 *  0,66 à 0,74. Une question courte ou « est-ce que j'ai une note sur X » tombe vers 0,74-0,76 et peut être écartée à tort : le propriétaire
 *  garde le seuil haut (décision du 13 octobre 2026) et veut isoler les mots-clés de la question plutôt que de baisser le seuil. */
export const MATCH_THRESHOLD = 0.76;
export const MATCH_COUNT = 8;
export const SENSE_QUERY_MAX = 300;

/** Score à l'affichage : « 0,79 ». */
export function formatScore(similarity: number): string {
  return similarity.toFixed(2).replace(".", ",");
}
