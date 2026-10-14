"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  validateContactInput,
  type ContactErrors,
  type ContactValues,
} from "@/lib/domain/contacts";
import { isUuid } from "@/lib/domain/notes";
import { withSession } from "@/lib/supabase/with-session";

export type ContactFormState = {
  ok?: boolean;
  errors?: ContactErrors;
  message?: string;
  values?: {
    name: string;
    job_title: string;
    email: string;
    phone: string;
    address: string;
  };
};
export type ContactDeleteState = { message?: string };

const SAVE_FAILED = "Enregistrement impossible. Réessaie.";

const readValues = (formData: FormData) => ({
  name: String(formData.get("name") ?? ""),
  job_title: String(formData.get("job_title") ?? ""),
  email: String(formData.get("email") ?? ""),
  phone: String(formData.get("phone") ?? ""),
  address: String(formData.get("address") ?? ""),
});

type WriteOutcome = "saved" | "not-found" | "error";
type WriteResult = { outcome: WriteOutcome; clientId?: string };

/** Session, validation, écriture ; `notFound` est le message quand la fiche ou le contact a disparu. */
async function save(
  values: ReturnType<typeof readValues>,
  notFound: string,
  write: (
    supabase: SupabaseClient,
    value: ContactValues,
  ) => Promise<WriteResult>,
): Promise<ContactFormState> {
  const result = await withSession(async (supabase) => {
    const checked = validateContactInput(values);
    if (!checked.ok) return { errors: checked.errors };
    return { written: await write(supabase, checked.value) };
  });

  if (result.status === "signed-out") redirect("/auth/login");
  if (result.status === "failed") return { message: SAVE_FAILED, values };
  if (result.value.errors) return { errors: result.value.errors, values };
  const written = result.value.written!;
  if (written.outcome === "not-found") return { message: notFound, values };
  if (written.outcome !== "saved") return { message: SAVE_FAILED, values };

  if (written.clientId) revalidatePath(`/clients/${written.clientId}`);
  return { ok: true };
}

/** Ajoute un contact à une de mes fiches (la RLS refuse une fiche qui n'est pas à moi). */
export async function addContact(
  clientId: string,
  _prev: ContactFormState,
  formData: FormData,
): Promise<ContactFormState> {
  return save(
    readValues(formData),
    "Cette fiche n'existe plus.",
    async (supabase, value) => {
      if (!isUuid(clientId)) return { outcome: "not-found" };
      const { data: parent, error: parentError } = await supabase
        .from("clients")
        .select("id")
        .eq("id", clientId)
        .maybeSingle();
      if (parentError) return { outcome: "error" };
      if (!parent) return { outcome: "not-found" };
      const { error } = await supabase
        .from("contacts")
        .insert({ ...value, client_id: clientId });
      return error ? { outcome: "error" } : { outcome: "saved", clientId };
    },
  );
}

export async function updateContact(
  id: string,
  _prev: ContactFormState,
  formData: FormData,
): Promise<ContactFormState> {
  return save(
    readValues(formData),
    "Ce contact n'existe plus.",
    async (supabase, value) => {
      if (!isUuid(id)) return { outcome: "not-found" };
      const { data, error } = await supabase
        .from("contacts")
        .update(value)
        .eq("id", id)
        .select("id, client_id");
      if (error) return { outcome: "error" };
      return data?.length
        ? { outcome: "saved", clientId: data[0].client_id as string }
        : { outcome: "not-found" };
    },
  );
}

export async function deleteContact(id: string): Promise<ContactDeleteState> {
  const result = await withSession(async (supabase): Promise<WriteResult> => {
    if (!isUuid(id)) return { outcome: "not-found" };
    const { data, error } = await supabase
      .from("contacts")
      .delete()
      .eq("id", id)
      .select("id, client_id");
    if (error) return { outcome: "error" };
    return data?.length
      ? { outcome: "saved", clientId: data[0].client_id as string }
      : { outcome: "not-found" };
  });

  if (result.status === "signed-out") redirect("/auth/login");
  if (result.status === "failed" || result.value.outcome === "error")
    return {
      message: "Suppression impossible. Le contact est conservé. Réessaie.",
    };
  if (result.value.outcome === "not-found")
    return { message: "Ce contact n'existe plus." };
  if (result.value.clientId)
    revalidatePath(`/clients/${result.value.clientId}`);
  return {};
}
