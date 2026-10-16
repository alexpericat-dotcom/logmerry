import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Notes que l'IA peut lire pour une mission : parmi les identifiants cochés, seulement les miennes (la RLS), liées à la fiche de CETTE mission,
 * actives (pas les brouillons) et avec du texte. Un identifiant forgé, d'une autre fiche ou d'un autre compte, est ignoré. Même requête pour l'action
 * et pour l'essai réel (`tests/proposals-run.ts`) : un test qui l'appelle teste le vrai code.
 */
export async function notesForProposal(supabase: SupabaseClient, clientId: string, ids: string[]): Promise<{ id: string; title: string; body: string }[]> {
  if (ids.length === 0) return [];
  const found = await supabase.from("notes").select("id, title, body, created_at").in("id", ids).eq("client_id", clientId).eq("status", "active").order("created_at", { ascending: false });
  if (found.error) throw new Error(`notes ${found.error.code ?? ""}`.trim());
  return found.data.filter((n) => typeof n.body === "string" && n.body.trim()).map((n) => ({ id: n.id as string, title: n.title as string, body: n.body as string }));
}
