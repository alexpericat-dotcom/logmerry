import { fold } from "./clients.ts";
import { isUuid } from "./notes.ts";

export const MISSION_TITLE_MAX = 200;

export const MISSION_STATUSES = ["planned", "in_progress", "done", "cancelled"] as const;
export type MissionStatus = (typeof MISSION_STATUSES)[number];

export const MISSION_STATUS_LABELS: Record<MissionStatus, string> = { planned: "À planifier", in_progress: "En cours", done: "Terminée", cancelled: "Annulée" };
/** Filtre de la liste (pluriel). */
export const MISSION_STATUS_FILTER_LABELS: Record<MissionStatus, string> = { planned: "À planifier", in_progress: "En cours", done: "Terminées", cancelled: "Annulées" };
/** Valeur du filtre dans l'adresse (`?statut=`) : jamais le nom de l'enum de la base. */
export const MISSION_STATUS_SLUGS: Record<MissionStatus, string> = { planned: "a-planifier", in_progress: "en-cours", done: "terminee", cancelled: "annulee" };

export const parseMissionStatus = (value: unknown): MissionStatus | null => MISSION_STATUSES.find((s) => s === value) ?? null;
const parseStatusSlug = (value: unknown): MissionStatus | null => MISSION_STATUSES.find((s) => MISSION_STATUS_SLUGS[s] === value) ?? null;

export type MissionInput = { client_id: string; title: string; status: string; start_date: string; end_date: string };
export type MissionValues = { client_id: string; title: string; status: MissionStatus; start_date: string | null; end_date: string | null };
export type MissionErrors = { client_id?: string; title?: string; status?: string; start_date?: string; end_date?: string };

const stripNul = (s: string) => s.replaceAll("\u0000", "");
const length = (s: string) => [...s].length;

/** `YYYY-MM-DD` qui existe vraiment au calendrier (pas de 31 février), à partir de 1900 (l'année 0000 passe en JavaScript mais Postgres la refuse). */
export function isDay(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number(value.slice(0, 4)) < 1900) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

/** Valide une mission ; un champ facultatif vide devient `null` ; la fin ne précède jamais le début. */
export function validateMissionInput(input: MissionInput): { ok: true; value: MissionValues } | { ok: false; errors: MissionErrors } {
  const title = stripNul(input.title).trim();
  const status = parseMissionStatus(input.status);
  const start = input.start_date.trim();
  const end = input.end_date.trim();
  const errors: MissionErrors = {};
  if (!isUuid(input.client_id)) errors.client_id = "Choisis le client de la mission.";
  if (!title) errors.title = "Saisis le titre de la mission.";
  else if (length(title) > MISSION_TITLE_MAX) errors.title = `Le titre doit faire ${MISSION_TITLE_MAX} caractères au plus.`;
  if (!status) errors.status = "Choisis un statut.";
  if (start && !isDay(start)) errors.start_date = "Saisis une date de début valide.";
  if (end && !isDay(end)) errors.end_date = "Saisis une date de fin valide.";
  if (!errors.start_date && !errors.end_date && start && end && end < start) errors.end_date = "La date de fin ne peut pas précéder la date de début.";
  if (Object.keys(errors).length || !status) return { ok: false, errors };
  return { ok: true, value: { client_id: input.client_id, title, status, start_date: start || null, end_date: end || null } };
}

/** Colonnes triables : clé d'adresse (`?tri=`). */
export const MISSION_SORT_KEYS = ["titre", "client", "statut", "debut", "fin", "creee"] as const;
export type MissionSortKey = (typeof MISSION_SORT_KEYS)[number];
export type SortDir = "asc" | "desc";
export type MissionView = { statut: MissionStatus | null; tri: MissionSortKey; ordre: SortDir };

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

/** Lit l'adresse de la liste ; toute valeur inconnue est ignorée (par défaut : la plus récente d'abord). */
export function parseMissionView(params: { statut?: string | string[]; tri?: string | string[]; ordre?: string | string[] }): MissionView {
  const tri = first(params.tri);
  const known = MISSION_SORT_KEYS.find((k) => k === tri);
  return {
    statut: parseStatusSlug(first(params.statut)),
    tri: known ?? "creee",
    ordre: known ? (first(params.ordre) === "desc" ? "desc" : "asc") : "desc",
  };
}

