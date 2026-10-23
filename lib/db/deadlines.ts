import "server-only";

import { missingOccurrences, type DeadlineCategory, type DeadlinePriority, type DeadlineRecurrence } from "@/lib/domain/deadlines";
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
  priority: DeadlinePriority;
  recurrence: DeadlineRecurrence | null;
  series_id: string | null;
  series_day: number | null;
};

const COLUMNS = "id, title, due_on, category, source, note, done_at, created_at, priority, recurrence, series_id, series_day";

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

/**
 * Complète les séries jusqu'à douze mois après aujourd'hui (AD-13 : occurrences stockées, complétées à la lecture).
 * L'index unique (series_id, due_on) rend l'insertion idempotente : deux lectures simultanées ne créent pas deux fois la même ligne.
 * Rend le nombre de lignes insérées (0 : rien à relire, ou échec journalisé).
 */
export async function completeDeadlineSeries(rows: DeadlineRecord[], today: string): Promise<number> {
  const missing = missingOccurrences(rows, today);
  if (missing.length === 0) return 0;
  const supabase = await createClient();
  const { error } = await supabase.from("deadlines").upsert(missing, { onConflict: "series_id,due_on", ignoreDuplicates: true });
  if (error) {
    // Lecture de page : un échec d'écriture ne doit pas masquer les échéances déjà lues ; la prochaine lecture réessaie.
    console.error("Impossible de compléter les échéances récurrentes.", error.code);
    return 0;
  }
  return missing.length;
}
