import "server-only";

import type { ProfileRow } from "@/lib/domain/profile";
import { createClient } from "@/lib/supabase/server";

/** Ma ligne de profil ; créée à la première ouverture (statut et catégorie « Déclaré » par défaut de la base), sans jamais écraser l'existante. */
export async function getOrCreateProfile(): Promise<ProfileRow> {
  const supabase = await createClient();
  const read = () => supabase.from("professional_profile").select("*").maybeSingle<ProfileRow>();
  const first = await read();
  if (first.error) throw new Error("Impossible de charger le profil.");
  if (first.data) return first.data;
  // owner_id vient de la base (auth.uid()) ; deux onglets qui créent en même temps : l'un des deux est ignoré.
  const { error } = await supabase.from("professional_profile").upsert({}, { onConflict: "owner_id", ignoreDuplicates: true });
  if (error) throw new Error("Impossible de créer le profil.");
  const second = await read();
  if (second.error || !second.data) throw new Error("Impossible de charger le profil.");
  return second.data;
}

/** Ma ligne de profil, ou null si elle n'existe pas encore : lecture seule (la page Plafonds n'écrit rien). */
export async function getProfile(): Promise<ProfileRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("professional_profile").select("*").maybeSingle<ProfileRow>();
  if (error) throw new Error("Impossible de charger le profil.");
  return data;
}
