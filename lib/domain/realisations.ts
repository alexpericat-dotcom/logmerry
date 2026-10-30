export const REALISATION_TITLE_MAX = 200;
export const REALISATION_DESCRIPTION_MAX = 600;
export const REALISATION_CLIENT_NAME_MAX = 200;
export const REALISATION_SECTOR_MAX = 100;
export const REALISATION_RESULT_MAX = 200;
export const REALISATION_LINK_MAX = 300;
export const REALISATION_STACK_MAX = 12;
export const REALISATION_TAG_MAX = 40;

export const REALISATION_ORIGINS = ["real_client", "training", "friend", "demo"] as const;
export type RealisationOrigin = (typeof REALISATION_ORIGINS)[number];

export const REALISATION_ORIGIN_LABELS: Record<RealisationOrigin, string> = {
  real_client: "Client réel",
  training: "Formation",
  friend: "Ami",
  demo: "Démo",
};

export type RealisationInput = {
  title: string;
  description: string;
  origin: string;
  client_name: string;
  client_sector: string;
  result_figure: string;
  link_url: string;
  /** Case à cocher : « on » si cochée, vide sinon. */
  client_consent: string;
  /** Étiquettes séparées par des virgules. */
  stack: string;
};
export type RealisationValues = {
  title: string;
  description: string;
  origin: RealisationOrigin;
  client_name: string | null;
  client_sector: string | null;
  result_figure: string | null;
  link_url: string | null;
  client_consent: boolean;
  stack: string[];
};
export type RealisationErrors = Partial<Record<keyof RealisationInput, string>>;

export const parseRealisationOrigin = (value: unknown): RealisationOrigin | null => REALISATION_ORIGINS.find((o) => o === value) ?? null;

// Postgres refuse le caractère nul ; un champ texte envoie « \r\n » (deux caractères) là où l'on compte un saut de ligne ; les espaces de largeur nulle
// ne se voient pas : un titre qui n'en contient que serait un lien sans nom.
const clean = (s: string) =>
  s
    .replaceAll("\u0000", "")
    .replace(/[\u200B-\u200D\u2060\uFEFF]/g, "")
    .replace(/\r\n?/g, "\n")
    .trim();
// Même décompte que char_length côté base (points de code, pas unités UTF-16).
const length = (s: string) => [...s].length;

/** Pourquoi « Publier » est refusé, ou null s'il est permis (l'accord du client est le seul critère de cette story). */
export const publicationBlock = (r: { client_consent: boolean }): string | null => (r.client_consent ? null : "Coche l'accord du client avant de publier.");

/** Adresse de la page en ligne : https seulement, sans identifiants, sans espace ; renvoie l'adresse telle que saisie (pas réécrite) ou null. */
export function parsePublicLink(text: string): string | null {
  if (/\s/.test(text) || length(text) > REALISATION_LINK_MAX) return null;
  try {
    const url = new URL(text);
    return url.protocol === "https:" && !url.username && !url.password && url.hostname.includes(".") ? text : null;
  } catch {
    return null;
  }
}

/** « Next.js, supabase ,, Next.js » → ["Next.js", "supabase"] : vides ignorées, doublons retirés (casse comprise), ordre gardé. */
export function parseStack(text: string): string[] {
  const seen = new Set<string>();
  const tags: string[] = [];
  for (const part of text.split(",")) {
    const tag = clean(part);
    const key = tag.toLowerCase();
    if (!tag || seen.has(key)) continue;
    seen.add(key);
    tags.push(tag);
  }
  return tags;
}

export function validateRealisationInput(input: RealisationInput): { ok: true; value: RealisationValues } | { ok: false; errors: RealisationErrors } {
  const title = clean(input.title);
  const description = clean(input.description);
  const origin = parseRealisationOrigin(input.origin);
  const optional = (text: string) => clean(text) || null;
  const client_name = optional(input.client_name);
  const client_sector = optional(input.client_sector);
  const result_figure = optional(input.result_figure);
  const link_url = optional(input.link_url);
  const stack = parseStack(input.stack);

  const errors: RealisationErrors = {};
  if (!title) errors.title = "Saisis le titre de la réalisation.";
  else if (length(title) > REALISATION_TITLE_MAX) errors.title = `Le titre doit faire ${REALISATION_TITLE_MAX} caractères au plus.`;
  if (!description) errors.description = "Saisis une description courte.";
  else if (length(description) > REALISATION_DESCRIPTION_MAX) errors.description = `La description doit faire ${REALISATION_DESCRIPTION_MAX} caractères au plus.`;
  if (!origin) errors.origin = "Choisis une origine.";
  if (client_name && length(client_name) > REALISATION_CLIENT_NAME_MAX) errors.client_name = `Le nom du client doit faire ${REALISATION_CLIENT_NAME_MAX} caractères au plus.`;
  if (client_sector && length(client_sector) > REALISATION_SECTOR_MAX) errors.client_sector = `Le secteur doit faire ${REALISATION_SECTOR_MAX} caractères au plus.`;
  if (result_figure && length(result_figure) > REALISATION_RESULT_MAX) errors.result_figure = `Le chiffre de résultat doit faire ${REALISATION_RESULT_MAX} caractères au plus.`;
  if (link_url && !parsePublicLink(link_url)) errors.link_url = `Saisis une adresse complète en https:// (${REALISATION_LINK_MAX} caractères au plus, sans espace ni identifiant).`;
  if (stack.length > REALISATION_STACK_MAX) errors.stack = `Garde ${REALISATION_STACK_MAX} étiquettes au plus.`;
  else if (stack.some((t) => length(t) > REALISATION_TAG_MAX)) errors.stack = `Chaque étiquette doit faire ${REALISATION_TAG_MAX} caractères au plus.`;

  if (Object.keys(errors).length > 0 || !origin) return { ok: false, errors };
  return { ok: true, value: { title, description, origin, client_name, client_sector, result_figure, link_url, client_consent: input.client_consent === "on", stack } };
}