/** Adresse de la liste pour une vue (les valeurs par défaut ne s'écrivent pas). */
export function missionsHref(view: Partial<MissionView>): string {
  const q = new URLSearchParams();
  if (view.statut) q.set("statut", MISSION_STATUS_SLUGS[view.statut]);
  if (view.tri && !(view.tri === "creee" && view.ordre !== "asc")) {
    q.set("tri", view.tri);
    q.set("ordre", view.ordre ?? "asc");
  }
  const s = q.toString();
  return s ? `/missions?${s}` : "/missions";
}

/** Sens du prochain clic sur un en-tête : croissant d'abord, puis inversé si la colonne est déjà triée. */
export const nextDir = (view: MissionView, key: MissionSortKey): SortDir => (view.tri === key && view.ordre === "asc" ? "desc" : "asc");

/** « 3 missions sur 10 » (affichées sur total). */
export function countLabel(shown: number, total: number): string {
  const noun = (n: number) => (n > 1 ? "missions" : "mission");
  return shown === total ? `${total} ${noun(total)}` : `${shown} ${noun(shown)} sur ${total}`;
}

export type MissionRow = { id: string; title: string; status: MissionStatus; start_date: string | null; end_date: string | null; created_at: string; client: { name: string } | null };

const collator = new Intl.Collator("fr", { sensitivity: "base" });
const byDate = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

/** Filtre et trie mes missions (lues d'un coup, la RLS limite aux miennes) ; `total` vient de la même lecture. Les dates absentes passent toujours en dernier. */
export function viewMissions<T extends MissionRow>(all: T[], view: MissionView): { rows: T[]; total: number } {
  const dir = view.ordre === "asc" ? 1 : -1;
  const rows = all
    .filter((m) => !view.statut || m.status === view.statut)
    .sort((a, b) => {
      if (view.tri === "debut" || view.tri === "fin") {
        const [x, y] = view.tri === "debut" ? [a.start_date, b.start_date] : [a.end_date, b.end_date];
        if (!x || !y) return x ? -1 : y ? 1 : 0; // sans date : en dernier, quel que soit le sens
        return dir * byDate(x, y) || byDate(b.created_at, a.created_at);
      }
      const primary =
        view.tri === "titre" ? collator.compare(a.title, b.title)
        : view.tri === "client" ? collator.compare(a.client?.name ?? "", b.client?.name ?? "")
        : view.tri === "statut" ? collator.compare(MISSION_STATUS_LABELS[a.status], MISSION_STATUS_LABELS[b.status])
        : byDate(a.created_at, b.created_at);
      return dir * primary || byDate(b.created_at, a.created_at);
    });
  return { rows, total: all.length };
}

/** Refus de supprimer une fiche qui a des missions (le même texte sert avant la demande et après le refus de la base). */
export const missionsRefusal = (n: number) =>
  n === 1
    ? "Cette fiche a 1 mission : supprime-la ou garde la fiche."
    : n > 1
      ? `Cette fiche a ${n} missions : supprime-les ou garde la fiche.`
      : "Cette fiche a des missions : supprime-les ou garde la fiche.";

/**
 * Recherche de missions pour ⌘K : tous les mots saisis se retrouvent dans le titre, ou dans le titre et le nom du client réunis (casse et accents ignorés).
 * Titre qui commence par la saisie, puis titre qui la contient, puis titre et client ensemble ; ordre alphabétique à égalité ; `limit` au plus.
 * ponytail : sur la liste lue d'un coup (quelques dizaines de missions) ; une colonne indexée au-delà de 1 000.
 */
export function matchMissions<T extends { id: string; title: string; client: { name: string } | null }>(all: T[], query: string, limit = 8): T[] {
  const words = fold(query).split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  const needle = words.join(" ");
  const has = (hay: string) => words.every((w) => hay.includes(w));
  const hits: { m: T; title: string; rank: number }[] = [];
  for (const m of all) {
    const title = fold(m.title).replace(/\s+/g, " ").trim(); // espaces multiples du titre : comme la saisie normalisée
    if (has(title)) hits.push({ m, title, rank: title.startsWith(needle) ? 0 : 1 });
    else if (has(`${title} ${fold(m.client?.name ?? "")}`)) hits.push({ m, title, rank: 2 });
  }
  return hits
    .sort((a, b) => a.rank - b.rank || a.title.localeCompare(b.title, "fr"))
    .slice(0, limit)
    .map(({ m }) => m);
}
