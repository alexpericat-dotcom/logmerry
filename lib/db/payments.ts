import "server-only";

import type { CeilingPayment } from "@/lib/domain/finance/ceilings";
import { createClient } from "@/lib/supabase/server";

/** Tous mes encaissements (montants et date seulement) pour les jauges de plafond ; la période est appliquée par `computeCeilings`. */
export async function listPaymentsForCeilings(): Promise<CeilingPayment[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("payments").select("amount_ht_cents, tax_cents, received_on");
  if (error) throw new Error("Impossible de charger les encaissements.");
  return data;
}
