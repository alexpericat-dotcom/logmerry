/** Source d'une réponse, telle que relue en base : note ou extrait absents (supprimés, régénérés) = champs nuls. */
export type StoredSource = { id: string; noteId: string | null; title: string | null; content: string | null };

export type HistoryMessage = { id: string; role: "user" | "assistant"; text: string; sources: StoredSource[] };

export type CitationRow = {
  id: string;
  position: number;
  note_id: string | null;
  chunk_id: string | null;
  notes: { title: string } | null;
  note_chunks: { content: string } | null;
};

export type MessageRow = {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
  message_citations: CitationRow[];
};

/** État d'affichage d'une source : note supprimée, extrait régénéré depuis (note modifiée), ou intacte. */
export function sourceState(s: StoredSource): "deleted" | "changed" | "ok" {
  if (s.noteId === null) return "deleted";
  if (s.content === null) return "changed";
  return "ok";
}

/** Historique du plus ancien au plus récent ; `rows` arrive du plus récent au plus ancien (les derniers messages). Citations dans l'ordre de la réponse. */
export function toHistory(rows: MessageRow[]): HistoryMessage[] {
  // `rows` arrive du plus récent au plus ancien : on inverse d'abord, pour qu'à date égale l'ordre d'insertion (question puis réponse) soit gardé.
  const ordered = [...rows].reverse().sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at));
  // La limite des 100 derniers messages peut couper un échange : jamais de réponse sans sa question en tête.
  const start = ordered.findIndex((m) => m.role === "user");
  return (start === -1 ? [] : ordered.slice(start))
    .map((m) => ({
      id: m.id,
      role: m.role,
      text: m.content,
      sources: [...m.message_citations]
        .sort((a, b) => a.position - b.position)
        .map((c) => ({
          id: c.id,
          noteId: c.note_id,
          title: c.note_id === null ? null : (c.notes?.title ?? null),
          content: c.note_id === null ? null : (c.note_chunks?.content ?? null),
        })),
    }));
}
