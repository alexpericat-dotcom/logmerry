"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { setTaskChecked } from "@/lib/db/task-checks";
import type { CheckTarget } from "@/lib/domain/cockpit/today";
import { CEILING_KEYS } from "@/lib/domain/finance/ceilings";
import { isUuid } from "@/lib/domain/notes";
import { THRESHOLDS } from "@/lib/domain/profile";
import { todayParis } from "@/lib/format";
import { withSession } from "@/lib/supabase/with-session";

const valid = (t: CheckTarget): boolean =>
  t.rule === 2 || t.rule === 5
    ? isUuid(t.sourceId ?? "")
    : t.rule === 3
      ? (CEILING_KEYS as readonly string[]).includes(t.ceilingKey ?? "") && (THRESHOLDS as readonly number[]).includes(t.threshold ?? 0)
      : t.rule === 4 || t.rule === 6;

/** Cocher ou décocher une tâche du cockpit (facture, plafond, ACRE, devis, pipeline) pour aujourd'hui (jour de Paris) ; facture, profil et règles ne changent pas. */
export async function checkTask(target: CheckTarget, checked: boolean): Promise<{ message?: string }> {
  const result = await withSession(async (supabase) => (valid(target) ? setTaskChecked(supabase, target, todayParis(), checked) : "error"));
  if (result.status === "signed-out") redirect("/auth/login");
  if (result.status === "failed" || result.value === "error") return { message: "Enregistrement impossible. Réessaie." };
  revalidatePath("/aujourd-hui");
  return {};
}
