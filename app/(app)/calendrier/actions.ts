"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { validateDeadlineInput, type DeadlineErrors, type DeadlineInput } from "@/lib/domain/deadlines";
import { isUuid } from "@/lib/domain/notes";
import { withSession } from "@/lib/supabase/with-session";

export type DeadlineFormState = { errors?: DeadlineErrors; message?: string; values?: DeadlineInput; saved?: boolean };
export type DeadlineActionState = { message?: string };

const SAVE_FAILED = "Enregistrement impossible. Réessaie.";
const NOT_FOUND = "Cette échéance n'existe plus.";

const text = (formData: FormData, name: string) => String(formData.get(name) ?? "");
const readValues = (formData: FormData): DeadlineInput => ({
  title: text(formData, "title"),
  due_on: text(formData, "due_on"),
  category: text(formData, "category"),
  source: text(formData, "source"),
  note: text(formData, "note"),
});

function refresh() {
  revalidatePath("/calendrier");
  revalidatePath("/aujourd-hui"); // le cockpit tirera ses tâches du calendrier (story 5.2)
}

export async function createDeadline(_prev: DeadlineFormState, formData: FormData): Promise<DeadlineFormState> {
  const values = readValues(formData);
  const checked = validateDeadlineInput(values);
  if (!checked.ok) return { errors: checked.errors, values };
  // owner_id vient de la base (auth.uid()).
  const result = await withSession(async (supabase) => {
    const { error } = await supabase.from("deadlines").insert(checked.value);
    return error ? ({ kind: "error" } as const) : ({ kind: "saved" } as const);
  });
  if (result.status === "signed-out") redirect("/auth/login");
  if (result.status === "failed" || result.value.kind === "error") return { message: SAVE_FAILED, values };
  refresh();
  return { saved: true };
}

/** Une échéance reste toujours modifiable (décision 3) ; changer sa date ne la rouvre pas (`done_at` n'est pas touché). */
export async function updateDeadline(id: string, _prev: DeadlineFormState, formData: FormData): Promise<DeadlineFormState> {
  const values = readValues(formData);
  const checked = validateDeadlineInput(values);
  if (!checked.ok) return { errors: checked.errors, values };
  const result = await withSession(async (supabase) => {
    if (!isUuid(id)) return { kind: "gone" } as const;
    const { data, error } = await supabase.from("deadlines").update(checked.value).eq("id", id).select("id");
    if (error) return { kind: "error" } as const;
    return data?.length ? ({ kind: "saved" } as const) : ({ kind: "gone" } as const);
  });
  if (result.status === "signed-out") redirect("/auth/login");
  if (result.status === "failed" || result.value.kind === "error") return { message: SAVE_FAILED, values };
  if (result.value.kind === "gone") return { message: NOT_FOUND, values };
  refresh();
  return { saved: true };
}

/**
 * LA seule action qui marque une échéance faite (le cockpit de la story 5.2 appellera celle-ci). Elle enregistre le moment de la coche.
 * Idempotente : une échéance déjà faite garde sa date de réalisation (`.is("done_at", null)`), un double clic ou deux onglets n'écrasent rien.
 */
export async function markDeadlineDone(id: string): Promise<DeadlineActionState> {
  const result = await withSession(async (supabase) => {
    if (!isUuid(id)) return { kind: "gone" } as const;
    const { data, error } = await supabase.from("deadlines").update({ done_at: new Date().toISOString() }).eq("id", id).is("done_at", null).select("id");
    if (error) return { kind: "error" } as const;
    if (data?.length) return { kind: "saved" } as const;
    // Rien de modifié : soit déjà faite (l'état voulu est atteint), soit disparue.
    const { data: row, error: re } = await supabase.from("deadlines").select("id").eq("id", id).maybeSingle();
    if (re) return { kind: "error" } as const;
    return row ? ({ kind: "saved" } as const) : ({ kind: "gone" } as const);
  });
  if (result.status === "signed-out") redirect("/auth/login");
  if (result.status === "failed" || result.value.kind === "error") return { message: SAVE_FAILED };
  if (result.value.kind === "gone") return { message: NOT_FOUND };
  refresh();
  return {};
}

/** Décocher : l'échéance redevient à faire (décision 3). Idempotente. */
export async function reopenDeadline(id: string): Promise<DeadlineActionState> {
  const result = await withSession(async (supabase) => {
    if (!isUuid(id)) return { kind: "gone" } as const;
    const { data, error } = await supabase.from("deadlines").update({ done_at: null }).eq("id", id).not("done_at", "is", null).select("id");
    if (error) return { kind: "error" } as const;
    if (data?.length) return { kind: "saved" } as const;
    const { data: row, error: re } = await supabase.from("deadlines").select("id").eq("id", id).maybeSingle();
    if (re) return { kind: "error" } as const;
    return row ? ({ kind: "saved" } as const) : ({ kind: "gone" } as const);
  });
  if (result.status === "signed-out") redirect("/auth/login");
  if (result.status === "failed" || result.value.kind === "error") return { message: SAVE_FAILED };
  if (result.value.kind === "gone") return { message: NOT_FOUND };
  refresh();
  return {};
}

/** Toujours supprimable (décision 3) : aucune dépendance. */
export async function deleteDeadline(id: string): Promise<DeadlineActionState> {
  const result = await withSession(async (supabase) => {
    if (!isUuid(id)) return { kind: "gone" } as const;
    const { data, error } = await supabase.from("deadlines").delete().eq("id", id).select("id");
    if (error) return { kind: "error" } as const;
    return data?.length ? ({ kind: "saved" } as const) : ({ kind: "gone" } as const);
  });
  if (result.status === "signed-out") redirect("/auth/login");
  if (result.status === "failed" || result.value.kind === "error") return { message: "Suppression impossible. L'échéance est conservée. Réessaie." };
  if (result.value.kind === "gone") return { message: NOT_FOUND };
  refresh();
  return {};
}
