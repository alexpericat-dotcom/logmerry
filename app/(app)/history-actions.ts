"use server";

import { redirect } from "next/navigation";

import { clearHistory } from "@/lib/db/history";
import { createClient } from "@/lib/supabase/server";

export type PurgeResult = { ok: true } | { ok: false; error: string };

const PURGE_FAILED = "Suppression impossible pour le moment. Réessaie.";

/** « Vider la conversation » : supprime tout mon historique de l'assistant, définitivement. */
export async function purgeHistory(): Promise<PurgeResult> {
  let signedOut = false;
  let result: PurgeResult = { ok: false, error: PURGE_FAILED };
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getClaims();
    if (error || !data?.claims) {
      signedOut = true;
    } else {
      await clearHistory(supabase);
      result = { ok: true };
    }
  } catch (e) {
    console.error("Purge de l'historique impossible :", e instanceof Error ? e.message : "erreur inconnue");
  }
  if (signedOut) redirect("/auth/login");
  return result;
}
