import type { Db } from "../supabase/server.ts";

/** Mes sprints « en cours » avec leur mission, leurs stories et leurs tâches : de quoi calculer la règle 7 et les tâches du sprint (cockpit). `updated_at` d'une tâche faite = quand elle l'a été (proxy : toute modification d'une tâche la fait bouger). Reçoit le client : testé en isolation. */
export async function listActiveSprintWork(supabase: Db) {
  const { data, error } = await supabase
    .from("sprints")
    .select("id, name, end_date, mission:missions(id, title, client:clients(name)), stories:user_stories(id, status, position, tasks(id, title, done, position, updated_at))")
    .eq("status", "active");
  if (error) throw new Error("Impossible de charger les sprints en cours.");
  return data.flatMap(({ mission, ...sp }) => (mission ? [{ ...sp, mission: { id: mission.id, title: mission.title, client_name: mission.client?.name ?? null } }] : []));
}
