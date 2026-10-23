/**
 * Lit toutes les lignes d'une requête page par page. PostgREST plafonne une réponse à 1 000 lignes par défaut, SANS erreur :
 * sans cette boucle, une jauge ou une liste sous-estimerait en silence. `fetchPage(from, to)` doit avoir un ordre TOTAL
 * (un critère puis l'identifiant), sinon deux pages peuvent se chevaucher ou perdre une ligne.
 */
export const PAGE_SIZE = 1000;

export async function readAllPages<T>(fetchPage: (from: number, to: number) => Promise<T[]>): Promise<T[]> {
  const all: T[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const rows = await fetchPage(from, from + PAGE_SIZE - 1);
    all.push(...rows);
    if (rows.length < PAGE_SIZE) return all;
  }
}
