"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { validateNoteInput, type NoteErrors } from "@/lib/domain/notes";
import { createClient } from "@/lib/supabase/server";

export type NoteFormState = {
  errors?: NoteErrors;
  message?: string;
  values?: { title: string; body: string };
};

const SAVE_FAILED = "Enregistrement impossible. Réessaie.";

export async function createNote(
  _prev: NoteFormState,
  formData: FormData,
): Promise<NoteFormState> {
  const values = {
    title: String(formData.get("title") ?? ""),
    body: String(formData.get("body") ?? ""),
  };

  // Session d'abord : sans connexion, aucune validation ni écriture.
  let signedIn = false;
  let saved = false;
  let errors: NoteErrors | undefined;
  try {
    const supabase = await createClient();
    const { data, error: claimsError } = await supabase.auth.getClaims();
    signedIn = !claimsError && !!data?.claims;
    if (signedIn) {
      const result = validateNoteInput(values);
      if (!result.ok) errors = result.errors;
      else {
        // owner_id vient de la base (default auth.uid()) ; la RLS refuse tout autre propriétaire.
        const { error } = await supabase.from("notes").insert(result.value);
        saved = !error;
      }
    }
  } catch {
    return { message: SAVE_FAILED, values };
  }

  // redirect() lève une exception : à appeler hors du try.
  if (!signedIn) redirect("/auth/login");
  if (errors) return { errors, values };
  if (!saved) return { message: SAVE_FAILED, values };

  revalidatePath("/notes");
  redirect("/notes");
}
