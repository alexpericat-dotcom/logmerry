import "server-only";

import { toPublicCards, type PublicCard } from "@/lib/domain/portfolio";
import { createClient } from "@/lib/supabase/server";

/**
 * Les réalisations publiées avec accord, lues UNIQUEMENT dans les deux vues publiques (AD-10) : aucune table, aucune donnée privée.
 * Fonctionne sans connexion (rôle `anon`) comme connecté.
 */
// APERÇU TEMPORAIRE (branche preview/realisation-status, jamais fusionnée) : la migration du statut n'est pas encore appliquée, on montre donc la page avec les deux
// réalisations connues, sans toucher à la base. Le statut d'Atelier Nova est une PROPOSITION (à classer par Alex).
export async function listPublicCards(): Promise<PublicCard[]> {
  return toPublicCards(
    [
      { id: "e1c2f0a4-5b6d-4c3e-9a71-0d4b2f6a8c11", title: "Plateforme de gestion des demandes clients, dossier de cadrage complet", description: "Un espace de pilotage Notion en huit volets (contexte, besoins et backlog, veille des plateformes, architecture, UX et tests, business case, planning, sécurité et conformité), avec tableau de bord et espace client.", origin: "training", client_label: "Secteur : Service client", result_figure: "Dossier de cadrage complet, testé sur maquettes, prêt pour une phase de développement. Non développé.", link_url: "https://knotty-reaction-86f.notion.site/Projet-UMARIS-39167eb89ef68099b498ce56f5f958e9", stack: ["Notion", "Weweb", "Supabase", "Mistral AI", "Brevo"], published_at: "2026-11-05T10:00:00Z", status: "exercice_formation", problem: "Les demandes arrivent dispersées (e-mails, formulaires, messages), ce qui cause perte d'information, manque de visibilité sur l'avancement et priorisation difficile.", tests: "10 testeurs (5 clients, 5 agents) sur maquettes basse fidélité. Ergonomie moyenne 3,9/5, bénéfice perçu ≥ 4/5 pour 8 testeurs sur 10. Quatre ajustements décidés, dont une correction manuelle du score d'urgence calculé par l'IA.", stack_is_recommended: true },
      { id: "ca201ea8-3c1d-4c3f-9a7c-dbada6185d10", title: "Atelier Nova : landing page de lancement d'une capsule", description: "Landing page de lancement d'une capsule.", origin: "training", client_label: "Atelier Nova", result_figure: null, link_url: "https://ateliernovav3.lovable.app/", stack: ["Lovable", "Landing page", "IA générative"], published_at: "2026-10-30T10:00:00Z", status: "exercice_formation", problem: null, tests: null, stack_is_recommended: false },
    ],
    [],
  );
}

export async function listPublicCardsFromDatabase(): Promise<PublicCard[]> {
  const supabase = await createClient();
  const [items, images] = await Promise.all([
    supabase.from("public_realisations").select("id, title, description, origin, client_label, result_figure, link_url, stack, published_at, status, problem, tests, stack_is_recommended").order("published_at", { ascending: false }).order("id"),
    supabase.from("public_realisation_images").select("id, realisation_id, path, alt, created_at").order("created_at").order("id"),
  ]);
  if (items.error || images.error) throw new Error("Impossible de charger le portfolio.");
  return toPublicCards(items.data, images.data);
}
