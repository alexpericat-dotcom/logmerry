import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { embedTexts } from "@/lib/ai/embeddings";
import { chunksMatchingKeywords, extractKeywords, mergeRetrieved } from "@/lib/domain/keywords";
import { MATCH_COUNT, MATCH_THRESHOLD } from "@/lib/domain/matching";

/** `score` : similarité (recherche par sens) ou `null` quand l'extrait n'a été trouvé que par ses mots-clés. */
export type RetrievedChunk = { id: string; noteId: string; title: string; content: string; score: number | null };

type Match = { id: string; note_id: string; content: string; similarity: number };

/** Voie « par sens » : vectorisation Mistral puis `match_chunks` (sous RLS), avec le titre des notes. Lève une erreur sans contenu en cas d'échec. */
async function retrieveBySense(supabase: SupabaseClient, question: string): Promise<RetrievedChunk[]> {
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

/** Voie « par mots-clés » : plein texte français de `search_notes` (une requête par mot-clé, sous RLS), puis les extraits de ces notes qui contiennent un mot-clé. */
async function retrieveByKeywords(supabase: SupabaseClient, keywords: string[]): Promise<RetrievedChunk[]> {
  if (!keywords.length) return [];
  const found = await Promise.all(keywords.map((query) => supabase.rpc("search_notes", { query })));
  const titles = new Map<string, string>();
  for (const { data, error } of found) {
    if (error) throw new Error(`search_notes ${error.code ?? ""}`.trim());
    for (const n of (data ?? []) as { id: string; title: string }[]) titles.set(n.id, n.title);
  }
  if (!titles.size) return [];

  const rows = await supabase.from("note_chunks").select("id, note_id, content").in("note_id", [...titles.keys()]).limit(300);
  if (rows.error) throw new Error(`extraits ${rows.error.code ?? ""}`.trim());
  return chunksMatchingKeywords(rows.data as { id: string; note_id: string; content: string }[], keywords, MATCH_COUNT).map((c) => ({
    id: c.id,
    noteId: c.note_id,
    title: titles.get(c.note_id) ?? "Note sans titre",
    content: c.content,
    score: null,
  }));
}

/**
 * Mes extraits les plus pertinents pour la question : recherche par sens (seuil de similarité) et recherche par mots-clés isolés de la
 * question, fusionnées. Une panne de la voie par sens fait échouer l'appel ; une panne de la voie par mots-clés est journalisée et ignorée.
 */
export async function retrieveChunks(supabase: SupabaseClient, question: string): Promise<RetrievedChunk[]> {
  const [bySense, byKeywords] = await Promise.all([
    retrieveBySense(supabase, question),
    retrieveByKeywords(supabase, extractKeywords(question)).catch((e) => {
      console.error("Recherche par mots-clés impossible :", e instanceof Error ? e.message : "erreur inconnue");
      return [] as RetrievedChunk[];
    }),
  ]);
  return mergeRetrieved(bySense, byKeywords, MATCH_COUNT);
}
