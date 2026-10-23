import "server-only";

import type { RuleRow } from "@/lib/domain/finance/rules";
import { createClient } from "@/lib/supabase/server";

const COLUMNS = "id, rule_key, activity_category, description, params, effective_from, effective_to, source, verified_on, revalidate_after, status, previous_version_id";

/** Toutes mes règles, la plus récente d'abord (la RLS limite aux miennes). */
export async function listRules(): Promise<RuleRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("regulatory_rules").select(COLUMNS).order("effective_from", { ascending: false });
  if (error) throw new Error("Impossible de charger les règles.");
  return data as RuleRow[];
}
