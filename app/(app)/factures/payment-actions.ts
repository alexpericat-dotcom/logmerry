"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { isUuid } from "@/lib/domain/notes";
import { validatePaymentInput, type PaymentErrors, type PaymentInput } from "@/lib/domain/payments";
import { todayParis } from "@/lib/format";
import { withSession } from "@/lib/supabase/with-session";

export type PaymentFormState = { errors?: PaymentErrors; message?: string; values?: PaymentInput; saved?: boolean };
export type PaymentActionState = { message?: string };

const SAVE_FAILED = "Enregistrement impossible. Réessaie.";
const NOT_FOUND = "Cet encaissement n'existe plus.";
const INVOICE_GONE = "Cette facture n'existe plus. Recharge la page.";

const text = (formData: FormData, name: string) => String(formData.get(name) ?? "");
const readValues = (invoiceId: string, formData: FormData): PaymentInput => ({
  invoice_id: invoiceId,
  amount_ht: text(formData, "amount_ht"),
  tax: text(formData, "tax"),
  received_on: text(formData, "received_on"),
  note: text(formData, "note"),
});

function refresh() {
  revalidatePath("/factures");
  revalidatePath("/missions/[id]", "page");
}

/** 42501 : la règle d'accès refuse une facture d'un autre compte ou disparue ; 23503 : la facture a disparu. */
const invoiceGone = (code: string | undefined) => code === "42501" || code === "23503";

export async function createPayment(invoiceId: string, _prev: PaymentFormState, formData: FormData): Promise<PaymentFormState> {
  const values = readValues(invoiceId, formData);
  const checked = validatePaymentInput(values, todayParis());
  if (!checked.ok) return { errors: checked.errors, values };
  // owner_id vient de la base ; la RLS refuse une facture d'un autre compte.
  const result = await withSession(async (supabase) => {
    const { error } = await supabase.from("payments").insert(checked.value);
    return error ? ({ kind: "error", code: error.code } as const) : ({ kind: "saved" } as const);
  });
  if (result.status === "signed-out") redirect("/auth/login");
  if (result.status === "failed") return { message: SAVE_FAILED, values };
  if (result.value.kind === "error") return { message: invoiceGone(result.value.code) ? INVOICE_GONE : SAVE_FAILED, values };
  refresh();
  return { saved: true };
}

/** Un encaissement reste toujours modifiable (décision 3) ; sa facture, elle, ne change jamais (figée par la base). */
export async function updatePayment(id: string, invoiceId: string, _prev: PaymentFormState, formData: FormData): Promise<PaymentFormState> {
  const values = readValues(invoiceId, formData);
  const checked = validatePaymentInput(values, todayParis());
  if (!checked.ok) return { errors: checked.errors, values };
  const { amount_ht_cents, tax_cents, received_on, note } = checked.value;
  const patch = { amount_ht_cents, tax_cents, received_on, note }; // la facture ne se change pas : on ne l'envoie pas
  const result = await withSession(async (supabase) => {
    if (!isUuid(id)) return { kind: "gone" } as const;
    const { data, error } = await supabase.from("payments").update(patch).eq("id", id).select("id");
    if (error) return { kind: "error" } as const;
    return data?.length ? ({ kind: "saved" } as const) : ({ kind: "gone" } as const);
  });
  if (result.status === "signed-out") redirect("/auth/login");
  if (result.status === "failed" || result.value.kind === "error") return { message: SAVE_FAILED, values };
  if (result.value.kind === "gone") return { message: NOT_FOUND, values };
  refresh();
  return { saved: true };
}

export async function deletePayment(id: string): Promise<PaymentActionState> {
  const result = await withSession(async (supabase) => {
    if (!isUuid(id)) return { kind: "gone" } as const;
    const { data, error } = await supabase.from("payments").delete().eq("id", id).select("id");
    if (error) return { kind: "error" } as const;
    return data?.length ? ({ kind: "saved" } as const) : ({ kind: "gone" } as const);
  });
  if (result.status === "signed-out") redirect("/auth/login");
  if (result.status === "failed" || result.value.kind === "error") return { message: "Suppression impossible. L'encaissement est conservé. Réessaie." };
  if (result.value.kind === "gone") return { message: NOT_FOUND };
  refresh();
  return {};
}
