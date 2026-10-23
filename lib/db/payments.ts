import "server-only";

import type { CeilingPayment } from "@/lib/domain/finance/ceilings";
import { createClient } from "@/lib/supabase/server";

const PAGE = 1000; // PostgREST plafonne une réponse à 1000 lignes par défaut, sans erreur : on lit page par page jusqu'à épuisement.

/** Tous mes encaissements (montants et date seulement) pour les jauges de plafond ; la période est appliquée par `computeCeilings`. */
export async function listPaymentsForCeilings(): Promise<CeilingPayment[]> {
  const supabase = await createClient();
  const all: CeilingPayment[] = [];
  for (let from = 0; ; from += PAGE) {
    // Ordre total (date puis identifiant) : sans lui, deux pages pourraient se chevaucher ou perdre une ligne.
    const { data, error } = await supabase.from("payments").select("amount_ht_cents, tax_cents, received_on").order("received_on", { ascending: false }).order("id").range(from, from + PAGE - 1);
    if (error) throw new Error("Impossible de charger les encaissements.");
    all.push(...data);
    if (data.length < PAGE) return all;
  }
}
