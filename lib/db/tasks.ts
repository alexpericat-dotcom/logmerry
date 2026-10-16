import "server-only";

import { createClient } from "@/lib/supabase/server";

export type TaskRecord = { id: string; story_id: string; title: string; done: boolean; position: number };

/** Les tâches des stories données (la RLS limite aux miennes), dans l'ordre de chaque story. */
export async function listTasks(storyIds: string[]): Promise<TaskRecord[]> {
  if (storyIds.length === 0) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tasks")
    .select("id, story_id, title, done, position")
    .in("story_id", storyIds)
    .order("position", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw new Error("Impossible de charger les tâches.");
  return data as TaskRecord[];
}
