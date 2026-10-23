import type { Db } from "../supabase/server.ts";

/**
 * Marquer une échéance faite (`done: true`) ou la rouvrir (`done: false`) : LA seule écriture de cet état, partagée par les actions
 * et par le test d'isolation (pour tester la vraie requête, pas une copie).
 * Idempotente : une échéance déjà faite garde sa date de réalisation (`.is("done_at", null)`), une échéance déjà à faire reste telle quelle.
 * « gone » : l'échéance n'existe plus (ou n'est pas à moi : la RLS la rend invisible, jamais « saved »).
 */
export async function setDeadlineDone(supabase: Db, id: string, done: boolean): Promise<"saved" | "gone" | "error"> {
  const query = supabase.from("deadlines").update({ done_at: done ? new Date().toISOString() : null }).eq("id", id);
  const { data, error } = await (done ? query.is("done_at", null) : query.not("done_at", "is", null)).select("id");
  if (error) return "error";
  if (data?.length) return "saved";
  // Rien de modifié : soit déjà dans l'état voulu (atteint), soit disparue.
  const { data: row, error: readError } = await supabase.from("deadlines").select("id").eq("id", id).maybeSingle();
  if (readError) return "error";
  return row ? "saved" : "gone";
}
