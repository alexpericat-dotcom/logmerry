"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { isUuid } from "@/lib/domain/notes";
import { validateQuoteInput, type QuoteErrors } from "@/lib/domain/quotes";
import { withSession } from "@/lib/supabase/with-session";

export type QuoteFormValues = { amount_ht: string; tax: string; sent_on: string; mission_id: string };
export type QuoteFormState = { errors?: QuoteErrors; message?: string; values?: QuoteFormValues; saved?: boolean };
export type QuoteActionState = { message?: string; missionId?: string | null };

const SAVE_FAILED = "Enregistrement impossible. Réessaie.";
const NOT_FOUND = "Ce devis n'existe plus.";

const readValues = (formData: FormData): QuoteFormValues => ({
  amount_ht: String(formData.get("amount_ht") ?? ""),
  tax: String(formData.get("tax") ?? ""),
  sent_on: String(formData.get("sent_on") ?? ""),
  mission_id: String(formData.get("mission_id") ?? ""),
});

function refresh(clientId: string | null) {
  revalidatePath("/clients");
  revalidatePath("/missions");
  if (clientId) revalidatePath(`/clients/${clientId}`);
}

type Row = { client_id: string; status: string };

/** Création : toujours un brouillon (valeur par défaut de la base) ; la date d'envoi, si saisie, est gardée pour plus tard. */
export async function createQuote(clientId: string, _prev: QuoteFormState, formData: FormData): Promise<QuoteFormState> {
  const values = readValues(formData);
  const checked = validateQuoteInput(values, false);
  if (!checked.ok) return { errors: checked.errors, values };
  const result = await withSession(async (supabase) => {
    if (!isUuid(clientId)) return "gone" as const;
    const { data: client, error: ce } = await supabase.from("clients").select("id").eq("id", clientId).maybeSingle();
    if (ce) return "error" as const;
    if (!client) return "gone" as const;
    // owner_id vient de la base ; la RLS refuse une mission d'un autre client ou d'un autre compte.
    const { error } = await supabase.from("quotes").insert({ client_id: clientId, ...checked.value });
    return error ? ("error" as const) : ("saved" as const);
  });
  if (result.status === "signed-out") redirect("/auth/login");
  if (result.status === "failed" || result.value === "error") return { message: SAVE_FAILED, values };
  if (result.value === "gone") return { message: "Cette fiche n'existe plus.", values };
  refresh(clientId);
  return { saved: true };
}

/** Modification d'un devis brouillon ou envoyé ; la date d'envoi reste obligatoire s'il est envoyé. Refusé et accepté : la base refuse. */
export async function updateQuote(id: string, _prev: QuoteFormState, formData: FormData): Promise<QuoteFormState> {
  const values = readValues(formData);
  const result = await withSession(async (supabase) => {
    if (!isUuid(id)) return { kind: "gone" as const };
    const { data: row, error } = await supabase.from("quotes").select("client_id, status").eq("id", id).maybeSingle<Row>();
    if (error) return { kind: "error" as const };
    if (!row) return { kind: "gone" as const };
    if (row.status !== "draft" && row.status !== "sent") return { kind: "frozen" as const };
    const checked = validateQuoteInput(values, row.status === "sent");
    if (!checked.ok) return { kind: "invalid" as const, errors: checked.errors };
    const { data, error: ue } = await supabase.from("quotes").update(checked.value).eq("id", id).eq("status", row.status).select("id");
    if (ue) return { kind: "error" as const };
    return data?.length ? { kind: "saved" as const, clientId: row.client_id } : { kind: "frozen" as const };
  });
  if (result.status === "signed-out") redirect("/auth/login");
  if (result.status === "failed" || result.value.kind === "error") return { message: SAVE_FAILED, values };
  const r = result.value;
  if (r.kind === "invalid") return { errors: r.errors, values };
  if (r.kind === "gone") return { message: NOT_FOUND, values };
  if (r.kind === "frozen") return { message: "Ce devis a changé d'état entre-temps : il n'est plus modifiable. Recharge la page.", values };
  refresh(r.clientId);
  return { saved: true };
}

