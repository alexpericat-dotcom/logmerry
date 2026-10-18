import "server-only";

import type { QuoteStatus } from "@/lib/domain/quotes";
import { createClient } from "@/lib/supabase/server";

export type QuoteRecord = {
  id: string;
  client_id: string;
  mission_id: string | null;
  amount_ht_cents: number;
  tax_cents: number | null;
  sent_on: string | null;
  status: QuoteStatus;
  created_at: string;
};

const COLUMNS = "id, client_id, mission_id, amount_ht_cents, tax_cents, sent_on, status, created_at";

/** Les devis d'une de mes fiches, du plus récent au plus ancien (la RLS limite aux miens). */
export async function listQuotesForClient(clientId: string): Promise<QuoteRecord[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("quotes").select(COLUMNS).eq("client_id", clientId).order("created_at", { ascending: false });
  if (error) throw new Error("Impossible de charger les devis de la fiche.");
  return data as QuoteRecord[];
}
