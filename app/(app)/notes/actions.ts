"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  draftTitle,
  isUuid,
  notesListHref,
  parseListFilter,
  validateNoteInput,
  type NoteErrors,
  type NoteValues,
} from "@/lib/domain/notes";
import { validateLink, type LinkErrors, type NoteLink } from "@/lib/domain/note-link";
import { indexNote } from "@/app/(app)/notes/indexing";
import { consumeAiQuota } from "@/lib/ai/quota";
import { quotaMessage } from "@/lib/domain/ai-quota";
import { createClient } from "@/lib/supabase/server";
import type { Db } from "@/lib/supabase/server";

export type NoteFormValues = {
  title: string;
  body: string;
  type: string;
  client_id: string;
  new_name: string;
  new_origin: string;
};

export type NoteFormState = {
  errors?: NoteErrors & LinkErrors;
  message?: string;
  values?: NoteFormValues;
};

export type DeleteState = { message?: string };

const SAVE_FAILED = "Enregistrement impossible. Réessaie.";
const NOT_FOUND = "Cette note n'existe plus.";
const CLIENT_GONE = "Cette fiche n'existe plus.";

type Session<T> =
  | { status: "signed-out" }
  | { status: "failed" }
  | { status: "ok"; value: T };

/** Exécute `run` avec un client authentifié ; sans session, `run` n'est jamais appelé. */
async function withSession<T>(run: (supabase: Db) => Promise<T>): Promise<Session<T>> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getClaims();
    if (error || !data?.claims) return { status: "signed-out" };
    return { status: "ok", value: await run(supabase) };
  } catch {
    return { status: "failed" };
  }
}

function readValues(formData: FormData) {
  return {
    title: String(formData.get("title") ?? ""),
    body: String(formData.get("body") ?? ""),
    type: String(formData.get("type") ?? ""),
    client_id: String(formData.get("client_id") ?? ""),
    new_name: String(formData.get("new_name") ?? ""),
    new_origin: String(formData.get("new_origin") ?? ""),
  };
}

/** Fiche à lier : null (aucune), son identifiant (existante, ou créée à l'instant comme prospect), ou "gone" / "error". */
async function resolveLink(supabase: Db, link: NoteLink): Promise<string | null | "gone" | "error"> {
  if (link.kind === "none") return null;
  if (link.kind === "existing") {
    const { data, error } = await supabase.from("clients").select("id").eq("id", link.id).maybeSingle();
    if (error) return "error";
    return data ? link.id : "gone";
  }
  // ponytail : fiche puis note en deux écritures ; si la note échoue, la fiche reste (un prospect de plus, supprimable).
  const { data, error } = await supabase
    .from("clients")
    .insert({ name: link.name, status: "prospect", origin: link.origin })
    .select("id")
    .single();
  return error ? "error" : data.id;
}

type WriteOutcome = "saved" | "not-found" | "client-gone" | "error";
/** `id` : la note enregistrée, à indexer. */
/** `skipIndex` : titre et texte inchangés et déjà indexée : rien à réindexer (pas d'appel à Mistral). */
type WriteResult = { outcome: WriteOutcome; id?: string; skipIndex?: boolean };

/** Session, validation, écriture. `write` dit si la base a enregistré, si la note n'existe plus ou si elle a échoué. */
async function save(
  values: NoteFormValues,
  write: (supabase: Db, value: NoteValues, clientId: string | null) => Promise<WriteResult>,
  back: string,
): Promise<NoteFormState> {
  const result = await withSession(async (supabase) => {
    const checked = validateNoteInput(values);
    const link = validateLink(values);
    if (!checked.ok || !link.ok) {
      return { errors: { ...(checked.ok ? {} : checked.errors), ...(link.ok ? {} : link.errors) } };
    }
    const clientId = await resolveLink(supabase, link.link);
    if (clientId === "gone") return { outcome: "client-gone" as WriteOutcome };
    if (clientId === "error") return { outcome: "error" as WriteOutcome };
    const written = await write(supabase, checked.value, clientId);
    // La note est enregistrée : l'indexation ne peut plus faire échouer la sauvegarde.
    // Plafond d'appels à l'IA atteint : la note reste « en attente » et sera reprise par l'indexation en lot.
    if (written.outcome === "saved" && written.id && !written.skipIndex && (await consumeAiQuota(supabase)) === "ok") await indexNote(supabase, written.id, checked.value);
    return { outcome: written.outcome as WriteOutcome };
  });

  // redirect() lève une exception : à appeler hors du try.
  if (result.status === "signed-out") redirect("/auth/login");
  if (result.status === "failed") return { message: SAVE_FAILED, values };
  if (result.value.errors) return { errors: result.value.errors, values };
  if (result.value.outcome === "not-found") return { message: NOT_FOUND, values };
  if (result.value.outcome === "client-gone") return { message: CLIENT_GONE, values };
  if (result.value.outcome !== "saved") return { message: SAVE_FAILED, values };

  revalidatePath("/notes");
  revalidatePath("/a-faire");
  revalidatePath("/aujourd-hui");
  redirect(back);
}

/** Retour sur la liste d'où l'on vient : le filtre est relu (types connus, brouillons), jamais une adresse reçue. */
const text = (v: unknown) => (typeof v === "string" ? v : null); // une valeur de formulaire peut être un fichier, un argument d'action un objet : seul un texte est relu
const backTo = (formData: FormData) => notesListHref(parseListFilter(text(formData.get("list_type")), text(formData.get("list_statut"))));

