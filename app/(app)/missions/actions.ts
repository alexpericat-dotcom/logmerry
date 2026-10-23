"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { validateMissionInput, type MissionErrors, type MissionValues } from "@/lib/domain/missions";
import { isUuid } from "@/lib/domain/notes";
import { MISSION_QUOTE_REFUSAL } from "@/lib/domain/quotes";
import { withSession } from "@/lib/supabase/with-session";
import type { Db } from "@/lib/supabase/server";

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
type Written = { outcome: WriteOutcome; id?: string; clientId?: string };
type SaveResult = { errors: MissionErrors } | Written;

/**
 * Session, validation, écriture. `clientOf` (modification) donne le client réel de la mission : le champ du formulaire est alors ignoré,
 * il ne peut ni faire échouer l'enregistrement ni désigner la mauvaise fiche. `write` dit ce qui a été enregistré, ou pourquoi pas.
 */
async function save(
  values: MissionFormValues,
  write: (supabase: Db, value: MissionValues) => Promise<Written>,
  clientOf?: (supabase: Db) => Promise<string | null>,
): Promise<MissionFormState> {
  const result = await withSession(async (supabase): Promise<SaveResult> => {
    let form = values;
    if (clientOf) {
      const clientId = await clientOf(supabase);
      if (!clientId) return { outcome: "not-found" };
      form = { ...values, client_id: clientId };
    }
    const checked = validateMissionInput(form);
    if (!checked.ok) return { errors: checked.errors };
    // La clé étrangère contourne la RLS, mais la policy refuse une fiche étrangère ; on distingue « fiche disparue » d'une erreur de base.
    const { data, error } = await supabase.from("clients").select("id").eq("id", checked.value.client_id).maybeSingle();
    if (error) return { outcome: "error" };
    if (!data) return { outcome: "client-gone" };
    return { ...(await write(supabase, checked.value)), clientId: checked.value.client_id };
  });

  // redirect() lève une exception : à appeler hors du try.
  if (result.status === "signed-out") redirect("/auth/login");
  if (result.status === "failed") return { message: SAVE_FAILED, values };
  const r = result.value;
  if ("errors" in r) return { errors: r.errors, values };
  if (r.outcome === "client-gone") return { message: CLIENT_GONE, values };
  if (r.outcome === "not-found") return { message: NOT_FOUND, values };
  if (r.outcome !== "saved" || !r.id) return { message: SAVE_FAILED, values };

  revalidatePath("/missions");
  revalidatePath(`/missions/${r.id}`);
  revalidatePath(`/missions/${r.id}/modifier`);
  if (r.clientId) revalidatePath(`/clients/${r.clientId}`);
  redirect(`/missions/${r.id}`);
}

export async function createMission(_prev: MissionFormState, formData: FormData): Promise<MissionFormState> {
  // owner_id vient de la base (default auth.uid()) ; la RLS refuse tout autre propriétaire.
  return save(readValues(formData), async (supabase, value) => {
    const { data, error } = await supabase.from("missions").insert(value).select("id").single();
    return error ? { outcome: "error" } : { outcome: "saved", id: data.id };
  });
}

/** Le client d'une mission ne change pas : on lit celui de la mission, le champ caché du formulaire est ignoré. */
export async function updateMission(id: string, _prev: MissionFormState, formData: FormData): Promise<MissionFormState> {
  return save(
    readValues(formData),
    async (supabase, value) => {
      const { client_id: _unchanged, ...changes } = value;
      void _unchanged;
      const { data, error } = await supabase.from("missions").update(changes).eq("id", id).select("id");
      if (error) return { outcome: "error" };
      return data?.length ? { outcome: "saved", id } : { outcome: "not-found" };
    },
    async (supabase) => {
      if (!isUuid(id)) return null;
      const { data } = await supabase.from("missions").select("client_id").eq("id", id).maybeSingle();
      return (data?.client_id as string | undefined) ?? null;
    },
  );
}

export async function deleteMission(id: string): Promise<DeleteMissionState> {
  let clientId: string | null = null;
  const result = await withSession(async (supabase): Promise<WriteOutcome | "has-quote"> => {
    if (!isUuid(id)) return "not-found";
    const { data, error } = await supabase.from("missions").delete().eq("id", id).select("id, client_id");
    // 23503 : un devis est lié à cette mission (clé étrangère sans cascade) ; on le vérifie avant d'affirmer que c'est le motif.
    if (error?.code === "23503") {
      const { count } = await supabase.from("quotes").select("id", { count: "exact", head: true }).eq("mission_id", id);
      return (count ?? 0) > 0 ? "has-quote" : "error";
    }
    if (error) return "error";
    clientId = data?.[0]?.client_id ?? null;
    return data?.length ? "saved" : "not-found";
  });

  if (result.status === "signed-out") redirect("/auth/login");
  if (result.status === "ok" && result.value === "has-quote") return { message: MISSION_QUOTE_REFUSAL };
  if (result.status === "failed" || result.value === "error") return { message: "Suppression impossible. La mission est conservée. Réessaie." };

  // Déjà supprimée (autre onglet, double clic) : l'état voulu est atteint, on revient à la liste plutôt que de rester sur une page morte.
  revalidatePath("/missions");
  revalidatePath(`/missions/${id}`);
  revalidatePath(`/missions/${id}/modifier`);
  if (clientId) revalidatePath(`/clients/${clientId}`);
  redirect("/missions");
}
