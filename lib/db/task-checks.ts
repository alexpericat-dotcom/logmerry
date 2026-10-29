import type { Db } from "../supabase/server.ts";
import { checkKey, type CheckTarget } from "../domain/cockpit/today.ts";

/**
 * Cocher (`checked: true`) ou décocher une tâche du cockpit (règles 2 à 8) pour le jour `day` : LA seule écriture de cette coche,
 * partagée par l'action et par le test d'isolation. La facture, le profil et les règles ne sont jamais modifiés.
 * Idempotente : l'unicité (propriétaire, règle, source, plafond, seuil, jour) ignore un doublon, décocher une coche absente ne fait rien.
 */
export async function setTaskChecked(supabase: Db, target: CheckTarget, day: string, checked: boolean): Promise<"saved" | "error"> {
  let error;
  if (checked) {
    ({ error } = await supabase.from("task_checks").upsert(
      { rule_no: target.rule, source_id: target.sourceId ?? null, ceiling_key: target.ceilingKey ?? null, threshold: target.threshold ?? null, period_start: day },
      { onConflict: "owner_id,rule_no,source_id,ceiling_key,threshold,period_start", ignoreDuplicates: true },
    ));
  } else {
    let q = supabase.from("task_checks").delete().eq("rule_no", target.rule).eq("period_start", day);
    q = target.sourceId ? q.eq("source_id", target.sourceId) : q.is("source_id", null);
    q = target.ceilingKey ? q.eq("ceiling_key", target.ceilingKey) : q.is("ceiling_key", null);
    q = target.threshold ? q.eq("threshold", target.threshold) : q.is("threshold", null);
    ({ error } = await q);
  }
  return error ? "error" : "saved";
}

/** Clés (`checkKey`) des tâches cochées pour le jour `day` : une coche d'un autre jour ne compte pas. */
export async function listTaskChecks(supabase: Db, day: string): Promise<Set<string>> {
  const { data, error } = await supabase.from("task_checks").select("rule_no, source_id, ceiling_key, threshold").eq("period_start", day);
  if (error) throw new Error("Impossible de charger les tâches du jour.");
  return new Set(data.map((c) => checkKey(c.rule_no, c.source_id, c.ceiling_key, c.threshold)));
}
