export const TITLE_MAX = 200;
export const BODY_MAX = 50_000;

export type NoteInput = { title: string; body: string };
export type NoteErrors = { title?: string; body?: string };

// Postgres refuse le caractère nul dans un texte.
const stripNul = (s: string) => s.replaceAll("\u0000", "");
// Même décompte que char_length côté base (points de code, pas unités UTF-16).
const length = (s: string) => [...s].length;

export function validateNoteInput(
  input: NoteInput,
): { ok: true; value: NoteInput } | { ok: false; errors: NoteErrors } {
  const title = stripNul(input.title).trim();
  const body = stripNul(input.body);
  const errors: NoteErrors = {};
  if (!title) errors.title = "Saisis un titre pour ta note.";
  else if (length(title) > TITLE_MAX) {
    errors.title = `Le titre doit faire ${TITLE_MAX} caractères au plus.`;
  }
  if (length(body) > BODY_MAX) {
    errors.body = `Le texte doit faire ${BODY_MAX.toLocaleString("fr-FR")} caractères au plus.`;
  }
  if (errors.title || errors.body) return { ok: false, errors };
  return { ok: true, value: { title, body } };
}

/** Début du texte sur une ligne, pour la liste. */
export function excerpt(body: string, max = 140): string {
  const chars = [...body.replace(/\s+/g, " ").trim()];
  return chars.length > max ? `${chars.slice(0, max).join("").trimEnd()}…` : chars.join("");
}
