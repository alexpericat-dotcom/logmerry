"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { setDeadlineDone } from "@/lib/db/deadline-state";
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
  revalidatePath("/aujourd-hui"); // 5.2 : le cockpit tirera ses tâches du calendrier
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

async function setDone(id: string, done: boolean): Promise<DeadlineActionState> {
  const result = await withSession(async (supabase) => (isUuid(id) ? setDeadlineDone(supabase, id, done) : "gone"));
  if (result.status === "signed-out") redirect("/auth/login");
  if (result.status === "failed" || result.value === "error") return { message: SAVE_FAILED };
  if (result.value === "gone") return { message: NOT_FOUND };
  refresh();
  return {};
}

/** LA seule action qui marque une échéance faite (le cockpit de la story 5.2 appellera celle-ci) : elle enregistre le moment de la coche, sans jamais l'écraser. */
export async function markDeadlineDone(id: string): Promise<DeadlineActionState> {
  return setDone(id, true);
}

/** Décocher : l'échéance redevient à faire (décision 3). */
export async function reopenDeadline(id: string): Promise<DeadlineActionState> {
  return setDone(id, false);
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
