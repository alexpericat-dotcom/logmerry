import "server-only";

import { quotaFromRpc, type QuotaResult } from "@/lib/domain/ai-quota";
import type { Db } from "@/lib/supabase/server";

/** À appeler juste avant chaque appel à Claude ou à Mistral (après les vérifications d'entrée) : compte l'appel pour le compte connecté, ou le refuse. Ne lève jamais. */
export async function consumeAiQuota(supabase: Db): Promise<QuotaResult> {
  try {
    return quotaFromRpc(await supabase.rpc("consume_ai_quota"));
  } catch {
    return "error";
  }
}
