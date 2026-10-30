import "server-only";

import { buildCards, type PublicCard, type PublicImage, type PublicRealisation } from "@/lib/domain/portfolio";
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
  // Les colonnes d'une vue sont nullables dans les types ; celles-ci ne le sont jamais en pratique : on écarte une ligne incomplète plutôt que de l'afficher à moitié.
  const complete = items.data.filter((r): r is typeof r & PublicRealisation => !!(r.id && r.title && r.description && r.origin && r.client_label)) as PublicRealisation[];
  const pictures = images.data.filter((i): i is typeof i & PublicImage => !!(i.id && i.realisation_id && i.path && i.alt)) as PublicImage[];
  return buildCards(
    complete.map((r) => ({ ...r, stack: r.stack ?? [] })),
    pictures,
  );
}
