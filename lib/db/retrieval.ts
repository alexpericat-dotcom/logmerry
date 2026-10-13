import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { embedTexts } from "@/lib/ai/embeddings";
import { MATCH_COUNT, MATCH_THRESHOLD } from "@/lib/domain/matching";

export type RetrievedChunk = { id: string; noteId: string; title: string; content: string; score: number };

type Match = { id: string; note_id: string; content: string; similarity: number };

/** Mes extraits les plus proches de la question (vectorisation Mistral puis `match_chunks`, sous RLS), avec le titre de leur note. Lève une erreur sans contenu en cas d'échec. */
export async function retrieveChunks(supabase: SupabaseClient, question: string): Promise<RetrievedChunk[]> {
  const [vector] = await embedTexts([question]);
  const { data, error } = await supabase.rpc("match_chunks", {
    query_embedding: JSON.stringify(vector),
    match_threshold: MATCH_THRESHOLD,
    match_count: MATCH_COUNT,
  });
  if (error) throw new Error(`match_chunks ${error.code ?? ""}`.trim());
  const matches = (data ?? []) as Match[];
  if (!matches.length) return [];

  const notes = await supabase.from("notes").select("id, title").in("id", [...new Set(matches.map((m) => m.note_id))]);
  if (notes.error) throw new Error(`titres ${notes.error.code ?? ""}`.trim());
  const titles = new Map<string, string>(notes.data.map((n) => [n.id, n.title]));
  return matches.map((m) => ({
    id: m.id,
    noteId: m.note_id,
    title: titles.get(m.note_id) ?? "Note sans titre",
    content: m.content,
    score: m.similarity,
  }));
}
