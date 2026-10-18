"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { isDay } from "@/lib/domain/missions";
import { isUuid } from "@/lib/domain/notes";
import { RULE_KEYS } from "@/lib/domain/finance/rule-keys";
import { validateRuleInput, type RuleErrors } from "@/lib/domain/finance/rules";
import { withSession } from "@/lib/supabase/with-session";

export type RuleFormState = { errors?: RuleErrors; message?: string; saved?: boolean };
export type RuleActionState = { message?: string; done?: boolean };

const SAVE_FAILED = "Enregistrement impossible. Réessaie.";
const OVERLAP = "Cette date d'effet chevauche une autre version de cette règle : choisis une date après la version en vigueur.";

const text = (formData: FormData, name: string) => String(formData.get(name) ?? "");

/** Nouvelle règle ou nouvelle version : une seule fonction SQL (`create_rule_version`) ferme la précédente et insère, en une transaction. Toujours « à vérifier ». */
export async function createRule(ruleKey: string, _prev: RuleFormState, formData: FormData): Promise<RuleFormState> {
  const params: Record<string, string> = {};
  for (const f of RULE_KEYS.find((k) => k.key === ruleKey)?.fields ?? []) params[f.name] = text(formData, `p_${f.name}`);
  const checked = validateRuleInput({
    rule_key: ruleKey,
    activity_category: text(formData, "activity_category"),
    effective_from: text(formData, "effective_from"),
    source: text(formData, "source"),
    verified_on: text(formData, "verified_on"),
    revalidate_after: text(formData, "revalidate_after"),
    description: text(formData, "description"),
    params,
  });
  if (!checked.ok) return { errors: checked.errors };
  const v = checked.value;
  const result = await withSession(async (supabase) => {
    const { error } = await supabase.rpc("create_rule_version", {
      p_rule_key: v.rule_key,
      p_activity_category: v.activity_category,
      p_effective_from: v.effective_from,
      p_params: v.params,
      p_source: v.source,
      p_verified_on: v.verified_on,
      p_revalidate_after: v.revalidate_after,
      p_description: v.description,
      p_status: "a_verifier",
    });
    if (error) console.error("Règles : création refusée", error.code); // ni valeur ni source dans le journal
    return error?.code ?? "ok";
  });
  if (result.status === "signed-out") redirect("/auth/login");
  if (result.status === "failed") return { message: SAVE_FAILED };
  if (result.value === "23P01") return { errors: { effective_from: OVERLAP } };
  if (result.value !== "ok") return { message: SAVE_FAILED };
  revalidatePath("/regles");
  return { saved: true };
}

type Intent = "verify" | "unverify" | "revalidate" | "delete";

/** Changements d'une version existante : vérifier (lien https exigé par la base), repasser à vérifier, revérifier (nouvelles dates), supprimer (« à vérifier » seulement). */
export async function updateRule(id: string, intent: Intent, _prev: RuleActionState, formData: FormData): Promise<RuleActionState> {
  if (!isUuid(id)) return { message: "Cette règle n'existe plus." };
  let patch: Record<string, string> | null = null;
  if (intent === "verify") patch = { status: "verifiee" };
  else if (intent === "unverify") patch = { status: "a_verifier" };
  else if (intent === "revalidate") {
    const verified = text(formData, "verified_on").trim();
    const next = text(formData, "revalidate_after").trim();
    if (!isDay(verified)) return { message: "Saisis la date de vérification." };
    if (!isDay(next)) return { message: "Saisis la date de revérification." };
    if (next < verified) return { message: "La revérification ne peut pas précéder la vérification." };
    patch = { verified_on: verified, revalidate_after: next };
  } else if (intent !== "delete") return { message: "Action inconnue." };

  const result = await withSession(async (supabase) => {
    // Le statut attendu est vérifié dans la requête : une règle changée entre-temps n'est pas touchée.
    const expected = intent === "verify" || intent === "delete" ? "a_verifier" : "verifiee";
    const query = patch
      ? supabase.from("regulatory_rules").update(patch).eq("id", id).eq("status", expected).select("id")
      : supabase.from("regulatory_rules").delete().eq("id", id).eq("status", "a_verifier").select("id");
    const { data, error } = await query;
    if (error) {
      console.error("Règles : écriture refusée", intent, error.code);
      return error.code === "23514" ? ("refused" as const) : ("error" as const);
    }
    return data?.length ? ("done" as const) : ("lost" as const);
  });
  if (result.status === "signed-out") redirect("/auth/login");
  if (result.status === "failed" || result.value === "error") return { message: SAVE_FAILED };
  if (result.value === "refused") return { message: intent === "verify" ? "Une règle ne passe en « Vérifiée » qu'avec un lien officiel https dans sa source." : SAVE_FAILED };
  if (result.value === "lost") return { message: "Cette règle a changé entre-temps. Recharge la page." };
  revalidatePath("/regles");
  return { done: true };
}
