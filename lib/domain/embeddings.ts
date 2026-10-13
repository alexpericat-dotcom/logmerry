export const EMBEDDING_DIMENSIONS = 1024;
export const EMBEDDING_BATCH = 16;

/** Découpe une liste en lots de `size` éléments au plus. */
export function toBatches<T>(items: T[], size = EMBEDDING_BATCH): T[][] {
  const batches: T[][] = [];
  for (let i = 0; i < items.length; i += size) batches.push(items.slice(i, i + size));
  return batches;
}

/** Vecteurs d'une réponse « embeddings » de Mistral, dans l'ordre des textes envoyés ; toute anomalie lève une erreur. */
export function parseEmbeddings(json: unknown, count: number): number[][] {
  const data = (json as { data?: unknown } | null)?.data;
  if (!Array.isArray(data) || data.length !== count) throw new Error("Réponse d'embeddings inattendue.");
  const vectors: number[][] = new Array(count);
  for (const item of data as { index?: unknown; embedding?: unknown }[]) {
    const { index, embedding } = item ?? {};
    if (
      typeof index !== "number" ||
      !Number.isInteger(index) ||
      index < 0 ||
      index >= count ||
      vectors[index] ||
      !Array.isArray(embedding) ||
      embedding.length !== EMBEDDING_DIMENSIONS ||
      !embedding.every((v) => typeof v === "number" && Number.isFinite(v))
    ) {
      throw new Error("Réponse d'embeddings inattendue.");
    }
    vectors[index] = embedding as number[];
  }
  return vectors;
}
