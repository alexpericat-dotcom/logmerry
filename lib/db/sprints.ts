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
