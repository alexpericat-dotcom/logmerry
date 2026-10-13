"use server";

import { redirect } from "next/navigation";

import { embedTexts } from "@/lib/ai/embeddings";
import { MATCH_COUNT, MATCH_THRESHOLD, SENSE_QUERY_MAX } from "@/lib/domain/matching";
import { normalizeQuery } from "@/lib/domain/search";
import { createClient } from "@/lib/supabase/server";

export type SenseResult = { chunkId: string; noteId: string; title: string; content: string; score: number };
/** `question` : renvoyée pour que le champ la garde après la recherche. */
export type SenseState = { results: SenseResult[]; searched?: boolean; message?: string; question?: string };

const SEARCH_FAILED = "Recherche impossible pour le moment. Réessaie.";

type Match = { id: string; note_id: string; content: string; similarity: number };

/** « Chercher par sens » : vectorise la question puis lit mes extraits les plus proches (`match_chunks`, sous RLS). */
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
      const [vector] = await embedTexts([question]);
      const { data, error } = await supabase.rpc("match_chunks", {
        query_embedding: JSON.stringify(vector),
        match_threshold: MATCH_THRESHOLD,
        match_count: MATCH_COUNT,
      });
      if (error) throw new Error(`match_chunks ${error.code ?? ""}`.trim());
      const matches = (data ?? []) as Match[];

      const titles = new Map<string, string>();
      if (matches.length) {
        const notes = await supabase.from("notes").select("id, title").in("id", [...new Set(matches.map((m) => m.note_id))]);
        if (notes.error) throw new Error(`titres ${notes.error.code ?? ""}`.trim());
        for (const n of notes.data) titles.set(n.id, n.title);
      }
      state = {
        searched: true,
        question,
        results: matches.map((m) => ({
          chunkId: m.id,
          noteId: m.note_id,
          title: titles.get(m.note_id) ?? "Note sans titre",
          content: m.content,
          score: m.similarity,
        })),
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
