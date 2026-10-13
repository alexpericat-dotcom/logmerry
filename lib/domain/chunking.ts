export const CHUNK_MAX = 1000;
export const CHUNK_OVERLAP = 150;

export type Chunk = { index: number; content: string };

const isSpace = (c: string | undefined) => c !== undefined && /\s/.test(c);

/** Meilleur point de coupe dans `chars[start, limit]` : paragraphe, ligne, fin de phrase, espace ; sinon `limit` (coupe franche). */
function cutPoint(chars: string[], start: number, limit: number): number {
  const min = start + CHUNK_MAX / 2; // pas d'extrait minuscule
  const boundaries: ((i: number) => boolean)[] = [
    (i) => chars[i - 1] === "\n" && chars[i - 2] === "\n",
    (i) => chars[i - 1] === "\n",
    // ponytail: toute fin de phrase simple (« etc. » ou « M. » comptent aussi), pas de gestion des titres ni du code Markdown
    (i) => isSpace(chars[i - 1]) && /[.!?…]/.test(chars[i - 2] ?? ""),
    (i) => isSpace(chars[i - 1]),
  ];
  for (const match of boundaries) {
    for (let i = limit; i > min; i--) if (match(i)) return i;
  }
  return limit;
}

/** Découpe le texte d'une note en extraits qui se chevauchent ; texte vide ou d'espaces : aucun extrait. Compte en points de code : une paire de substitution (emoji simple) n'est jamais coupée ; les suites d'emoji ou accents combinés peuvent l'être. */
export function chunkNote(body: string): Chunk[] {
  const chars = [...body.replace(/\r\n?/g, "\n").trim()];
  if (!chars.length) return [];

  const chunks: Chunk[] = [];
  let start = 0;
  while (start < chars.length) {
    const end = chars.length - start <= CHUNK_MAX ? chars.length : cutPoint(chars, start, start + CHUNK_MAX);
    const content = chars.slice(start, end).join("").trim();
    if (content) chunks.push({ index: chunks.length, content });
    if (end >= chars.length) break;
    // Reprise avant la coupe pour le chevauchement, calée sur un début de mot si possible.
    let next = end - CHUNK_OVERLAP;
    for (let i = next; i < end; i++) {
      if (isSpace(chars[i - 1]) && !isSpace(chars[i])) {
        next = i;
        break;
      }
    }
    start = next;
  }
  return chunks;
}
