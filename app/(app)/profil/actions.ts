"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { PROFILE_FIELDS, parseFieldInput, parseThresholds } from "@/lib/domain/profile";
import { withSession } from "@/lib/supabase/with-session";

export type ProfileFormState = { error?: string; message?: string };

const SAVE_FAILED = "Enregistrement impossible. Réessaie.";

/**
 * Seul écrivain du profil. `target` = clé d'un champ, ou « alert_thresholds ».
 * Intention « save » : enregistre (Déclaré, ou À confirmer si vidé) ; « confirm » : pose la date de confirmation d'un champ rempli.
 * Modifier une valeur confirmée la repasse en Déclaré : c'est le déclencheur de la base qui remet la date à zéro.
 */
export async function saveProfile(target: string, _prev: ProfileFormState, formData: FormData): Promise<ProfileFormState> {
  const intent = String(formData.get("intent") ?? "save");

  let update: Record<string, unknown>;
  let label: string;
  let confirm = false;
  if (target === "alert_thresholds") {
    const checked = parseThresholds(formData.getAll("threshold").map(String));
    if (!checked.ok) return { error: checked.error };
    update = { alert_thresholds: checked.value };
    label = "Seuils d'alerte";
  } else {
    const def = PROFILE_FIELDS.find((f) => f.key === target);
    if (!def) return { error: "Champ inconnu." };
    label = def.label;
    if (intent === "confirm") {
      confirm = true;
      update = { [`${target}_confirmed_at`]: new Date().toISOString() };
    } else {
      const checked = parseFieldInput(target, { value: String(formData.get("value") ?? ""), other: String(formData.get("other") ?? "") });
      if (!checked.ok) return { error: checked.error };
      update = checked.patch;
    }
  }

  const result = await withSession(async (supabase) => {
    // Supabase refuse un UPDATE sans WHERE (21000) : le filtre sur owner_id est de pure forme, la RLS limite déjà à ma seule ligne.
    // Confirmer un champ vide n'a pas de sens : la base le refuserait aussi (date sans valeur).
    const { data, error } = await supabase
      .from("professional_profile")
      .update(update)
      .not("owner_id", "is", null)
      .not(confirm ? target : "owner_id", "is", null)
      .select("owner_id");
    if (error) {
      console.error("Profil : écriture refusée", target, error.code); // ni valeur ni texte saisi dans le journal
      return "error" as const;
    }
    return data?.length ? ("saved" as const) : ("nothing" as const);
  });
  if (result.status === "signed-out") redirect("/auth/login");
  if (result.status === "failed" || result.value === "error") return { error: SAVE_FAILED };
  if (result.value === "nothing") return { error: confirm ? "Enregistre une valeur avant de la confirmer." : "Ton profil n'existe pas encore : recharge la page." };
  revalidatePath("/profil");
  return { message: confirm ? `${label} : confirmé.` : `${label} : enregistré.` };
}
