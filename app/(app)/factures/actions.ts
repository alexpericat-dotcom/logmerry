"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { validateInvoiceInput, type InvoiceErrors, type InvoiceInput } from "@/lib/domain/invoices";
import { isUuid } from "@/lib/domain/notes";
import { todayParis } from "@/lib/format";
import { withSession } from "@/lib/supabase/with-session";

export type InvoiceFormState = { errors?: InvoiceErrors; message?: string; values?: InvoiceInput; saved?: boolean };
export type InvoiceActionState = { message?: string };

const SAVE_FAILED = "Enregistrement impossible. Réessaie.";
const NOT_FOUND = "Cette facture n'existe plus.";
const LINK_GONE = "La mission ou le devis choisi n'existe plus. Recharge la page.";

const text = (formData: FormData, name: string) => String(formData.get(name) ?? "");
const readValues = (formData: FormData): InvoiceInput => ({
  mission_id: text(formData, "mission_id"),
  quote_id: text(formData, "quote_id"),
  amount_ht: text(formData, "amount_ht"),
  tax: text(formData, "tax"),
  due_on: text(formData, "due_on"),
  issued_on: text(formData, "issued_on"),
  reference: text(formData, "reference"),
  note: text(formData, "note"),
});

function refresh() {
  revalidatePath("/factures");
  revalidatePath("/missions/[id]", "page");
}

/** 42501 : la règle d'accès refuse une mission ou un devis d'un autre compte ; 23503 : l'un des deux a disparu. */
const linkGone = (code: string | undefined) => code === "42501" || code === "23503";

export async function createInvoice(_prev: InvoiceFormState, formData: FormData): Promise<InvoiceFormState> {
  const values = readValues(formData);
  const checked = validateInvoiceInput(values, todayParis());
  if (!checked.ok) return { errors: checked.errors, values };
  // owner_id vient de la base ; la RLS refuse une mission ou un devis d'un autre compte.
  const result = await withSession(async (supabase) => {
    const { error } = await supabase.from("invoices").insert(checked.value);
    return error ? ({ kind: "error", code: error.code } as const) : ({ kind: "saved" } as const);
  });
  if (result.status === "signed-out") redirect("/auth/login");
  if (result.status === "failed" || result.value.kind === "error") return { message: result.status === "ok" && linkGone(result.value.code) ? LINK_GONE : SAVE_FAILED, values };
  refresh();
  return { saved: true };
}

/** Une facture reste toujours modifiable (décision 2). */
export async function updateInvoice(id: string, _prev: InvoiceFormState, formData: FormData): Promise<InvoiceFormState> {
  const values = readValues(formData);
  const checked = validateInvoiceInput(values, todayParis());
  if (!checked.ok) return { errors: checked.errors, values };
  const result = await withSession(async (supabase) => {
    if (!isUuid(id)) return { kind: "gone" } as const;
    const { data, error } = await supabase.from("invoices").update(checked.value).eq("id", id).select("id");
    if (error) return { kind: "error", code: error.code } as const;
    return data?.length ? ({ kind: "saved" } as const) : ({ kind: "gone" } as const);
  });
  if (result.status === "signed-out") redirect("/auth/login");
  if (result.status === "failed") return { message: SAVE_FAILED, values };
  if (result.value.kind === "gone") return { message: NOT_FOUND, values };
  if (result.value.kind === "error") return { message: linkGone(result.value.code) ? LINK_GONE : SAVE_FAILED, values };
  refresh();
  return { saved: true };
}

/** Supprimable tant qu'aucun encaissement n'y est rattaché (23503 : la clé étrangère de la story 4.3 refuse). */
export async function deleteInvoice(id: string): Promise<InvoiceActionState> {
  const result = await withSession(async (supabase) => {
    if (!isUuid(id)) return { kind: "gone" } as const;
    const { data, error } = await supabase.from("invoices").delete().eq("id", id).select("id");
    if (error) return { kind: error.code === "23503" ? "has-payments" : "error" } as const;
    return data?.length ? ({ kind: "saved" } as const) : ({ kind: "gone" } as const);
  });
  if (result.status === "signed-out") redirect("/auth/login");
  if (result.status === "failed" || result.value.kind === "error") return { message: "Suppression impossible. La facture est conservée. Réessaie." };
  if (result.value.kind === "has-payments") return { message: "Cette facture a des encaissements : supprime-les d'abord." };
  if (result.value.kind === "gone") return { message: NOT_FOUND };
  refresh();
  return {};
}
