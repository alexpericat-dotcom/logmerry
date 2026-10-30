import "server-only";

import type { RealisationOrigin } from "@/lib/domain/realisations";
import { createClient } from "@/lib/supabase/server";

export type RealisationRecord = {
  id: string;
  title: string;
  description: string;
  origin: RealisationOrigin;
  client_name: string | null;
  client_sector: string | null;
  result_figure: string | null;
  link_url: string | null;
  stack: string[];
  client_consent: boolean;
  published: boolean;
  created_at: string;
  updated_at: string;
};

const COLUMNS = "id, title, description, origin, client_name, client_sector, result_figure, link_url, stack, client_consent, published, created_at, updated_at";

/** Mes réalisations, de la plus récente à la plus ancienne (la RLS limite aux miennes). */
export async function listRealisations(): Promise<RealisationRecord[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("realisations").select(COLUMNS).order("created_at", { ascending: false }).order("id");
  if (error) throw new Error("Impossible de charger les réalisations.");
  return data as RealisationRecord[];
}

/** Une de mes réalisations, ou null si l'identifiant est inconnu ou appartient à un autre compte. */
export async function getRealisation(id: string): Promise<RealisationRecord | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("realisations").select(COLUMNS).eq("id", id).maybeSingle();
  if (error) throw new Error("Impossible de charger la réalisation.");
  return data as RealisationRecord | null;
}
