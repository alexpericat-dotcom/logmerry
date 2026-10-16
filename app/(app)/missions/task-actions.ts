"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { renumber } from "@/lib/db/renumber";
import { isUuid } from "@/lib/domain/notes";
import { validateTaskTitle } from "@/lib/domain/tasks";
import { nextPosition } from "@/lib/domain/user-stories";
import { withSession } from "@/lib/supabase/with-session";

/** `gone` : la tâche ou sa story n'existe plus (supprimée ailleurs) ; l'écran se recharge. `error` : erreur de champ (titre). */
export type TaskActionState = { ok?: boolean; error?: string; message?: string; gone?: boolean };

const SAVE_FAILED = "Enregistrement impossible. Réessaie.";
const TASK_GONE = "Cette tâche n'existe plus.";
const STORY_GONE = "Cette user story n'existe plus.";

type Outcome = "saved" | "not-found" | "error";

/** Seule la page de la mission affiche les tâches. */
async function refresh(supabase: SupabaseClient, storyId: string) {
  try {
    const { data } = await supabase.from("user_stories").select("mission_id").eq("id", storyId).maybeSingle();
    if (data?.mission_id) revalidatePath(`/missions/${data.mission_id}`);
  } catch {
    // La tâche est enregistrée : une lecture qui échoue ici ne doit pas faire croire à un échec.
  }
}

/** Exécute `write` sous session et traduit son issue en état d'action. */
async function run(write: (supabase: SupabaseClient) => Promise<{ outcome: Outcome; storyId?: string }>, gone: string, failed: string): Promise<TaskActionState> {
  const result = await withSession(async (supabase) => {
    const written = await write(supabase);
    if (written.outcome === "saved" && written.storyId) await refresh(supabase, written.storyId);
    return written.outcome;
  });
  if (result.status === "signed-out") redirect("/auth/login");
  if (result.status === "failed" || result.value === "error") return { message: failed };
  if (result.value === "not-found") return { message: gone, gone: true };
  return { ok: true };
}

/** Ajoute une tâche à la dernière place d'une de mes stories (la RLS refuse une story qui n'est pas à moi). */
export async function addTask(storyId: string, title: string): Promise<TaskActionState> {
  const checked = validateTaskTitle(title);
  if (!checked.ok) return { error: checked.error };
  return run(
    async (supabase) => {
      if (!isUuid(storyId)) return { outcome: "not-found" };
      const story = await supabase.from("user_stories").select("id").eq("id", storyId).maybeSingle();
      if (story.error) return { outcome: "error" };
      if (!story.data) return { outcome: "not-found" };
      const last = await supabase.from("tasks").select("position").eq("story_id", storyId).order("position", { ascending: false }).limit(1);
      if (last.error) return { outcome: "error" };
      const { error } = await supabase.from("tasks").insert({ story_id: storyId, title: checked.value, position: nextPosition(last.data.map((r) => r.position)) });
      return error ? { outcome: "error" } : { outcome: "saved", storyId };
    },
    STORY_GONE,
    SAVE_FAILED,
  );
}

export async function updateTask(id: string, title: string): Promise<TaskActionState> {
  const checked = validateTaskTitle(title);
  if (!checked.ok) return { error: checked.error };
  return run(
    async (supabase) => {
      if (!isUuid(id)) return { outcome: "not-found" };
      const { data, error } = await supabase.from("tasks").update({ title: checked.value }).eq("id", id).select("id, story_id");
      if (error) return { outcome: "error" };
      return data?.length ? { outcome: "saved", storyId: data[0].story_id } : { outcome: "not-found" };
    },
    TASK_GONE,
    SAVE_FAILED,
  );
}

/** Un clic sur la case : seule la coche change (le statut de la story n'est jamais touché). */
export async function setTaskDone(id: string, done: boolean): Promise<TaskActionState> {
  return run(
    async (supabase) => {
      if (!isUuid(id) || typeof done !== "boolean") return { outcome: "not-found" };
      const { data, error } = await supabase.from("tasks").update({ done }).eq("id", id).select("id, story_id");
      if (error) return { outcome: "error" };
      return data?.length ? { outcome: "saved", storyId: data[0].story_id } : { outcome: "not-found" };
    },
    TASK_GONE,
    "Changement impossible pour le moment. Réessaie.",
  );
}

/** Nouvel ordre des tâches d'une story après un glisser-déposer : `ids` est la liste complète, dans l'ordre voulu. */
export async function reorderTasks(storyId: string, ids: string[]): Promise<TaskActionState> {
  return run(
    async (supabase) => {
      if (!isUuid(storyId) || !Array.isArray(ids) || !ids.every(isUuid)) return { outcome: "not-found" };
      const done = await renumber(supabase, "tasks", { column: "story_id", id: storyId }, ids);
      await refresh(supabase, storyId); // même en cas d'échec ou de conflit : l'écran montre l'état réel
      return { outcome: done === "saved" ? "saved" : done === "changed" ? "not-found" : "error" };
    },
    "Les tâches ont changé entre-temps. Elles sont rechargées : recommence le déplacement.",
    "Déplacement impossible pour le moment. Réessaie.",
  );
}

export async function deleteTask(id: string): Promise<TaskActionState> {
  const result = await withSession(async (supabase): Promise<Outcome> => {
    if (!isUuid(id)) return "not-found";
    const { data, error } = await supabase.from("tasks").delete().eq("id", id).select("id, story_id");
    if (error) return "error";
    // Déjà supprimée (autre onglet, double clic) : l'état voulu est atteint.
    if (data?.length) await refresh(supabase, data[0].story_id);
    return "saved";
  });
  if (result.status === "signed-out") redirect("/auth/login");
  if (result.status === "failed" || result.value === "error") return { message: "Suppression impossible. La tâche est conservée. Réessaie." };
  return { ok: true };
}
