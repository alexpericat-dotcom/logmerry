export const KEYWORDS_MAX = 5;

/** Mots vides français, plus le vocabulaire « méta » d'une question sur ses notes (« est-ce que j'ai une note qui traite de… »). */
const STOPWORDS = new Set(
  `le la les un une des du de d au aux et ou mais donc or ni car que qu qui quoi dont où quel quelle quels quelles quand comment pourquoi combien
   est es sont suis sommes etes être etre ai as a avons avez ont avoir été etait était sera fait faire fais font peux peut peuvent veux veut veulent dois doit
   faut puis ce cet cette ces c ça ca cela celui celle ceux ils elle elles il je j tu te t nous vous me m moi toi lui leur leurs se s on y en
   mon ma mes ton ta tes son sa ses notre nos votre vos dans sur sous avec sans pour par vers chez entre contre selon depuis pendant
   ne n pas plus moins très tres trop assez aussi encore déjà deja si oui non tout tous toute toutes quelque quelques autre autres même meme
   comme ainsi afin lors parmi aucun aucune lequel laquelle lesquels lesquelles
   note notes traite traitent traiter parle parlent parler concerne concernent concerner sujet sujets contient contiennent contenir
   trouve trouver trouves existe existent cherche chercher dis dit dire donne donner montre montrer explique expliquer`
    .split(/\s+/)
    .filter(Boolean),
);

/** Mots-clés d'une question : minuscules, mots vides et mots d'une lettre retirés (les sigles de deux lettres, « IA », « RH », restent), sans doublon.
 *  Au-delà de 5, on garde les 5 plus longs (les plus discriminants), dans l'ordre de la question. */
export function extractKeywords(question: string): string[] {
  const words = [
    ...new Set(
      question
        .toLowerCase()
        .replace(/['’]/g, " ")
        .split(/[^\p{L}\p{N}]+/u)
        .filter((w) => w.length >= 2 && !STOPWORDS.has(w)),
    ),
  ];
  if (words.length <= KEYWORDS_MAX) return words;
  const keep = new Set(
    words
      .map((w, i) => ({ w, i }))
      .sort((a, b) => b.w.length - a.w.length || a.i - b.i)
      .slice(0, KEYWORDS_MAX)
      .map((x) => x.i),
  );
  return words.filter((_, i) => keep.has(i));
}

/** Début d'un mot, sans accent, servant à reconnaître ses variantes (« quittances » ~ « quittance », « procedure » ~ « procédure »).
 *  ponytail: 5 lettres au plus, trop large pour « contr » (contrat, contrôle) et exact seulement sous 5 lettres ; un vrai radical demanderait un stemmer. */
const stem = (w: string) => w.normalize("NFD").replace(/\p{M}/gu, "").slice(0, 5);

export type TextChunk = { id: string; content: string };

/** Extraits qui contiennent au moins un mot-clé (ou une variante), le plus de mots-clés d'abord, `limit` au plus. */
export function chunksMatchingKeywords<T extends TextChunk>(chunks: T[], keywords: string[], limit: number): T[] {
  const wanted = keywords.map(stem);
  const scored = chunks.map((chunk) => {
    const stems = new Set(chunk.content.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(Boolean).map(stem));
    return { chunk, hits: wanted.filter((w) => stems.has(w)).length };
  });
  return scored
    .filter((s) => s.hits > 0)
    .sort((a, b) => b.hits - a.hits)
    .slice(0, limit)
    .map((s) => s.chunk);
}

export type Retrieved = { id: string; score: number | null };

export const KEYWORD_SLOTS = 3;

/** Fusion : d'abord les extraits trouvés par sens (avec score), puis ceux trouvés seulement par mots-clés ; sans doublon, `limit` au plus.
 *  Jusqu'à `KEYWORD_SLOTS` places sont réservées aux extraits trouvés seulement par mots-clés : la voie par sens ne peut pas les chasser. */
export function mergeRetrieved<T extends Retrieved>(bySense: T[], byKeywords: T[], limit: number): T[] {
  const seen = new Set(bySense.map((c) => c.id));
  const onlyKeywords = byKeywords.filter((c) => !seen.has(c.id));
  const reserved = Math.min(onlyKeywords.length, KEYWORD_SLOTS);
  const sense = bySense.slice(0, Math.max(limit - reserved, 0));
  return [...sense, ...onlyKeywords.slice(0, limit - sense.length)];
}