async function transition(id: string, from: "draft" | "sent", patch: Record<string, unknown>, lost: string): Promise<QuoteActionState> {
  const result = await withSession(async (supabase) => {
    if (!isUuid(id)) return { kind: "gone" as const };
    const { data, error } = await supabase.from("quotes").update(patch).eq("id", id).eq("status", from).select("client_id");
    if (error) return { kind: "error" as const };
    return data?.length ? { kind: "saved" as const, clientId: data[0].client_id as string } : { kind: "lost" as const };
  });
  if (result.status === "signed-out") redirect("/auth/login");
  if (result.status === "failed" || result.value.kind === "error") return { message: SAVE_FAILED };
  if (result.value.kind === "gone") return { message: NOT_FOUND };
  if (result.value.kind === "lost") return { message: lost };
  refresh(result.value.clientId);
  return {};
}

/** Brouillon -> envoyé, avec la date d'envoi (obligatoire). */
export async function sendQuote(id: string, sentOn: string): Promise<QuoteActionState> {
  const date = validateQuoteInput({ amount_ht: "1", tax: "", sent_on: sentOn, mission_id: "" }, true);
  if (!date.ok) return { message: date.errors.sent_on ?? "Saisis la date d'envoi." };
  return transition(id, "draft", { status: "sent", sent_on: date.value.sent_on }, "Ce devis n'est plus un brouillon. Recharge la page.");
}

/** Envoyé -> refusé (définitif). Un brouillon ne se refuse pas : il se supprime. */
export async function refuseQuote(id: string): Promise<QuoteActionState> {
  return transition(id, "sent", { status: "refused" }, "Ce devis n'est plus « envoyé ». Recharge la page.");
}

/** Envoyé -> accepté, en une action tout ou rien (fonction `accept_quote`) ; renvoie la mission ouverte. */
export async function acceptQuote(id: string): Promise<QuoteActionState> {
  const result = await withSession(async (supabase) => {
    if (!isUuid(id)) return { kind: "gone" as const };
    const { data, error } = await supabase.rpc("accept_quote", { p_quote_id: id });
    if (error) return { kind: error.code === "P0002" ? ("gone" as const) : error.code === "23514" ? ("lost" as const) : ("error" as const) };
    const { data: row } = await supabase.from("quotes").select("client_id").eq("id", id).maybeSingle<{ client_id: string }>();
    return { kind: "saved" as const, missionId: data as string | null, clientId: row?.client_id ?? null };
  });
  if (result.status === "signed-out") redirect("/auth/login");
  if (result.status === "failed" || result.value.kind === "error") return { message: "Acceptation impossible. Rien n'a été modifié. Réessaie." };
  if (result.value.kind === "gone") return { message: NOT_FOUND };
  if (result.value.kind === "lost") return { message: "Ce devis n'est plus « envoyé ». Recharge la page." };
  const done = result.value as { clientId: string | null; missionId: string | null };
  refresh(done.clientId);
  return { missionId: done.missionId };
}

/** Seul un brouillon se supprime (la règle d'accès de la base le fait respecter). */
export async function deleteQuote(id: string): Promise<QuoteActionState> {
  const result = await withSession(async (supabase) => {
    if (!isUuid(id)) return { kind: "gone" as const };
    const { data, error } = await supabase.from("quotes").delete().eq("id", id).eq("status", "draft").select("client_id");
    if (error) return { kind: "error" as const };
    return data?.length ? { kind: "saved" as const, clientId: data[0].client_id as string } : { kind: "lost" as const };
  });
  if (result.status === "signed-out") redirect("/auth/login");
  if (result.status === "failed" || result.value.kind === "error") return { message: "Suppression impossible. Le devis est conservé. Réessaie." };
  if (result.value.kind === "gone") return { message: NOT_FOUND };
  if (result.value.kind === "lost") return { message: "Seul un brouillon se supprime, ou ce devis n'existe plus. Recharge la page." };
  refresh(result.value.clientId);
  return {};
}
