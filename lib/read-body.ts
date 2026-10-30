/**
 * Texte du corps d'une requête, lu par morceaux et abandonné au-delà de `max` octets (`null`) : l'en-tête `content-length` peut manquer (transfert par morceaux) ou mentir,
 * il n'est donc qu'une première barrière. Lecture bornée : jamais plus de `max` + un morceau en mémoire.
 */
export async function readTextBounded(request: Request, max: number): Promise<string | null> {
  const reader = request.body?.getReader();
  if (!reader) return "";
  const decoder = new TextDecoder();
  let size = 0;
  let text = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > max) {
      await reader.cancel().catch(() => {});
      return null;
    }
    text += decoder.decode(value, { stream: true });
  }
  return text + decoder.decode();
}
