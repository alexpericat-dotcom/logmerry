"use server";

import { redirect } from "next/navigation";

import { consumeAiQuota } from "@/lib/ai/quota";
import { quotaMessage } from "@/lib/domain/ai-quota";
import { summarizeWithClaude } from "@/lib/ai/summary";
import { isUuid } from "@/lib/domain/notes";
import { SummaryRejected } from "@/lib/domain/summary";
import { createClient } from "@/lib/supabase/server";

export type SummaryState = { ok: true; summary: string } | { ok: false; error: string };

const FAILED = "Résumé impossible pour le moment. Réessaie.";
const REJECTED = "Le résumé n'a pas pu être vérifié par rapport à la note, il n'est pas affiché. Réessaie.";

/**
 * Résumé généré d'une de mes notes (version enregistrée) : lecture sous RLS, donc jamais la note d'un autre compte. Le résumé n'est
 * enregistré nulle part. Sans session : connexion.
 */
export async function summarizeNote(id: string): Promise<SummaryState> {
  let signedOut = false;
  let state: SummaryState = { ok: false, error: FAILED };

  try {
    const supabase = await createClient();
    const { data: claims, error: authError } = await supabase.auth.getClaims();
    if (authError || !claims?.claims) {
      signedOut = true;
    } else if (!isUuid(String(id))) {
      state = { ok: false, error: "Cette note n'existe plus." };
    } else {
      const { data, error } = await supabase.from("notes").select("title, body").eq("id", id).maybeSingle();
      if (error) throw new Error(`lecture ${error.code ?? ""}`.trim());
      if (!data) state = { ok: false, error: "Cette note n'existe plus." };
      else if (!data.body.trim()) state = { ok: false, error: "Cette note n'a pas de texte à résumer." };
      else {
        const quota = await consumeAiQuota(supabase);
        state = quota !== "ok" ? { ok: false, error: quotaMessage(quota) } : { ok: true, summary: await summarizeWithClaude(data) };
      }
    }
  } catch (e) {
    // Journal sans contenu de note ni clé : seulement la nature de l'échec.
    console.error(e instanceof SummaryRejected ? "Résumé rejeté :" : "Résumé impossible :", e instanceof Error ? e.message : "erreur inconnue");
    state = { ok: false, error: e instanceof SummaryRejected ? REJECTED : FAILED };
  }

  // redirect() lève une exception : à appeler hors du try.
  if (signedOut) redirect("/auth/login");
  return state;
}
