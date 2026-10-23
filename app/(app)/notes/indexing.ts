import "server-only";


import { EMBEDDING_MODEL, embedTexts } from "@/lib/ai/embeddings";
import { indexNoteWith } from "@/lib/domain/index-note";
import type { Db } from "@/lib/supabase/server";

/** Indexe une note avec Mistral et la base de l'utilisateur (RLS) ; ne lève jamais. */
export function indexNote(supabase: Db, id: string, note: { title: string; body: string }) {
  const check = ({ error }: { error: unknown }, what: string) => {
    if (error) throw new Error(what);
  };
  return indexNoteWith(
    {
      embed: embedTexts,
      deleteChunks: async () => check(await supabase.from("note_chunks").delete().eq("note_id", id), "suppression"),
      insertChunks: async (rows) =>
        check(
          await supabase.from("note_chunks").insert(
            rows.map((r) => ({
              note_id: id,
              chunk_index: r.chunk_index,
              content: r.content,
              embedding: JSON.stringify(r.embedding),
              embedding_model: EMBEDDING_MODEL,
            })),
          ),
          "insertion",
        ),
      setStatus: async (index_status) =>
        check(await supabase.from("notes").update({ index_status }).eq("id", id), "état"),
    },
    note,
  );
}
