import type { Db } from "../supabase/server.ts";

/** Mes sprints « en cours » avec leur mission, leurs stories et leurs tâches : de quoi calculer la règle 7 et les tâches du sprint (cockpit). `done_at` d'une tâche = quand elle a été faite (posé par la base : un renommage ne le change pas ; nul si non faite). Reçoit le client : testé en isolation. */
export async function listActiveSprintWork(supabase: Db) {
  const { data, error } = await supabase
    .from("sprints")
    .select("id, name, end_date, mission:missions(id, title, client:clients(name)), stories:user_stories(id, status, position, tasks(id, title, done, position, done_at))")
    .eq("status", "active");
  if (error) throw new Error("Impossible de charger les sprints en cours.");
  return data.flatMap(({ mission, ...sp }) => (mission ? [{ ...sp, mission: { id: mission.id, title: mission.title, client_name: mission.client?.name ?? null } }] : []));
}
