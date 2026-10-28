import type { NoteType } from "@/lib/domain/notes";

/**
 * Ligne de synthèse du cockpit (story 5.6) : combien de notes brouillon restent à documenter. Ce n'est pas une tâche.
 * « procédure(s) » quand tous les brouillons sont des procédures, sinon « brouillon(s) » ; null à 0 (la ligne n'est pas affichée).
 */
export function draftSummary(types: NoteType[]): string | null {
  const n = types.length;
  if (n === 0) return null;
  const word = types.every((t) => t === "procedure") ? "procédure" : "brouillon";
  return `${n} ${word}${n > 1 ? "s" : ""} à documenter`;
}
