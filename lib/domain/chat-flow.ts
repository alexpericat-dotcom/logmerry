import { AnswerRejected, inventedNumbers, verifyCitations } from "./citations.ts";

export const NOT_FOUND = "Je n'ai trouvé aucune note correspondant à cette question.";

/** Extrait envoyé au modèle : son texte vient de la base (jamais du modèle). */
export type ChunkLike = { id: string; noteId: string; title: string; content: string };
export type Source = ChunkLike;

export type ChatDeps<C extends ChunkLike> = {
  retrieve: (question: string) => Promise<C[]>;
  ask: (question: string, chunks: C[]) => Promise<{ answer: string; citations: string[] }>;
};

/**
 * Sans extrait pertinent : réponse fixe et Claude n'est pas appelé. Sinon la réponse est vérifiée avant d'être rendue :
 * une citation non envoyée au modèle ou un nombre absent des extraits et de la question la fait rejeter (erreur). Les sources
 * rendues sont les extraits cités, avec le texte relu en base. Les erreurs remontent à l'appelant.
 */
export async function answerQuestion<C extends ChunkLike>(
  question: string,
  deps: ChatDeps<C>,
): Promise<{ answer: string; found: boolean; sources: Source[] }> {
  const chunks = await deps.retrieve(question);
  if (!chunks.length) return { answer: NOT_FOUND, found: false, sources: [] };

  const { answer, citations } = await deps.ask(question, chunks);
  const cited = verifyCitations(citations, chunks.map((c) => c.id));
  if (inventedNumbers(answer, [question, ...chunks.map((c) => c.content)]).length) {
    throw new AnswerRejected("Réponse rejetée : nombre absent des extraits.");
  }
  const byId = new Map(chunks.map((c) => [c.id, c]));
  const sources = cited.map((id) => {
    const c = byId.get(id)!;
    return { id: c.id, noteId: c.noteId, title: c.title, content: c.content };
  });
  return { answer, found: true, sources };
}
