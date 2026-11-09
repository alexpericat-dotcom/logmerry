"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { indexNote } from "@/app/(app)/notes/indexing";
import { consumeAiQuota } from "@/lib/ai/quota";
import { quotaMessage, type QuotaResult } from "@/lib/domain/ai-quota";
import { pickToIndex } from "@/lib/domain/index-batch";
import { createClient } from "@/lib/supabase/server";

export type IndexAllState = { message?: string; indexed?: number; failed?: number; remaining?: number };

const FAILED = "Indexation impossible pour le moment. Réessaie.";

/** Indexe mes notes qui ne sont pas encore « indexées » (25 au plus par clic) ; sans session : connexion. */
export async function indexAllNotes(): Promise<IndexAllState> {
  let signedOut = false;
  let state: IndexAllState = { message: FAILED };

  try {
    const supabase = await createClient();
    const { data: claims, error: authError } = await supabase.auth.getClaims();
    if (authError || !claims?.claims) {
      signedOut = true;
    } else {
      const { data, error } = await supabase
        .from("notes")
        .select("id, title, body, index_status")
        .neq("index_status", "indexed")
        // « en attente » avant « en échec » (ordre de l'enum), pour qu'un échec persistant ne bloque pas la file.
        // ponytail: lit tous les textes à indexer pour n'en garder que 25 ; limit() + compte si l'arriéré devient grand.
        .order("index_status")
        .order("created_at");
      if (error) console.error("Indexation en lot : lecture des notes impossible");
      else {
        const { todo, remaining } = pickToIndex(data);
        let indexed = 0;
        let failed = 0;
        let refused: QuotaResult = "ok";
        let done = 0;
        for (const note of todo) {
          // Un appel au fournisseur par note : une unité de plafond par note, et on s'arrête au premier refus (les notes restantes restent « en attente »).
          refused = await consumeAiQuota(supabase);
          if (refused !== "ok") break;
          // Une par une : ménage le fournisseur et garde l'ordre ; `indexNote` ne lève jamais.
          if ((await indexNote(supabase, note.id, note)) === "indexed") indexed++;
          else failed++;
          done++;
        }
        state = { indexed, failed, remaining: remaining + (todo.length - done), ...(refused !== "ok" && { message: quotaMessage(refused) }) };
        revalidatePath("/parametres");
        revalidatePath("/notes");
      }
    }
  } catch (e) {
    // Journal sans contenu de note ni clé : seulement la nature de l'échec.
    console.error("Indexation en lot impossible :", e instanceof Error ? e.message : "erreur inconnue");
    state = { message: FAILED };
  }

  // redirect() lève une exception : à appeler hors du try.
  if (signedOut) redirect("/auth/login");
  return state;
}