export async function createNote(_prev: NoteFormState, formData: FormData): Promise<NoteFormState> {
  // owner_id vient de la base (default auth.uid()) ; la RLS refuse tout autre propriétaire.
  return save(readValues(formData), async (supabase, value, clientId) => {
    const { data, error } = await supabase.from("notes").insert({ ...value, client_id: clientId }).select("id").single();
    return error ? { outcome: "error" } : { outcome: "saved", id: data.id };
  }, backTo(formData));
}

export async function updateNote(
  id: string,
  _prev: NoteFormState,
  formData: FormData,
): Promise<NoteFormState> {
  return save(readValues(formData), async (supabase, value, clientId) => {
    if (!isUuid(id)) return { outcome: "not-found" };
    // Titre et texte inchangés sur une note déjà indexée (ex. seule la fiche liée change) : pas de réindexation.
    const before = await supabase.from("notes").select("title, body, index_status").eq("id", id).maybeSingle();
    if (before.error) return { outcome: "error" };
    if (!before.data) return { outcome: "not-found" };
    const unchanged = before.data.title === value.title && before.data.body === value.body && before.data.index_status === "indexed";
    const { data, error } = await supabase
      .from("notes")
      .update({ ...value, client_id: clientId, ...(unchanged ? {} : { index_status: "pending" }) })
      .eq("id", id)
      .select("id");
    if (error) return { outcome: "error" };
    return data?.length ? { outcome: "saved", id, skipIndex: unchanged } : { outcome: "not-found" };
  }, backTo(formData));
}

/** `list` : le filtre de la liste d'où l'on vient (relu par `parseListFilter`, jamais utilisé tel quel). */
export async function deleteNote(id: string, list?: { type?: string | null; draft?: boolean }): Promise<DeleteState> {
  const result = await withSession(async (supabase): Promise<WriteOutcome> => {
    if (!isUuid(id)) return "not-found";
    const { data, error } = await supabase.from("notes").delete().eq("id", id).select("id");
    if (error) return "error";
    return data?.length ? "saved" : "not-found";
  });

  if (result.status === "signed-out") redirect("/auth/login");
  if (result.status === "failed" || result.value === "error") {
    return { message: "Suppression impossible. La note est conservée. Réessaie." };
  }
  if (result.value === "not-found") return { message: NOT_FOUND };

  revalidatePath("/notes");
  revalidatePath("/a-faire");
  revalidatePath("/aujourd-hui");
  redirect(notesListHref(parseListFilter(text(list?.type), list?.draft === true ? "brouillon" : null)));
}

export type RetryState = { message?: string };

/** Relance l'indexation d'une de mes notes (état « échec »). */
export async function retryIndexing(id: string): Promise<RetryState> {
  const result = await withSession(async (supabase): Promise<"indexed" | "failed" | "not-found" | "minute" | "day" | "error"> => {
    if (!isUuid(id)) return "not-found";
    const { data, error } = await supabase.from("notes").select("title, body").eq("id", id).maybeSingle();
    if (error) return "failed"; // erreur de lecture : pas une note supprimée
    if (!data) return "not-found";
    const quota = await consumeAiQuota(supabase);
    if (quota !== "ok") return quota;
    return indexNote(supabase, id, data);
  });

  if (result.status === "signed-out") redirect("/auth/login");
  if (result.status === "failed") return { message: "Indexation impossible pour le moment. Réessaie." };
  if (result.value === "not-found") return { message: NOT_FOUND };
  if (result.value === "minute" || result.value === "day" || result.value === "error") return { message: quotaMessage(result.value) };
  revalidatePath("/notes");
  revalidatePath("/a-faire");
  revalidatePath("/aujourd-hui");
  revalidatePath(`/notes/${id}`);
  return result.value === "failed" ? { message: "Indexation impossible pour le moment. Réessaie." } : {};
}

/** `existing` : le brouillon de cette question existait déjà (pas de doublon). */
export type DraftState = { ok: true; id: string; title: string; existing: boolean } | { ok: false; error: string };

/** Crée une note brouillon vide « À documenter : {question} » depuis l'assistant (sans texte : rien à indexer, jamais citable). */
export async function createDraftFromQuestion(question: string): Promise<DraftState> {
  const failed: DraftState = { ok: false, error: "Création impossible pour le moment. Réessaie." };
  const text = String(question ?? "").slice(0, 1000).replace(/\s+/g, " ").trim(); // borné : l'entrée vient du navigateur
  if (!text) return failed;
  const result = await withSession(async (supabase) => {
    const title = draftTitle(text);
    // Un seul brouillon par question : redemander puis recliquer ne crée pas de doublon.
    const found = await supabase.from("notes").select("id").eq("status", "draft").eq("title", title).limit(1).maybeSingle();
    if (found.data) return { id: found.data.id as string, title, existing: true };
    // État « indexée » d'emblée : une note sans texte n'a rien à indexer (comme `indexNote` pour un texte vide).
    const { data, error } = await supabase
      .from("notes")
      .insert({ title, body: "", type: "note", status: "draft", index_status: "indexed" })
      .select("id")
      .single();
    return error ? null : { id: data.id as string, title, existing: false };
  });
  if (result.status === "signed-out") redirect("/auth/login");
  if (result.status === "failed" || !result.value) return failed;
  revalidatePath("/notes");
  revalidatePath("/a-faire");
  revalidatePath("/aujourd-hui");
  return { ok: true, ...result.value };
}
