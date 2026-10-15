import "server-only";

import type { ClientOrigin, ClientStatus } from "@/lib/domain/clients";
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

/** Toutes mes fiches, de la plus récente à la plus ancienne (la RLS limite aux miennes) ; le filtre et le tri sont dans `viewClients`. */
export async function listAllClients(): Promise<ClientRecord[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("clients").select(COLUMNS).order("created_at", { ascending: false });
  if (error) throw new Error("Impossible de charger les fiches.");
  return data as ClientRecord[];
}

/** Une de mes fiches, ou null si l'identifiant est inconnu ou appartient à un autre compte. */
export async function getClientRecord(id: string): Promise<ClientRecord | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("clients").select(COLUMNS).eq("id", id).maybeSingle();
  if (error) throw new Error("Impossible de charger la fiche.");
  return data as ClientRecord | null;
}
