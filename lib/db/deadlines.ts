import "server-only";

import type { DeadlineCategory } from "@/lib/domain/deadlines";
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
const PAGE = 1000; // PostgREST plafonne une réponse à 1000 lignes par défaut, sans erreur : on lit page par page jusqu'à épuisement.

/** Toutes mes échéances (la RLS limite aux miennes) ; les sections et le tri sont dans `groupDeadlines`. */
export async function listDeadlines(): Promise<DeadlineRecord[]> {
  const supabase = await createClient();
  const all: DeadlineRecord[] = [];
  for (let from = 0; ; from += PAGE) {
    // Ordre total (date puis identifiant) : sans lui, deux pages pourraient se chevaucher ou perdre une ligne.
    const { data, error } = await supabase.from("deadlines").select(COLUMNS).order("due_on").order("id").range(from, from + PAGE - 1);
    if (error) throw new Error("Impossible de charger les échéances.");
    all.push(...data);
    if (data.length < PAGE) return all;
  }
}
