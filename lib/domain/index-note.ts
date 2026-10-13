import { chunkNote } from "./chunking.ts";

export type ChunkRow = { chunk_index: number; content: string; embedding: number[] };

/** Ce dont l'indexation a besoin ; chaque fonction lève une erreur si elle échoue. */
export type IndexDeps = {
  embed: (texts: string[]) => Promise<number[][]>;
  deleteChunks: () => Promise<void>;
  insertChunks: (rows: ChunkRow[]) => Promise<void>;
  setStatus: (status: "indexed" | "failed") => Promise<void>;
};

/**
 * Remplace les extraits d'une note puis marque son état. Ne lève jamais : l'enregistrement de la
 * note ne doit pas dépendre de l'IA. Les vecteurs sont calculés avant toute écriture ; en cas d'échec,
 * les anciens extraits sont supprimés (jamais de passage périmé) et l'état passe à « échec ».
 */
export async function indexNoteWith(
  deps: IndexDeps,
  note: { title: string; body: string },
): Promise<"indexed" | "failed"> {
  try {
    const chunks = chunkNote(note.body);
    const vectors = await deps.embed(chunks.map((c) => `${note.title}\n\n${c.content}`));
    await deps.deleteChunks();
    if (chunks.length) {
      await deps.insertChunks(chunks.map((c, i) => ({ chunk_index: c.index, content: c.content, embedding: vectors[i] })));
    }
    await deps.setStatus("indexed");
    return "indexed";
  } catch (e) {
    // Journal sans contenu de note ni clé : seulement la nature de l'échec.
    console.error("Indexation impossible :", e instanceof Error ? e.message : "erreur inconnue");
    const quiet = (step: () => Promise<void>, what: string) =>
      step().catch(() => console.error(`Indexation : ${what} impossible après un échec`));
    await quiet(deps.deleteChunks, "suppression des extraits");
    await quiet(() => deps.setStatus("failed"), "enregistrement de l'état");
    return "failed";
  }
}
