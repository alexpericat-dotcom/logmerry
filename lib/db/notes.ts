import "server-only";

import { createClient } from "@/lib/supabase/server";

export type Note = {
  id: string;
  title: string;
  body: string;
  status: "draft" | "active";
  created_at: string;
};

/** Mes notes, de la plus récente à la plus ancienne (la RLS limite aux miennes). */
export async function listNotes(): Promise<Note[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("notes")
    .select("id, title, body, status, created_at")
    .order("created_at", { ascending: false });
  if (error) throw new Error("Impossible de charger les notes.");
  return data as Note[];
}
