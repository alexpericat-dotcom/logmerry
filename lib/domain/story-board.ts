/** Listes de stories d'une mission par identifiant de liste : `BACKLOG` (hors sprint) ou l'identifiant d'un sprint non clos. */
export type Lists = Record<string, string[]>;

export const BACKLOG = "backlog";

/** La liste qui contient `id`, ou `id` lui-même si c'est une liste (zone de dépôt vide ou survol d'une liste). */
export function findList(lists: Lists, id: string): string | undefined {
  if (id in lists) return id;
  return Object.keys(lists).find((key) => lists[key].includes(id));
}

/**
 * Déplace la story `id` dans la liste visée par `overId` (une story de cette liste ou la liste elle-même), à la place de la story survolée
 * (après elle si `below`) ou en dernier pour une liste. Renvoie les mêmes listes (même objet) si rien ne change.
 */
export function moveToList(lists: Lists, id: string, overId: string, below: boolean): Lists {
  const from = findList(lists, id);
  const to = findList(lists, overId);
  if (!from || !to || from === to) return lists;
  const target = lists[to];
  const at = overId in lists ? target.length : target.indexOf(overId) + (below ? 1 : 0);
  return { ...lists, [from]: lists[from].filter((x) => x !== id), [to]: [...target.slice(0, at), id, ...target.slice(at)] };
}
