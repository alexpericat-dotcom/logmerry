import "server-only";

import { createClient } from "@/lib/supabase/server";

export type RealisationImage = { id: string; path: string; alt: string };

/** Les captures d'une de mes réalisations, dans l'ordre d'ajout (la RLS limite aux miennes). */
export async function listRealisationImages(realisationId: string): Promise<RealisationImage[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("realisation_images").select("id, path, alt").eq("realisation_id", realisationId).order("created_at").order("id");
  if (error) throw new Error("Impossible de charger les captures.");
  return data;
}
