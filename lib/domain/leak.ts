import { normalize } from "./rag-score.ts";

/** Minuscules, « 2 400 » = « 2400 », accents ignorés. */
const fold = (s: string): string => normalize(s).normalize("NFD").replace(/\p{M}/gu, "");
const escape = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Les faits interdits présents dans un texte : comparaison sans casse ni accent (« fidelite » = « fidélité »), « 2 400 » = « 2400 »,
 * et en mots entiers (« 650 » n'est pas dans « 1650 »). Pour un test de fuite : doit toujours renvoyer une liste vide.
 */
export function leakedFacts(text: string, forbidden: readonly string[]): string[] {
  const t = fold(text);
  return forbidden.filter((f) => new RegExp(`(?<![\\p{L}\\p{N}])${escape(fold(f))}(?![\\p{L}\\p{N}])`, "u").test(t));
}
