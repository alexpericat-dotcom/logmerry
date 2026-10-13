/** Seuil de similarité (0 à 1) de la recherche par sens et de l'assistant. Provisoire, à régler sur docs/rag-tests.md (story 8.14).
 *  Mesures (mistral-embed, textes fictifs) : les scores sont très resserrés. Questions pertinentes : 0,74 à 0,86 (une question
 *  courte ou « est-ce que j'ai une note sur X » tombe vers 0,74-0,76) ; questions sans rapport : 0,66 à 0,74. Aucun seuil ne sépare
 *  proprement les deux ; un seuil trop haut fait dire « aucune note » alors qu'elle existe, ce qui est pire qu'un seuil bas, car
 *  Claude sait répondre qu'un extrait ne répond pas. D'où 0,70. */
export const MATCH_THRESHOLD = 0.70;
export const MATCH_COUNT = 8;
export const SENSE_QUERY_MAX = 300;

/** Score à l'affichage : « 0,79 ». */
export function formatScore(similarity: number): string {
  return similarity.toFixed(2).replace(".", ",");
}
