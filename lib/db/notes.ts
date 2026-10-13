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
  created_at: string;
  updated_at: string;
};

const COLUMNS = "id, title, body, status, type, index_status, created_at, updated_at";

/** Mes notes (filtrées par type si demandé), de la plus récente à la plus ancienne ; la RLS limite aux miennes. */
export async function listNotes(type: NoteType | null = null): Promise<Note[]> {
  const supabase = await createClient();
  let query = supabase.from("notes").select(COLUMNS).order("created_at", { ascending: false });
  if (type) query = query.eq("type", type);
  const { data, error } = await query;
  if (error) throw new Error("Impossible de charger les notes.");
  return data as Note[];
}

/** Une de mes notes, ou null si l'identifiant est inconnu ou appartient à un autre compte. */
export async function getNote(id: string): Promise<Note | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("notes").select(COLUMNS).eq("id", id).maybeSingle();
  if (error) throw new Error("Impossible de charger la note.");
  return data as Note | null;
}
