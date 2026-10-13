import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Source } from "@/lib/domain/chat-flow";
import { toHistory, type HistoryMessage, type MessageRow } from "@/lib/domain/history";

const HISTORY_MAX = 100;
const CONTENT_MAX = 20_000; // limite de la base : au-delà, tout l'échange serait refusé

/** Mes 100 derniers messages avec leurs citations (titre et texte relus en base, sous RLS), du plus ancien au plus récent. */
export async function listHistory(supabase: SupabaseClient): Promise<HistoryMessage[]> {
  const { data, error } = await supabase
    .from("messages")
    .select("id, role, content, created_at, message_citations(id, position, note_id, chunk_id, notes(title), note_chunks(content))")
    .order("created_at", { ascending: false })
    .limit(HISTORY_MAX);
  if (error) throw new Error(`historique ${error.code ?? ""}`.trim());
  return toHistory(data as unknown as MessageRow[]);
}

/** Enregistre un échange vérifié : ma question, la réponse et ses citations (références, jamais une copie du texte). Lève une erreur sans contenu en cas d'échec. */
export async function saveExchange(supabase: SupabaseClient, question: string, answer: string, sources: Source[]): Promise<void> {
  // Une seule insertion pour les deux messages ; horodatages explicites pour garder l'ordre question puis réponse.
  const now = Date.now();
  const inserted = await supabase
    .from("messages")
    .insert([
      { role: "user", content: question.slice(0, CONTENT_MAX), created_at: new Date(now).toISOString() },
      { role: "assistant", content: answer.slice(0, CONTENT_MAX), created_at: new Date(now + 1).toISOString() },
    ])
    .select("id, role");
  if (inserted.error) throw new Error(`messages ${inserted.error.code ?? ""}`.trim());
  const assistant = inserted.data.find((m) => m.role === "assistant");
  if (!assistant || !sources.length) return;

  const cited = await supabase
    .from("message_citations")
    .insert(sources.map((s, position) => ({ message_id: assistant.id, position, note_id: s.noteId, chunk_id: s.id })));
  if (cited.error) {
    // Jamais une réponse enregistrée sans ses sources : on retire l'échange (il reste affiché dans le panneau jusqu'au rechargement).
    await supabase.from("messages").delete().in("id", inserted.data.map((m) => m.id));
    throw new Error(`citations ${cited.error.code ?? ""}`.trim());
  }
}
