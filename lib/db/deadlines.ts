import "server-only";

import type { DeadlineCategory } from "@/lib/domain/deadlines";
import { readAllPages } from "@/lib/db/paginate";
import { createClient } from "@/lib/supabase/server";

export type DeadlineRecord = {
  id: string;
  title: string;
  due_on: string;
  category: DeadlineCategory;
  source: string;
  note: string | null;
  done_at: string | null;
  created_at: string;
};

const COLUMNS = "id, title, due_on, category, source, note, done_at, created_at";

/** Toutes mes échéances (la RLS limite aux miennes) ; les sections et le tri sont dans `groupDeadlines`. */
export async function listDeadlines(): Promise<DeadlineRecord[]> {
  const supabase = await createClient();
  return readAllPages(async (from, to) => {
    // Ordre total (date puis identifiant) : sans lui, deux pages pourraient se chevaucher ou perdre une ligne.
    const { data, error } = await supabase.from("deadlines").select(COLUMNS).order("due_on").order("id").range(from, to);
    if (error) throw new Error("Impossible de charger les échéances.");
    return data;
  });
}
