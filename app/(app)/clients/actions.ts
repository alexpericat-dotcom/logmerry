"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { withSession } from "@/lib/supabase/with-session";
import { validateClientInput, type ClientErrors, type ClientValues } from "@/lib/domain/clients";
import { missionsRefusal } from "@/lib/domain/missions";
import { isUuid } from "@/lib/domain/notes";

export type ClientFormState = {
  errors?: ClientErrors;
  message?: string;
  values?: { name: string; status: string; origin: string };
};
export type DeleteClientState = { message?: string };

const SAVE_FAILED = "Enregistrement impossible. Réessaie.";
const NOT_FOUND = "Cette fiche n'existe plus.";


const readValues = (formData: FormData) => ({
  name: String(formData.get("name") ?? ""),
  status: String(formData.get("status") ?? ""),
  origin: String(formData.get("origin") ?? ""),
});

type WriteOutcome = "saved" | "not-found" | "error";

/** Session, validation, écriture ; `write` dit si la base a enregistré, si la fiche n'existe plus ou si elle a échoué. */
async function save(
  values: { name: string; status: string; origin: string },
  write: (supabase: SupabaseClient, value: ClientValues) => Promise<WriteOutcome>,
  /** Page où revenir après l'enregistrement : la liste après une création, la fiche après une modification. */
  target = "/clients",
): Promise<ClientFormState> {
  const result = await withSession(async (supabase) => {
    const checked = validateClientInput(values);
    if (!checked.ok) return { errors: checked.errors };
    return { outcome: await write(supabase, checked.value) };
  });

  // redirect() lève une exception : à appeler hors du try.
  if (result.status === "signed-out") redirect("/auth/login");
  if (result.status === "failed") return { message: SAVE_FAILED, values };
  if (result.value.errors) return { errors: result.value.errors, values };
  if (result.value.outcome === "not-found") return { message: NOT_FOUND, values };
  if (result.value.outcome !== "saved") return { message: SAVE_FAILED, values };

  revalidatePath("/clients");
  revalidatePath(target);
  redirect(target);
}

export async function createClientRecord(_prev: ClientFormState, formData: FormData): Promise<ClientFormState> {
  // owner_id vient de la base (default auth.uid()) ; la RLS refuse tout autre propriétaire.
  return save(readValues(formData), async (supabase, value) => {
    const { error } = await supabase.from("clients").insert(value);
    return error ? "error" : "saved";
  });
}

export async function updateClientRecord(id: string, _prev: ClientFormState, formData: FormData): Promise<ClientFormState> {
  return save(readValues(formData), async (supabase, value) => {
    if (!isUuid(id)) return "not-found";
    const { data, error } = await supabase.from("clients").update(value).eq("id", id).select("id");
    if (error) return "error";
    return data?.length ? "saved" : "not-found";
  }, `/clients/${id}`);
}

export async function deleteClientRecord(id: string): Promise<DeleteClientState> {
  let missions = 0;
  const result = await withSession(async (supabase): Promise<WriteOutcome | "has-missions"> => {
    if (!isUuid(id)) return "not-found";
    const { data, error } = await supabase.from("clients").delete().eq("id", id).select("id");
    // 23503 : la base refuse (clé étrangère `on delete restrict`) tant que la fiche a des missions.
    if (error?.code === "23503") {
      const { count } = await supabase.from("missions").select("id", { count: "exact", head: true }).eq("client_id", id);
      missions = count ?? 0;
      // Un autre motif de clé étrangère, ou un compte illisible : pas de faux « a des missions ».
      return missions > 0 ? "has-missions" : "error";
    }
    if (error) return "error";
    return data?.length ? "saved" : "not-found";
  });

  if (result.status === "signed-out") redirect("/auth/login");
  if (result.status === "failed" || result.value === "error") return { message: "Suppression impossible. La fiche est conservée. Réessaie." };
  if (result.value === "has-missions") return { message: missionsRefusal(missions) };
  if (result.value === "not-found") return { message: NOT_FOUND };

  revalidatePath("/clients");
  redirect("/clients");
}

export type PromoteState = { message?: string };

/** « Passer en client » : change le statut de ma fiche ; les contacts (et tout le reste) ne bougent pas. */
export async function promoteToClient(id: string): Promise<PromoteState> {
  const result = await withSession(async (supabase): Promise<WriteOutcome> => {
    if (!isUuid(id)) return "not-found";
    const { data, error } = await supabase.from("clients").update({ status: "client" }).eq("id", id).select("id");
    if (error) return "error";
    return data?.length ? "saved" : "not-found";
  });

  if (result.status === "signed-out") redirect("/auth/login");
  if (result.status === "failed" || result.value === "error") return { message: "Changement impossible pour le moment. Réessaie." };
  if (result.value === "not-found") return { message: NOT_FOUND };

  revalidatePath("/clients");
  revalidatePath(`/clients/${id}`);
  return {};
}
