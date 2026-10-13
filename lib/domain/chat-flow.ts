export const NOT_FOUND = "Je n'ai trouvé aucune note correspondant à cette question.";

export type ChatDeps<C> = {
  retrieve: (question: string) => Promise<C[]>;
  ask: (question: string, chunks: C[]) => Promise<{ answer: string }>;
};

/** Sans extrait pertinent : réponse fixe et Claude n'est pas appelé (aucun coût, aucune invention possible). Les erreurs remontent à l'appelant. */
export async function answerQuestion<C>(question: string, deps: ChatDeps<C>): Promise<{ answer: string; found: boolean }> {
  const chunks = await deps.retrieve(question);
  if (!chunks.length) return { answer: NOT_FOUND, found: false };
  const { answer } = await deps.ask(question, chunks);
  return { answer, found: true };
}
