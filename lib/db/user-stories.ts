import "server-only";

import type { StoryStatus } from "@/lib/domain/user-stories";
import { createClient } from "@/lib/supabase/server";

export type StoryRecord = {
  id: string;
  mission_id: string;
  title: string;
  role: string | null;
  benefit: string | null;
  acceptance_criteria: string | null;
  points: number | null;
  status: StoryStatus;
  position: number;
};

const COLUMNS = "id, mission_id, title, role, benefit, acceptance_criteria, points, status, position";

/** Le backlog d'une de mes missions, dans l'ordre de priorité (la RLS limite aux miens). */
export async function listStories(missionId: string): Promise<StoryRecord[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("user_stories").select(COLUMNS).eq("mission_id", missionId).order("position", { ascending: true }).order("created_at", { ascending: true });
  if (error) throw new Error("Impossible de charger le backlog.");
  return data as StoryRecord[];
}

/** Stories terminées et totales de mes missions (toutes, ou celles de `missionIds`), en une requête : { identifiant de mission : { done, total } }. */
export async function storyProgressByMission(missionIds?: string[]): Promise<Record<string, { done: number; total: number }>> {
  if (missionIds && missionIds.length === 0) return {};
  const supabase = await createClient();
  let query = supabase.from("user_stories").select("mission_id, status");
  if (missionIds) query = query.in("mission_id", missionIds);
  const { data, error } = await query;
  if (error) throw new Error("Impossible de charger l'avancement des missions.");
  const out: Record<string, { done: number; total: number }> = {};
  for (const row of data) {
    const p = (out[row.mission_id] ??= { done: 0, total: 0 });
    p.total += 1;
    if (row.status === "done") p.done += 1;
  }
  return out;
}
