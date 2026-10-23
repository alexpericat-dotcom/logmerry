"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { setDeadlineDone } from "@/lib/db/deadline-state";
import { seriesDates, seriesHorizon, validateDeadlineInput, type DeadlineErrors, type DeadlineInput } from "@/lib/domain/deadlines";
import { isUuid } from "@/lib/domain/notes";
import { todayParis } from "@/lib/format";
import type { Database } from "@/lib/supabase/database.types";
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
  priority: text(formData, "priority"),
  recurrence: text(formData, "recurrence"),
});

function refresh() {
  revalidatePath("/calendrier");
  revalidatePath("/aujourd-hui"); // 5.2 : le cockpit tirera ses tâches du calendrier
}

export async function createDeadline(_prev: DeadlineFormState, formData: FormData): Promise<DeadlineFormState> {
  const values = readValues(formData);
  const today = todayParis();
  const checked = validateDeadlineInput(values, today);
  if (!checked.ok) return { errors: checked.errors, values };
  // Une série : la première occurrence et celles des douze mois suivants, toutes avec le même series_id (le jour visé est celui de la première date).
  const { recurrence, ...rest } = checked.value;
  let rows: Database["public"]["Tables"]["deadlines"]["Insert"][] = [rest];
  if (recurrence) {
    const series_id = crypto.randomUUID();
    const series_day = Number(rest.due_on.slice(8));
    rows = seriesDates(rest.due_on, recurrence, series_day, seriesHorizon(today)).map((due_on) => ({ ...rest, due_on, recurrence, series_id, series_day }));
  }
  // owner_id vient de la base (auth.uid()).
  const result = await withSession(async (supabase) => {
    const { error } = await supabase.from("deadlines").insert(rows);
    return error ? ({ kind: "error" } as const) : ({ kind: "saved" } as const);
  });
  if (result.status === "signed-out") redirect("/auth/login");
  if (result.status === "failed" || result.value.kind === "error") return { message: SAVE_FAILED, values };
  refresh();
  return { saved: true };
}

/**
 * Une échéance reste toujours modifiable (décision 3) ; changer sa date ne la rouvre pas (`done_at` n'est pas touché).
 * Story 5.1b : la récurrence ne change jamais après la création, et la date d'une occurrence de série est figée (sinon la grille la régénérerait).
 */
export async function updateDeadline(id: string, _prev: DeadlineFormState, formData: FormData): Promise<DeadlineFormState> {
  const values = readValues(formData);
  const result = await withSession(async (supabase) => {
    if (!isUuid(id)) return { kind: "gone" } as const;
    const { data: current, error: readError } = await supabase.from("deadlines").select("due_on, recurrence").eq("id", id).maybeSingle();
    if (readError) return { kind: "error" } as const;
    if (!current) return { kind: "gone" } as const;
    const inSeries = current.recurrence !== null;
    const checked = validateDeadlineInput({ ...values, recurrence: "", due_on: inSeries ? current.due_on : values.due_on }, todayParis());
    if (!checked.ok) return { kind: "invalid", errors: checked.errors } as const;
    const v = checked.value;
    const patch = { title: v.title, category: v.category, source: v.source, note: v.note, priority: v.priority };
    const { data, error } = await supabase.from("deadlines").update(inSeries ? patch : { ...patch, due_on: v.due_on }).eq("id", id).select("id");
    if (error) return { kind: "error" } as const;
    return data?.length ? ({ kind: "saved" } as const) : ({ kind: "gone" } as const);
  });
  if (result.status === "signed-out") redirect("/auth/login");
  if (result.status === "failed" || result.value.kind === "error") return { message: SAVE_FAILED, values };
  if (result.value.kind === "invalid") return { errors: result.value.errors, values };
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

/**
 * Toujours supprimable (décision 3). Une occurrence de série supprime TOUTE la série à faire (les occurrences faites restent, sans récurrence) :
 * sans cela la complétion à la lecture recréerait l'occurrence supprimée.
 */
export async function deleteDeadline(id: string): Promise<DeadlineActionState> {
  const result = await withSession(async (supabase) => {
    if (!isUuid(id)) return { kind: "gone" } as const;
    const { data: current, error: readError } = await supabase.from("deadlines").select("series_id, recurrence").eq("id", id).maybeSingle();
    if (readError) return { kind: "error" } as const;
    if (!current) return { kind: "gone" } as const;
    if (current.recurrence !== null && current.series_id) {
      const { error } = await supabase.rpc("delete_deadline_series", { p_series_id: current.series_id });
      if (error) return { kind: "error" } as const;
      // Une occurrence déjà faite reste après la série (détachée) : celle qu'on supprime part aussi.
      const { error: own } = await supabase.from("deadlines").delete().eq("id", id);
      return own ? ({ kind: "error" } as const) : ({ kind: "saved" } as const);
    }
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
