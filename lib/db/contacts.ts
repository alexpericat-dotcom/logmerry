import "server-only";

import { createClient } from "@/lib/supabase/server";

export type ContactRecord = {
  id: string;
  client_id: string;
  name: string;
  job_title: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  created_at: string;
};

const COLUMNS =
  "id, client_id, name, job_title, email, phone, address, created_at";

/** Les contacts d'une de mes fiches, par ordre alphabétique (la RLS limite aux miens). */
export async function listContacts(clientId: string): Promise<ContactRecord[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("contacts")
    .select(COLUMNS)
    .eq("client_id", clientId)
    .order("name", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw new Error("Impossible de charger les contacts.");
  return data as ContactRecord[];
}
