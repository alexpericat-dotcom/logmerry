
import { isPermutation } from "../domain/user-stories.ts";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Applique un nouvel ordre à une liste (stories d'une mission, tâches d'une story) : relit la liste, refuse si `ids` n'a pas exactement les mêmes éléments
 * (ajout ou suppression entre-temps : "changed"), puis renumérote 0, 1, 2… en n'écrivant que les positions qui changent.
 * ponytail : une mise à jour par ligne déplacée, non atomique ; quelques dizaines de lignes par liste, une procédure stockée au-delà.
 */
export async function renumber(
  supabase: SupabaseClient, // non typé exprès : le nom de table et de colonne varient (le typage par table refuse ces unions)
  table: "user_stories" | "tasks",
  parent: { column: "mission_id" | "story_id"; id: string },
  ids: string[],
  /** Liste visée à l'intérieur du parent : les stories d'un sprint (`id`) ou celles du backlog hors sprint (`null`). */
  scope?: { column: "sprint_id"; id: string | null },
): Promise<"saved" | "changed" | "error"> {
  let query = supabase.from(table).select("id, position").eq(parent.column, parent.id);
  if (scope) query = scope.id === null ? query.is(scope.column, null) : query.eq(scope.column, scope.id);
  const all = await query;
  if (all.error) return "error";
  // Aucune ligne : le parent n'existe pas (ou n'est pas à moi) ; il n'y a rien à ordonner.
  if (all.data.length === 0) return "changed";
  if (!isPermutation(all.data.map((r) => r.id as string), ids)) return "changed";
  const current = new Map(all.data.map((r) => [r.id as string, r.position as number]));
  for (const [rank, id] of ids.entries()) {
    if (current.get(id) === rank) continue;
    const { data, error } = await supabase.from(table).update({ position: rank }).eq("id", id).select("id");
    if (error) return "error";
    if (!data?.length) return "changed"; // supprimée en route
  }
  return "saved";
}
