import "server-only";

import type { MissionStatus } from "@/lib/domain/missions";
import { createClient } from "@/lib/supabase/server";

export type MissionRecord = {
  id: string;
  client_id: string;
  /** Fiche liée (nom), pour la liste et la vue. */
  client: { name: string } | null;
  title: string;
  status: MissionStatus;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  updated_at: string;
};

const COLUMNS = "id, client_id, client:clients(name), title, status, start_date, end_date, created_at, updated_at";

/** Toutes mes missions, de la plus récente à la plus ancienne (la RLS limite aux miennes) ; le filtre et le tri sont dans `viewMissions`. */
export async function listAllMissions(): Promise<MissionRecord[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("missions").select(COLUMNS).order("created_at", { ascending: false });
  if (error) throw new Error("Impossible de charger les missions.");
  return data as unknown as MissionRecord[];
}

/** Les missions d'une de mes fiches, de la plus récente à la plus ancienne. */
export async function listMissionsForClient(clientId: string): Promise<MissionRecord[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("missions").select(COLUMNS).eq("client_id", clientId).order("created_at", { ascending: false });
  if (error) throw new Error("Impossible de charger les missions de la fiche.");
  return data as unknown as MissionRecord[];
}

/** Une de mes missions, ou null si l'identifiant est inconnu ou appartient à un autre compte. */
export async function getMission(id: string): Promise<MissionRecord | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("missions").select(COLUMNS).eq("id", id).maybeSingle();
  if (error) throw new Error("Impossible de charger la mission.");
  return data as unknown as MissionRecord | null;
}

/** Combien de missions a une de mes fiches (la suppression de la fiche est refusée tant qu'il y en a). */
export async function countMissionsForClient(clientId: string): Promise<number> {
  const supabase = await createClient();
  const { count, error } = await supabase.from("missions").select("id", { count: "exact", head: true }).eq("client_id", clientId);
  if (error) throw new Error("Impossible de compter les missions de la fiche.");
  return count ?? 0;
}
