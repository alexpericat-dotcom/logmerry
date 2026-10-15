import { validateClientInput, type ClientOrigin } from "./clients.ts";
import { isUuid } from "./notes.ts";

/** Valeur du menu « Lié à » qui ouvre la création d'une fiche sur place. */
export const NEW_CLIENT = "new";

export type LinkInput = { client_id: string; new_name: string; new_origin: string };
export type LinkErrors = { client_id?: string; new_name?: string; new_origin?: string };
export type NoteLink = { kind: "none" } | { kind: "existing"; id: string } | { kind: "new"; name: string; origin: ClientOrigin };

/** Lit le champ « Lié à » : aucune fiche, une fiche existante, ou une nouvelle fiche (prospect, nom + origine). */
export function validateLink(input: LinkInput): { ok: true; link: NoteLink } | { ok: false; errors: LinkErrors } {
  if (input.client_id === "") return { ok: true, link: { kind: "none" } };
  if (input.client_id === NEW_CLIENT) {
    const r = validateClientInput({ name: input.new_name, status: "prospect", origin: input.new_origin });
    if (!r.ok) return { ok: false, errors: { new_name: r.errors.name, new_origin: r.errors.origin } };
    return { ok: true, link: { kind: "new", name: r.value.name, origin: r.value.origin } };
  }
  if (!isUuid(input.client_id)) return { ok: false, errors: { client_id: "Choisis une fiche de la liste." } };
  return { ok: true, link: { kind: "existing", id: input.client_id } };
}
