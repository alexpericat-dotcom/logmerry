import "server-only";

import type { NoteType } from "@/lib/domain/notes";
import { createClient } from "@/lib/supabase/server";

export type Note = {
  id: string;
  title: string;
  body: string;
  status: "draft" | "active";
  type: NoteType;
  index_status: "pending" | "indexed" | "failed";
  client_id: string | null;
  /** Fiche liée (nom), pour la pastille de la liste. */
  client: { name: string } | null;
  created_at: string;
  updated_at: string;
};

const COLUMNS = "id, title, body, status, type, index_status, client_id, client:clients(name), created_at, updated_at";

/** Mes notes (filtrées par type si demandé), de la plus récente à la plus ancienne ; la RLS limite aux miennes. */
export async function listNotes(type: NoteType | null = null, status: "draft" | null = null): Promise<Note[]> {
  const supabase = await createClient();
  let query = supabase.from("notes").select(COLUMNS).order("created_at", { ascending: false });
  if (type) query = query.eq("type", type);
  if (status) query = query.eq("status", status);
  const { data, error } = await query;
  if (error) throw new Error("Impossible de charger les notes.");
  return data as unknown as Note[];
}

/** Une de mes notes, ou null si l'identifiant est inconnu ou appartient à un autre compte. */
export async function getNote(id: string): Promise<Note | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("notes").select(COLUMNS).eq("id", id).maybeSingle();
  if (error) throw new Error("Impossible de charger la note.");
  return data as unknown as Note | null;
}

/** Mes notes liées à une fiche, de la plus récente à la plus ancienne. */
export async function listNotesForClient(clientId: string): Promise<Pick<Note, "id" | "title" | "type" | "status" | "created_at">[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("notes")
    .select("id, title, type, status, created_at")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false });
  if (error) throw new Error("Impossible de charger les notes de la fiche.");
  return data as Pick<Note, "id" | "title" | "type" | "status" | "created_at">[];
}

export type IndexCounts = { total: number; indexed: number; pending: number; failed: number };

/** Combien de mes notes sont indexées, en attente ou en échec ; la RLS limite aux miennes. */
export async function countIndexStatuses(): Promise<IndexCounts> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("notes").select("index_status");
  if (error) throw new Error("Impossible de charger l'état d'indexation.");
  const counts: IndexCounts = { total: data.length, indexed: 0, pending: 0, failed: 0 };
  for (const { index_status } of data) counts[index_status as "indexed" | "pending" | "failed"]++;
  return counts;
}

/** Mes notes liées à une fiche, avec leur texte, de la plus récente à la plus ancienne (la RLS limite aux miennes) : ce que l'IA peut lire pour proposer un backlog. */
export async function listNotesWithBodyForClient(clientId: string): Promise<{ id: string; title: string; body: string; created_at: string }[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("notes")
    .select("id, title, body, created_at")
    .eq("client_id", clientId)
    .eq("status", "active")
    .order("created_at", { ascending: false });
  if (error) throw new Error("Impossible de charger les notes de la fiche.");
  return data as { id: string; title: string; body: string; created_at: string }[];
}
