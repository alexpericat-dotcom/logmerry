import "server-only";

import { readAllPages } from "@/lib/db/paginate";
import type { CeilingPayment } from "@/lib/domain/finance/ceilings";
import { createClient } from "@/lib/supabase/server";

/** Tous mes encaissements (montants et date seulement) pour les jauges de plafond ; la période est appliquée par `computeCeilings`. */
export async function listPaymentsForCeilings(): Promise<CeilingPayment[]> {
  const supabase = await createClient();
  return readAllPages(async (from, to) => {
    // Ordre total (date puis identifiant) : sans lui, deux pages pourraient se chevaucher ou perdre une ligne.
    const { data, error } = await supabase.from("payments").select("amount_ht_cents, tax_cents, received_on").order("received_on", { ascending: false }).order("id").range(from, to);
    if (error) throw new Error("Impossible de charger les encaissements.");
    return data;
  });
}
