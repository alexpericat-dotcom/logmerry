"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { renumber } from "@/lib/db/renumber";
import { isUuid } from "@/lib/domain/notes";
import { validateTaskBatch, validateTaskTitle } from "@/lib/domain/tasks";
import { nextPosition, parseReorderIds } from "@/lib/domain/user-stories";
import { withSession } from "@/lib/supabase/with-session";
import type { Db } from "@/lib/supabase/server";

/** `gone` : la tâche ou sa story n'existe plus (supprimée ailleurs) ; l'écran se recharge. `error` : erreur de champ (titre). */
export type TaskActionState = { ok?: boolean; error?: string; message?: string; gone?: boolean };

const SAVE_FAILED = "Enregistrement impossible. Réessaie.";
const TASK_GONE = "Cette tâche n'existe plus.";
const STORY_GONE = "Cette user story n'existe plus.";

type Outcome = "saved" | "not-found" | "error" | "invalid";

/** Seule la page de la mission affiche les tâches. */
async function refresh(supabase: Db, storyId: string) {
  try {
    const { data } = await supabase.from("user_stories").select("mission_id").eq("id", storyId).maybeSingle();
    if (data?.mission_id) revalidatePath(`/missions/${data.mission_id}`);
  } catch {
    // La tâche est enregistrée : une lecture qui échoue ici ne doit pas faire croire à un échec.
  }
}

/** Exécute `write` sous session et traduit son issue en état d'action. */
async function run(write: (supabase: Db) => Promise<{ outcome: Outcome; storyId?: string; error?: string }>, gone: string, failed: string): Promise<TaskActionState> {
  const result = await withSession(async (supabase) => {
    const written = await write(supabase);
    if (written.outcome === "saved" && written.storyId) await refresh(supabase, written.storyId);
    return written;
  });
  if (result.status === "signed-out") redirect("/auth/login");
  if (result.status === "failed" || result.value.outcome === "error") return { message: failed };
  if (result.value.outcome === "invalid") return { error: result.value.error };
  if (result.value.outcome === "not-found") return { message: gone, gone: true };
  return { ok: true };
}

/** Ajoute une tâche à la dernière place d'une de mes stories (la RLS refuse une story qui n'est pas à moi). */
export async function addTask(storyId: string, title: string): Promise<TaskActionState> {
  return run(
    async (supabase) => {
      const checked = validateTaskTitle(title);
      if (!checked.ok) return { outcome: "invalid", error: checked.error };
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

/** Ajoute des tâches à la suite de celles d'une de mes stories, dans l'ordre donné, en une seule écriture (tout ou rien). Sert « Garder » et « Tout garder » des propositions de l'IA. */
export async function addTasks(storyId: string, titles: string[]): Promise<TaskActionState & { added?: number }> {
  const state = await run(
    async (supabase) => {
      const batch = validateTaskBatch(titles);
      if (!batch.ok) return { outcome: "invalid", error: batch.error };
      const values = batch.value;
      if (!isUuid(storyId)) return { outcome: "not-found" };
      const story = await supabase.from("user_stories").select("id").eq("id", storyId).maybeSingle();
      if (story.error) return { outcome: "error" };
      if (!story.data) return { outcome: "not-found" };
      const last = await supabase.from("tasks").select("position").eq("story_id", storyId).order("position", { ascending: false }).limit(1);
      if (last.error) return { outcome: "error" };
      const start = nextPosition(last.data.map((r) => r.position));
      const { error } = await supabase.from("tasks").insert(values.map((title, i) => ({ story_id: storyId, title, position: start + i })));
      return error ? { outcome: "error" } : { outcome: "saved", storyId };
    },
    STORY_GONE,
    SAVE_FAILED,
  );
  return state.ok ? { ...state, added: titles.length } : state;
}

export async function updateTask(id: string, title: string): Promise<TaskActionState> {
  return run(
    async (supabase) => {
      const checked = validateTaskTitle(title);
      if (!checked.ok) return { outcome: "invalid", error: checked.error };
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
      const order = parseReorderIds(ids);
      if (!isUuid(storyId) || !order) return { outcome: "not-found" };
      const done = await renumber(supabase, "tasks", { column: "story_id", id: storyId }, order);
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
