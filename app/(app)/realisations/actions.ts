"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { isUuid } from "@/lib/domain/notes";
import { validateRealisationInput, type RealisationErrors, type RealisationInput, type RealisationValues } from "@/lib/domain/realisations";
import type { Db } from "@/lib/supabase/server";
import { withSession } from "@/lib/supabase/with-session";

export type RealisationFormState = {
  errors?: RealisationErrors;
  message?: string;
  values?: RealisationInput;
};
export type DeleteRealisationState = { message?: string };

const SAVE_FAILED = "Enregistrement impossible. Réessaie.";
const NOT_FOUND = "Cette réalisation n'existe plus.";

const text = (formData: FormData, key: string) => {
  const v = formData.get(key);
  return typeof v === "string" ? v : "";
};

const readValues = (formData: FormData): RealisationInput => ({
  title: text(formData, "title"),
  description: text(formData, "description"),
  origin: text(formData, "origin"),
  client_name: text(formData, "client_name"),
  client_sector: text(formData, "client_sector"),
  result_figure: text(formData, "result_figure"),
  link_url: text(formData, "link_url"),
  stack: text(formData, "stack"),
});

type WriteOutcome = "saved" | "not-found" | "error";

/** Session, validation, écriture ; `write` dit si la base a enregistré, si la réalisation n'existe plus ou si elle a échoué. */
async function save(values: RealisationInput, write: (supabase: Db, value: RealisationValues) => Promise<WriteOutcome>): Promise<RealisationFormState> {
  const result = await withSession(async (supabase) => {
    const checked = validateRealisationInput(values);
    if (!checked.ok) return { errors: checked.errors };
    return { outcome: await write(supabase, checked.value) };
  });

  // redirect() lève une exception : à appeler hors du try.
  if (result.status === "signed-out") redirect("/auth/login");
  if (result.status === "failed") return { message: SAVE_FAILED, values };
  if (result.value.errors) return { errors: result.value.errors, values };
  if (result.value.outcome === "not-found") return { message: NOT_FOUND, values };
  if (result.value.outcome !== "saved") return { message: SAVE_FAILED, values };

  revalidatePath("/realisations");
  redirect("/realisations");
}

export async function createRealisation(_prev: RealisationFormState, formData: FormData): Promise<RealisationFormState> {
  // owner_id vient de la base (default auth.uid()) ; la RLS refuse tout autre propriétaire. Toujours non publiée à la création.
  return save(readValues(formData), async (supabase, value) => {
    const { error } = await supabase.from("realisations").insert(value);
    return error ? "error" : "saved";
  });
}

export async function updateRealisation(id: string, _prev: RealisationFormState, formData: FormData): Promise<RealisationFormState> {
  return save(readValues(formData), async (supabase, value) => {
    if (!isUuid(id)) return "not-found";
    const { data, error } = await supabase.from("realisations").update(value).eq("id", id).select("id");
    if (error) return "error";
    return data?.length ? "saved" : "not-found";
  });
}

export async function deleteRealisation(id: string): Promise<DeleteRealisationState> {
  const result = await withSession(async (supabase): Promise<WriteOutcome> => {
    if (!isUuid(id)) return "not-found";
    const { data, error } = await supabase.from("realisations").delete().eq("id", id).select("id");
    if (error) return "error";
    return data?.length ? "saved" : "not-found";
  });

  if (result.status === "signed-out") redirect("/auth/login");
  if (result.status === "failed" || result.value === "error") return { message: "Suppression impossible. La réalisation est conservée. Réessaie." };
  if (result.value === "not-found") return { message: NOT_FOUND };

  revalidatePath("/realisations");
  redirect("/realisations");
}
