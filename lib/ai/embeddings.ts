import "server-only";

import { getMistralApiKey } from "@/lib/ai/config";
import { parseEmbeddings, toBatches } from "@/lib/domain/embeddings";

export const EMBEDDING_MODEL = "mistral-embed";
const URL = "https://api.mistral.ai/v1/embeddings";
const TIMEOUT_MS = 20_000;

/** Vecteurs (1 024 valeurs) des textes, dans l'ordre. Lève une erreur sans contenu ni clé si l'appel échoue. */
export async function embedTexts(texts: string[]): Promise<number[][]> {
  if (!texts.length) return [];
  const mistralApiKey = getMistralApiKey();
  const vectors: number[][] = [];
  for (const batch of toBatches(texts)) {
    const res = await fetch(URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${mistralApiKey}` },
      body: JSON.stringify({ model: EMBEDDING_MODEL, input: batch }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) throw new Error(`Mistral a répondu ${res.status}.`);
    vectors.push(...parseEmbeddings(await res.json(), batch.length));
  }
  return vectors;
}
