export const CLIENT_NAME_MAX = 200;

export const CLIENT_STATUSES = ["prospect", "client"] as const;
export type ClientStatus = (typeof CLIENT_STATUSES)[number];

export const CLIENT_ORIGINS = ["real_client", "training", "friend", "demo"] as const;
export type ClientOrigin = (typeof CLIENT_ORIGINS)[number];

export const CLIENT_STATUS_LABELS: Record<ClientStatus, string> = { prospect: "Prospect", client: "Client" };
/** Libellés du filtre (pluriel). */
export const CLIENT_STATUS_FILTER_LABELS: Record<ClientStatus, string> = { prospect: "Prospects", client: "Clients" };
export const CLIENT_ORIGIN_LABELS: Record<ClientOrigin, string> = {
  real_client: "Client réel",
  training: "Formation",
  friend: "Ami",
  demo: "Démo",
};

export type ClientInput = { name: string; status: string; origin: string };
export type ClientValues = { name: string; status: ClientStatus; origin: ClientOrigin };
export type ClientErrors = { name?: string; status?: string; origin?: string };

export const parseClientStatus = (value: unknown): ClientStatus | null => CLIENT_STATUSES.find((s) => s === value) ?? null;
export const parseClientOrigin = (value: unknown): ClientOrigin | null => CLIENT_ORIGINS.find((o) => o === value) ?? null;

// Postgres refuse le caractère nul dans un texte.
const stripNul = (s: string) => s.replaceAll("\u0000", "");
// Même décompte que char_length côté base (points de code, pas unités UTF-16).
const length = (s: string) => [...s].length;

export function validateClientInput(input: ClientInput): { ok: true; value: ClientValues } | { ok: false; errors: ClientErrors } {
  const name = stripNul(input.name).trim();
  const status = parseClientStatus(input.status);
  const origin = parseClientOrigin(input.origin);
  const errors: ClientErrors = {};
  if (!name) errors.name = "Saisis le nom de la fiche.";
  else if (length(name) > CLIENT_NAME_MAX) errors.name = `Le nom doit faire ${CLIENT_NAME_MAX} caractères au plus.`;
  if (!status) errors.status = "Choisis un statut.";
  if (!origin) errors.origin = "Choisis une origine.";
  if (errors.name || errors.status || errors.origin || !status || !origin) return { ok: false, errors };
  return { ok: true, value: { name, status, origin } };
}

/** Colonnes triables : clé d'adresse (`?tri=`) → colonne de la base. */
export const CLIENT_SORT_COLUMNS = { nom: "name", statut: "status", origine: "origin", creee: "created_at" } as const;
export type ClientSortKey = keyof typeof CLIENT_SORT_COLUMNS;
export type SortDir = "asc" | "desc";
export type ClientView = { statut: ClientStatus | null; origine: ClientOrigin | null; tri: ClientSortKey; ordre: SortDir };

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

/** Lit l'adresse de la liste ; toute valeur inconnue est ignorée (tri par défaut : date de création, récent d'abord). */
export function parseClientView(params: { statut?: string | string[]; origine?: string | string[]; tri?: string | string[]; ordre?: string | string[] }): ClientView {
  const tri = first(params.tri);
  const sortKnown = tri !== undefined && Object.hasOwn(CLIENT_SORT_COLUMNS, tri);
  const key = sortKnown ? (tri as ClientSortKey) : "creee";
  const dirParam = first(params.ordre);
  const dir: SortDir = sortKnown ? (dirParam === "desc" ? "desc" : "asc") : "desc";
  return { statut: parseClientStatus(first(params.statut)), origine: parseClientOrigin(first(params.origine)), tri: key, ordre: dir };
}

/** Adresse de la liste pour une vue (les valeurs par défaut ne s'écrivent pas). */
export function clientsHref(view: Partial<ClientView>): string {
  const q = new URLSearchParams();
  if (view.statut) q.set("statut", view.statut);
  if (view.origine) q.set("origine", view.origine);
  if (view.tri && !(view.tri === "creee" && view.ordre !== "asc")) {
    q.set("tri", view.tri);
    q.set("ordre", view.ordre ?? "asc");
  }
  const s = q.toString();
  return s ? `/clients?${s}` : "/clients";
}

