"use server";

import { redirect } from "next/navigation";

import { retrieveChunks } from "@/lib/db/retrieval";
import { SENSE_QUERY_MAX } from "@/lib/domain/matching";
import { normalizeQuery } from "@/lib/domain/search";
import { createClient } from "@/lib/supabase/server";

/** `score` nul : extrait trouvé seulement par ses mots-clés (pas de similarité). */
export type SenseResult = { chunkId: string; noteId: string; title: string; content: string; score: number | null };
/** `question` : renvoyée pour que le champ la garde après la recherche. */
export type SenseState = { results: SenseResult[]; searched?: boolean; message?: string; question?: string };

const SEARCH_FAILED = "Recherche impossible pour le moment. Réessaie.";

/** « Chercher par sens » : mes extraits les plus pertinents, par sens et par mots-clés (`retrieveChunks`, sous RLS). */
export async function searchBySense(raw: string): Promise<SenseState> {
  const question = normalizeQuery(String(raw ?? ""), SENSE_QUERY_MAX);
  if (!question) return { results: [], question: "" };

  let signedOut = false;
  let state: SenseState = { results: [], message: SEARCH_FAILED, question };

  try {
    const supabase = await createClient();
    const { data: claims, error: authError } = await supabase.auth.getClaims();
    if (authError || !claims?.claims) {
      signedOut = true;
    } else {
      const chunks = await retrieveChunks(supabase, question);
      state = {
        searched: true,
        question,
        results: chunks.map((c) => ({ chunkId: c.id, noteId: c.noteId, title: c.title, content: c.content, score: c.score })),
      };
    }
  } catch (e) {
    // Journal sans question ni contenu de note ni clé : seulement la nature de l'échec.
    console.error("Recherche par sens impossible :", e instanceof Error ? e.message : "erreur inconnue");
  }

  // redirect() lève une exception : à appeler hors du try.
  if (signedOut) redirect("/auth/login");
  return state;
}
