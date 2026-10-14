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

/** « 12 clients sur 40 » (fiches affichées sur fiches au total). */
export function countLabel(shown: number, total: number): string {
  const noun = (n: number) => (n > 1 ? "fiches" : "fiche");
  return shown === total ? `${total} ${noun(total)}` : `${shown} ${noun(shown)} sur ${total}`;
}
