import "server-only";

import { toPublicCards, type PublicCard } from "@/lib/domain/portfolio";
import { createClient } from "@/lib/supabase/server";

/**
 * Les réalisations publiées avec accord, lues UNIQUEMENT dans les deux vues publiques (AD-10) : aucune table, aucune donnée privée.
 * Fonctionne sans connexion (rôle `anon`) comme connecté.
 */
export async function listPublicCards(): Promise<PublicCard[]> {
  const supabase = await createClient();
  const [items, images] = await Promise.all([
    supabase.from("public_realisations").select("id, title, description, origin, client_label, result_figure, link_url, stack, published_at").order("published_at", { ascending: false }).order("id"),
    supabase.from("public_realisation_images").select("id, realisation_id, path, alt, created_at").order("created_at").order("id"),
  ]);
  if (items.error || images.error) throw new Error("Impossible de charger le portfolio.");
  return toPublicCards(items.data, images.data);
}
