export const TITLE_MAX = 200;
export const BODY_MAX = 50_000;

export const NOTE_TYPES = ["note", "procedure", "template", "faq"] as const;
export type NoteType = (typeof NOTE_TYPES)[number];

export const NOTE_TYPE_LABELS: Record<NoteType, string> = {
  note: "Note",
  procedure: "Procédure",
  template: "Modèle",
  faq: "FAQ",
};

/** Libellés du filtre de la liste (pluriel). */
export const NOTE_FILTER_LABELS: Record<NoteType, string> = {
  note: "Notes",
  procedure: "Procédures",
  template: "Modèles",
  faq: "FAQ",
};

export type NoteInput = { title: string; body: string; type: string };
export type NoteValues = { title: string; body: string; type: NoteType };
export type NoteErrors = { title?: string; body?: string; type?: string };

export function parseNoteType(value: unknown): NoteType | null {
  return NOTE_TYPES.find((t) => t === value) ?? null;
}

/** Filtre de l'adresse (`?type=…`) : valeur inconnue ou absente = « Toutes » (null). */
export function parseTypeFilter(value: string | string[] | undefined): NoteType | null {
  return parseNoteType(Array.isArray(value) ? value[0] : value);
}

export function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

// Postgres refuse le caractère nul dans un texte.
const stripNul = (s: string) => s.replaceAll("\u0000", "");
// Même décompte que char_length côté base (points de code, pas unités UTF-16).
const length = (s: string) => [...s].length;

export function validateNoteInput(
  input: NoteInput,
): { ok: true; value: NoteValues } | { ok: false; errors: NoteErrors } {
  const title = stripNul(input.title).trim();
  const body = stripNul(input.body);
  const type = parseNoteType(input.type);
  const errors: NoteErrors = {};
  if (!title) errors.title = "Saisis un titre pour ta note.";
  else if (length(title) > TITLE_MAX) {
    errors.title = `Le titre doit faire ${TITLE_MAX} caractères au plus.`;
  }
  if (length(body) > BODY_MAX) {
    errors.body = `Le texte doit faire ${BODY_MAX.toLocaleString("fr-FR")} caractères au plus.`;
  }
  if (!type) errors.type = "Choisis un type de note.";
  if (errors.title || errors.body || !type) return { ok: false, errors };
  return { ok: true, value: { title, body, type } };
}

/** Début du texte sur une ligne, pour la liste. */
export function excerpt(body: string, max = 140): string {
  const chars = [...body.replace(/\s+/g, " ").trim()];
  return chars.length > max ? `${chars.slice(0, max).join("").trimEnd()}…` : chars.join("");
}

/** Filtre « Brouillons » de la liste des notes (`?statut=brouillon`) ; toute autre valeur : pas de filtre. */
export function parseStatusFilter(value: string | string[] | undefined): "draft" | null {
  return (Array.isArray(value) ? value[0] : value) === "brouillon" ? "draft" : null;
}

export const DRAFT_TITLE_PREFIX = "À documenter : ";

/** Titre d'une note à documenter, dérivé de la question (200 caractères au plus, points de code comptés). */
export function draftTitle(question: string): string {
  const q = question.slice(0, TITLE_MAX * 2).replace(/\s+/g, " ").trim(); // borné avant tout parcours : l'entrée vient du navigateur
  const chars = [...`${DRAFT_TITLE_PREFIX}${q}`];
  return chars.length > TITLE_MAX ? `${chars.slice(0, TITLE_MAX - 1).join("").trimEnd()}…` : chars.join("");
}
