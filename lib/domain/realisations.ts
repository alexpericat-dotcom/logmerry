export const REALISATION_TITLE_MAX = 200;
export const REALISATION_DESCRIPTION_MAX = 600;
export const REALISATION_CLIENT_NAME_MAX = 200;
export const REALISATION_SECTOR_MAX = 100;
export const REALISATION_RESULT_MAX = 200;
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
  stack: string[];
};
export type RealisationErrors = Partial<Record<keyof RealisationInput, string>>;

export const parseRealisationOrigin = (value: unknown): RealisationOrigin | null => REALISATION_ORIGINS.find((o) => o === value) ?? null;

// Postgres refuse le caractère nul dans un texte.
const clean = (s: string) => s.replaceAll("\u0000", "").trim();
// Même décompte que char_length côté base (points de code, pas unités UTF-16).
const length = (s: string) => [...s].length;

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
  if (stack.length > REALISATION_STACK_MAX) errors.stack = `Garde ${REALISATION_STACK_MAX} étiquettes au plus.`;
  else if (stack.some((t) => length(t) > REALISATION_TAG_MAX)) errors.stack = `Chaque étiquette doit faire ${REALISATION_TAG_MAX} caractères au plus.`;

  if (Object.keys(errors).length > 0 || !origin) return { ok: false, errors };
  return { ok: true, value: { title, description, origin, client_name, client_sector, result_figure, stack } };
}
