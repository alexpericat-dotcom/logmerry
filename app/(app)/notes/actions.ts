"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  isUuid,
  validateNoteInput,
  type NoteErrors,
  type NoteValues,
} from "@/lib/domain/notes";
import { createClient } from "@/lib/supabase/server";

export type NoteFormState = {
  errors?: NoteErrors;
  message?: string;
  values?: { title: string; body: string; type: string };
};

export type DeleteState = { message?: string };

const SAVE_FAILED = "Enregistrement impossible. Réessaie.";
const NOT_FOUND = "Cette note n'existe plus.";

type Session<T> =
  | { status: "signed-out" }
  | { status: "failed" }
  | { status: "ok"; value: T };

/** Exécute `run` avec un client authentifié ; sans session, `run` n'est jamais appelé. */
async function withSession<T>(run: (supabase: SupabaseClient) => Promise<T>): Promise<Session<T>> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getClaims();
    if (error || !data?.claims) return { status: "signed-out" };
    return { status: "ok", value: await run(supabase) };
  } catch {
    return { status: "failed" };
  }
}

function readValues(formData: FormData) {
  return {
    title: String(formData.get("title") ?? ""),
    body: String(formData.get("body") ?? ""),
    type: String(formData.get("type") ?? ""),
  };
}

type WriteOutcome = "saved" | "not-found" | "error";

/** Session, validation, écriture. `write` dit si la base a enregistré, si la note n'existe plus ou si elle a échoué. */
async function save(
  values: { title: string; body: string; type: string },
  write: (supabase: SupabaseClient, value: NoteValues) => Promise<WriteOutcome>,
): Promise<NoteFormState> {
  const result = await withSession(async (supabase) => {
    const checked = validateNoteInput(values);
    if (!checked.ok) return { errors: checked.errors };
    return { outcome: await write(supabase, checked.value) };
  });

  // redirect() lève une exception : à appeler hors du try.
  if (result.status === "signed-out") redirect("/auth/login");
  if (result.status === "failed") return { message: SAVE_FAILED, values };
  if (result.value.errors) return { errors: result.value.errors, values };
  if (result.value.outcome === "not-found") return { message: NOT_FOUND, values };
  if (result.value.outcome !== "saved") return { message: SAVE_FAILED, values };

  revalidatePath("/notes");
  redirect("/notes");
}

export async function createNote(_prev: NoteFormState, formData: FormData): Promise<NoteFormState> {
  // owner_id vient de la base (default auth.uid()) ; la RLS refuse tout autre propriétaire.
  return save(readValues(formData), async (supabase, value) => {
    const { error } = await supabase.from("notes").insert(value);
    return error ? "error" : "saved";
  });
}

export async function updateNote(
  id: string,
  _prev: NoteFormState,
  formData: FormData,
): Promise<NoteFormState> {
  return save(readValues(formData), async (supabase, value) => {
    if (!isUuid(id)) return "not-found";
    const { data, error } = await supabase.from("notes").update(value).eq("id", id).select("id");
    if (error) return "error";
    return data?.length ? "saved" : "not-found";
  });
}

export async function deleteNote(id: string): Promise<DeleteState> {
  const result = await withSession(async (supabase): Promise<WriteOutcome> => {
    if (!isUuid(id)) return "not-found";
    const { data, error } = await supabase.from("notes").delete().eq("id", id).select("id");
    if (error) return "error";
    return data?.length ? "saved" : "not-found";
  });

  if (result.status === "signed-out") redirect("/auth/login");
  if (result.status === "failed" || result.value === "error") {
    return { message: "Suppression impossible. La note est conservée. Réessaie." };
  }
  if (result.value === "not-found") return { message: NOT_FOUND };

  revalidatePath("/notes");
  redirect("/notes");
}
