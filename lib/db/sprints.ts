import "server-only";

import type { SprintStatus } from "@/lib/domain/sprints";
import { createClient } from "@/lib/supabase/server";

export type SprintRecord = { id: string; mission_id: string; name: string; goal: string | null; start_date: string; end_date: string; status: SprintStatus };

/** Les sprints d'une de mes missions, du plus ancien début au plus récent (la RLS limite aux miens). */
export async function listSprints(missionId: string): Promise<SprintRecord[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("sprints").select("id, mission_id, name, goal, start_date, end_date, status").eq("mission_id", missionId).order("start_date", { ascending: true }).order("created_at", { ascending: true });
  if (error) throw new Error("Impossible de charger les sprints.");
  return data as SprintRecord[];
}

/** Mes sprints « en cours » avec leur mission, leurs stories et leurs tâches : de quoi calculer la règle 7 et les tâches du sprint (cockpit). `updated_at` d'une tâche faite = quand elle l'a été. */
export async function listActiveSprintWork() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sprints")
    .select("id, name, end_date, mission:missions(id, title, client:clients(name)), stories:user_stories(id, status, position, tasks(id, title, done, position, updated_at))")
    .eq("status", "active");
  if (error) throw new Error("Impossible de charger les sprints en cours.");
  return data.flatMap(({ mission, ...sp }) => (mission ? [{ ...sp, mission: { id: mission.id, title: mission.title, client_name: mission.client?.name ?? null } }] : []));
}
