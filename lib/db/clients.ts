import "server-only";

import { CLIENT_SORT_COLUMNS, type ClientOrigin, type ClientStatus, type ClientView } from "@/lib/domain/clients";
import { createClient } from "@/lib/supabase/server";

export type ClientRecord = {
  id: string;
  name: string;
  status: ClientStatus;
  origin: ClientOrigin;
  created_at: string;
  updated_at: string;
};

const COLUMNS = "id, name, status, origin, created_at, updated_at";

/** Mes fiches filtrées et triées (la RLS limite aux miennes) et leur nombre total sans filtre. */
export async function listClients(view: ClientView): Promise<{ rows: ClientRecord[]; total: number }> {
  const supabase = await createClient();
  let query = supabase.from("clients").select(COLUMNS).order(CLIENT_SORT_COLUMNS[view.tri], { ascending: view.ordre === "asc" });
  if (view.tri !== "creee") query = query.order("created_at", { ascending: false }); // ordre stable entre deux fiches égales
  if (view.statut) query = query.eq("status", view.statut);
  if (view.origine) query = query.eq("origin", view.origine);
  const [list, count] = await Promise.all([query, supabase.from("clients").select("id", { count: "exact", head: true })]);
  if (list.error || count.error) throw new Error("Impossible de charger les fiches.");
  return { rows: list.data as ClientRecord[], total: count.count ?? 0 };
}

/** Une de mes fiches, ou null si l'identifiant est inconnu ou appartient à un autre compte. */
export async function getClientRecord(id: string): Promise<ClientRecord | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("clients").select(COLUMNS).eq("id", id).maybeSingle();
  if (error) throw new Error("Impossible de charger la fiche.");
  return data as ClientRecord | null;
}
