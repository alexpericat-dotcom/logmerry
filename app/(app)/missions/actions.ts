"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { validateMissionInput, type MissionErrors, type MissionValues } from "@/lib/domain/missions";
import { isUuid } from "@/lib/domain/notes";
import { withSession } from "@/lib/supabase/with-session";

export type MissionFormValues = { client_id: string; title: string; status: string; start_date: string; end_date: string };
export type MissionFormState = { errors?: MissionErrors; message?: string; values?: MissionFormValues };
export type DeleteMissionState = { message?: string };

const SAVE_FAILED = "Enregistrement impossible. Réessaie.";
const NOT_FOUND = "Cette mission n'existe plus.";
const CLIENT_GONE = "Cette fiche n'existe plus.";

const readValues = (formData: FormData): MissionFormValues => ({
  client_id: String(formData.get("client_id") ?? ""),
  title: String(formData.get("title") ?? ""),
  status: String(formData.get("status") ?? ""),
  start_date: String(formData.get("start_date") ?? ""),
  end_date: String(formData.get("end_date") ?? ""),
});

type WriteOutcome = "saved" | "not-found" | "client-gone" | "error";

/** Session, validation, écriture ; `write` renvoie l'identifiant enregistré, ou pourquoi ça n'a pas marché. */
async function save(
  values: MissionFormValues,
  write: (supabase: SupabaseClient, value: MissionValues) => Promise<{ outcome: WriteOutcome; id?: string }>,
): Promise<MissionFormState> {
  const result = await withSession(async (supabase) => {
    const checked = validateMissionInput(values);
    if (!checked.ok) return { errors: checked.errors };
    // La clé étrangère contourne la RLS, mais la policy refuse une fiche étrangère ; on distingue « fiche disparue » d'une erreur de base.
    const { data, error } = await supabase.from("clients").select("id").eq("id", checked.value.client_id).maybeSingle();
    if (error) return { outcome: "error" as WriteOutcome };
    if (!data) return { outcome: "client-gone" as WriteOutcome };
    return write(supabase, checked.value);
  });

  // redirect() lève une exception : à appeler hors du try.
  if (result.status === "signed-out") redirect("/auth/login");
  if (result.status === "failed") return { message: SAVE_FAILED, values };
  const r = result.value as { errors?: MissionErrors; outcome?: WriteOutcome; id?: string };
  if (r.errors) return { errors: r.errors, values };
  if (r.outcome === "client-gone") return { message: CLIENT_GONE, values };
  if (r.outcome === "not-found") return { message: NOT_FOUND, values };
  if (r.outcome !== "saved" || !r.id) return { message: SAVE_FAILED, values };

  revalidatePath("/missions");
  revalidatePath(`/missions/${r.id}`);
  revalidatePath(`/clients/${values.client_id}`);
  redirect(`/missions/${r.id}`);
}

export async function createMission(_prev: MissionFormState, formData: FormData): Promise<MissionFormState> {
  // owner_id vient de la base (default auth.uid()) ; la RLS refuse tout autre propriétaire.
  return save(readValues(formData), async (supabase, value) => {
    const { data, error } = await supabase.from("missions").insert(value).select("id").single();
    return error ? { outcome: "error" } : { outcome: "saved", id: data.id };
  });
}

/** Le client d'une mission ne change pas : `client_id` du formulaire (champ caché) est ignoré au profit de celui de la mission. */
export async function updateMission(id: string, _prev: MissionFormState, formData: FormData): Promise<MissionFormState> {
  return save(readValues(formData), async (supabase, value) => {
    if (!isUuid(id)) return { outcome: "not-found" };
    const { client_id: _unchanged, ...changes } = value;
    void _unchanged;
    const { data, error } = await supabase.from("missions").update(changes).eq("id", id).select("id");
    if (error) return { outcome: "error" };
    return data?.length ? { outcome: "saved", id } : { outcome: "not-found" };
  });
}

export async function deleteMission(id: string): Promise<DeleteMissionState> {
  let clientId: string | null = null;
  const result = await withSession(async (supabase): Promise<WriteOutcome> => {
    if (!isUuid(id)) return "not-found";
    const { data, error } = await supabase.from("missions").delete().eq("id", id).select("id, client_id");
    if (error) return "error";
    clientId = data?.[0]?.client_id ?? null;
    return data?.length ? "saved" : "not-found";
  });

  if (result.status === "signed-out") redirect("/auth/login");
  if (result.status === "failed" || result.value === "error") return { message: "Suppression impossible. La mission est conservée. Réessaie." };
  if (result.value === "not-found") return { message: NOT_FOUND };

  revalidatePath("/missions");
  if (clientId) revalidatePath(`/clients/${clientId}`);
  redirect("/missions");
}