/** Sens du prochain clic sur un en-tête : croissant d'abord, puis inversé si la colonne est déjà triée. */
export const nextDir = (view: ClientView, key: ClientSortKey): SortDir => (view.tri === key && view.ordre === "asc" ? "desc" : "asc");

/** « 12 fiches sur 40 » (fiches affichées sur fiches au total). */
export function countLabel(shown: number, total: number): string {
  const noun = (n: number) => (n > 1 ? "fiches" : "fiche");
  return shown === total ? `${total} ${noun(total)}` : `${shown} ${noun(shown)} sur ${total}`;
}

export type ClientRow = { id: string; name: string; status: ClientStatus; origin: ClientOrigin; created_at: string };

const collator = new Intl.Collator("fr", { sensitivity: "base" });

/** Valeur de tri d'une colonne : libellés français (alphabétique, accents et casse ignorés), pas l'ordre des enums de la base. */
function sortValue(row: ClientRow, key: ClientSortKey): string {
  if (key === "nom") return row.name;
  if (key === "statut") return CLIENT_STATUS_LABELS[row.status];
  if (key === "origine") return CLIENT_ORIGIN_LABELS[row.origin];
  return row.created_at;
}

/**
 * Filtre et trie mes fiches (toutes lues d'un coup, la RLS les limite aux miennes) ; `total` = nombre de fiches sans filtre,
 * calculé sur la même lecture que la liste (jamais deux chiffres de deux requêtes).
 * ponytail : tout en mémoire, suffisant pour quelques dizaines de fiches ; pagination côté base au-delà de 1 000.
 */
export function viewClients<T extends ClientRow>(all: T[], view: ClientView): { rows: T[]; total: number } {
  const dir = view.ordre === "asc" ? 1 : -1;
  const rows = all
    .filter((c) => (!view.statut || c.status === view.statut) && (!view.origine || c.origin === view.origine))
    .sort((a, b) => {
      const primary = view.tri === "creee" ? (a.created_at < b.created_at ? -1 : a.created_at > b.created_at ? 1 : 0) : collator.compare(sortValue(a, view.tri), sortValue(b, view.tri));
      return dir * primary || (a.created_at < b.created_at ? 1 : a.created_at > b.created_at ? -1 : 0); // à égalité : la plus récente d'abord
    });
  return { rows, total: all.length };
}

/** Minuscules sans accents : « École » et « ecole » se valent. */
const fold = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

export type SearchableContact = { client_id: string; name: string; job_title: string | null; email: string | null };

/**
 * Recherche dans mes fiches : chaque mot de la saisie doit apparaître (accents et casse ignorés) soit dans le nom de la fiche,
 * soit dans un de ses contacts (nom, fonction, e-mail, et nom de la fiche : « claire brume » trouve la fiche Brume par Claire).
 * Rang : nom qui commence par la saisie, autre nom correspondant, puis fiches trouvées par un contact (`via` = ce contact) ;
 * ordre alphabétique à égalité. `limit` résultats au plus.
 * ponytail : sur les listes lues d'un coup (quelques dizaines de fiches) ; une colonne indexée au-delà de 1 000.
 */
export function matchClients<T extends { id: string; name: string }>(all: T[], query: string, limit = 8, contacts: SearchableContact[] = []): (T & { via?: string })[] {
  const words = fold(query).split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  const needle = words.join(" ");
  const has = (hay: string) => words.every((w) => hay.includes(w));
  const hits: { c: T & { via?: string }; name: string; rank: number }[] = [];
  for (const c of all) {
    const name = fold(c.name);
    if (has(name)) {
      hits.push({ c, name, rank: name.startsWith(needle) ? 0 : 1 });
      continue;
    }
    const viaContact = contacts.find((k) => k.client_id === c.id && has(fold([k.name, k.job_title ?? "", k.email ?? "", c.name].join(" "))));
    if (viaContact) hits.push({ c: { ...c, via: viaContact.name }, name, rank: 2 });
  }
  return hits
    .sort((a, b) => a.rank - b.rank || a.name.localeCompare(b.name, "fr"))
    .slice(0, limit)
    .map(({ c }) => c);
}
