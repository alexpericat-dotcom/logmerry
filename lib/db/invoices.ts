import "server-only";

import { createClient } from "@/lib/supabase/server";

export type PaymentRecord = { id: string; amount_ht_cents: number; tax_cents: number | null; received_on: string; note: string | null; created_at: string };

export type InvoiceRecord = {
  id: string;
  mission_id: string;
  quote_id: string | null;
  amount_ht_cents: number;
  tax_cents: number | null;
  due_on: string;
  issued_on: string | null;
  reference: string | null;
  note: string | null;
  created_at: string;
  /** Encaissements de la facture (le statut s'en déduit : `invoiceBalance`). */
  payments: PaymentRecord[];
  /** Mission liée (titre) et son client (nom), pour la liste. */
  mission: { title: string; client_id: string; client: { name: string } | null } | null;
};

const COLUMNS = "id, mission_id, quote_id, amount_ht_cents, tax_cents, due_on, issued_on, reference, note, created_at, payments(id, amount_ht_cents, tax_cents, received_on, note, created_at), mission:missions(title, client_id, client:clients(name))";

/** Toutes mes factures (la RLS limite aux miennes) ; le filtre et le tri sont dans `viewInvoices`. */
export async function listInvoices(): Promise<InvoiceRecord[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("invoices").select(COLUMNS);
  if (error) throw new Error("Impossible de charger les factures.");
  return data;
}

/** Les factures d'une de mes missions. */
export async function listInvoicesForMission(missionId: string): Promise<InvoiceRecord[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("invoices").select(COLUMNS).eq("mission_id", missionId);
  if (error) throw new Error("Impossible de charger les factures de la mission.");
  return data;
}

/** Nombre de factures d'une de mes missions (la suppression de la mission est refusée tant qu'il y en a). */
export async function countInvoicesForMission(missionId: string): Promise<number> {
  const supabase = await createClient();
  const { count, error } = await supabase.from("invoices").select("id", { count: "exact", head: true }).eq("mission_id", missionId);
  if (error) throw new Error("Impossible de compter les factures de la mission.");
  return count ?? 0;
}

/** Choix du formulaire : mes missions (avec leur client) et mes devis acceptés. */
export async function listInvoiceChoices() {
  const supabase = await createClient();
  const [missions, quotes] = await Promise.all([
    supabase.from("missions").select("id, title, client_id, client:clients(name)").order("created_at", { ascending: false }),
    supabase.from("quotes").select("id, client_id, amount_ht_cents, sent_on, status").eq("status", "accepted").order("created_at", { ascending: false }),
  ]);
  if (missions.error || quotes.error) throw new Error("Impossible de charger les choix du formulaire.");
  return {
    missions: missions.data.map((m) => ({ id: m.id, title: m.title, client_id: m.client_id, client_name: m.client?.name ?? "" })),
    quotes: quotes.data.map((q) => ({ id: q.id, client_id: q.client_id, amount_ht_cents: q.amount_ht_cents, sent_on: q.sent_on, status: q.status as string })),
  };
}
