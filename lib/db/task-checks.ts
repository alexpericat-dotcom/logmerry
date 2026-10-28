import type { Db } from "../supabase/server.ts";

/**
 * Cocher (`checked: true`) ou décocher la tâche « facture échue » (règle 2) pour le jour `day` : LA seule écriture de cette coche,
 * partagée par l'action et par le test d'isolation. La facture n'est jamais modifiée.
 * Idempotente : l'unicité (propriétaire, règle, source, jour) ignore un doublon, décocher une coche absente ne fait rien.
 */
export async function setInvoiceTaskChecked(supabase: Db, invoiceId: string, day: string, checked: boolean): Promise<"saved" | "error"> {
  const { error } = checked
    ? await supabase.from("task_checks").upsert({ rule_no: 2, source_id: invoiceId, period_start: day }, { onConflict: "owner_id,rule_no,source_id,period_start", ignoreDuplicates: true })
    : await supabase.from("task_checks").delete().eq("rule_no", 2).eq("source_id", invoiceId).eq("period_start", day);
  return error ? "error" : "saved";
}

/** Factures dont la tâche (règle 2) est cochée pour le jour `day` : une coche d'un autre jour ou d'une autre règle ne compte pas. */
export async function listInvoiceTaskChecks(supabase: Db, day: string): Promise<Set<string>> {
  const { data, error } = await supabase.from("task_checks").select("source_id").eq("rule_no", 2).eq("period_start", day);
  if (error) throw new Error("Impossible de charger les tâches du jour.");
  return new Set(data.map((c) => c.source_id));
}
