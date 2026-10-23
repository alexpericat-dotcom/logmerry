"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { setInvoiceTaskChecked } from "@/lib/db/task-checks";
import { isUuid } from "@/lib/domain/notes";
import { todayParis } from "@/lib/format";
import { withSession } from "@/lib/supabase/with-session";

/** Cocher ou décocher une tâche de facture pour aujourd'hui (jour de Paris) ; la facture elle-même ne change pas. */
export async function checkInvoiceTask(invoiceId: string, checked: boolean): Promise<{ message?: string }> {
  const result = await withSession(async (supabase) => (isUuid(invoiceId) ? setInvoiceTaskChecked(supabase, invoiceId, todayParis(), checked) : "error"));
  if (result.status === "signed-out") redirect("/auth/login");
  if (result.status === "failed" || result.value === "error") return { message: "Enregistrement impossible. Réessaie." };
  revalidatePath("/aujourd-hui");
  return {};
}
