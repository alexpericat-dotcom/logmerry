import { isContactMessage } from "./contact-message.ts";

export const INDEX_BATCH = 25;

/** Notes à indexer lors d'un clic : celles qui ne sont pas « indexées » (hors messages du formulaire de contact, jamais indexés), `limit` au plus, et combien en restent. */
export function pickToIndex<T extends { index_status: string; title?: string; status?: string }>(
  notes: T[],
  limit = INDEX_BATCH,
): { todo: T[]; remaining: number } {
  const pending = notes.filter((n) => n.index_status !== "indexed" && !isContactMessage(n));
  return { todo: pending.slice(0, limit), remaining: Math.max(0, pending.length - limit) };
}
