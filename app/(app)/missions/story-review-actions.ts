"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { reviewWithClaude } from "@/lib/ai/story-review";
import { notesForProposal } from "@/lib/db/proposal-notes";
import { isUuid } from "@/lib/domain/notes";
import { limitNotes } from "@/lib/domain/story-proposals";
import { REVIEW_FIELDS, buildReviewMessage, mergeReview, reviewSources, toFieldValues, verifyReview, type FieldChange, type FieldValues, type Remark } from "@/lib/domain/story-review";
import { validateHint } from "@/lib/domain/tasks";
import { parseStoryStatus } from "@/lib/domain/user-stories";
import type { TablesUpdate } from "@/lib/supabase/server";
import { withSession } from "@/lib/supabase/with-session";

export type ReviewState = { ok: true; remarks: Remark[]; changes: FieldChange[]; dropped: number; noteCut: boolean; base: FieldValues } | { ok: false; error: string };
export type ApplyState = { ok: true; applied: (keyof FieldValues)[] } | { ok: false; error: string; gone?: boolean };

const FAILED = "Relecture impossible pour le moment. Réessaie.";
const STORY_GONE = "Cette user story n'existe plus.";
const COLUMNS = "title, role, benefit, acceptance_criteria, points, status";

/**
 * Relit une de mes user stories : la story, la mission et le client, les titres des autres stories, sa note d'origine (seulement si elle est à moi, active et de la fiche
 * du client de la mission) et ma précision. N'écrit rien : la relecture n'existe qu'à l'écran tant que l'utilisateur n'applique pas. Sans session : connexion.
 * Toutes les vérifications sont faites sous la session.
 */
export async function reviewStory(storyId: string, hint: string): Promise<ReviewState> {
  const result = await withSession(async (supabase): Promise<ReviewState> => {
    const checkedHint = validateHint(hint);
    if (!checkedHint.ok) return { ok: false, error: checkedHint.error };
    const text = checkedHint.value;
    if (!isUuid(String(storyId))) return { ok: false, error: STORY_GONE };

    const found = await supabase.from("user_stories").select(`mission_id, source_note_id, ${COLUMNS}, mission:missions(title, client_id, client:clients(name))`).eq("id", storyId).maybeSingle();
    if (found.error) throw new Error(`story ${found.error.code ?? ""}`.trim());
    if (!found.data) return { ok: false, error: STORY_GONE };
    const story = found.data;
    const mission = story.mission;
    if (!mission) return { ok: false, error: STORY_GONE };

    const others = await supabase.from("user_stories").select("title").eq("mission_id", story.mission_id).neq("id", storyId).order("position", { ascending: true });
    if (others.error) throw new Error(`backlog ${others.error.code ?? ""}`.trim());
    const otherTitles = others.data.map((s) => s.title as string);

    // Note d'origine : même requête que le backlog et les tâches ; un lien mort est simplement ignoré.
    const notes = story.source_note_id ? await notesForProposal(supabase, mission.client_id, [story.source_note_id as string]) : [];
    const { kept, cut } = limitNotes(notes);
    const note = kept[0] ?? null;

    const current = { title: story.title, role: story.role, benefit: story.benefit, acceptance_criteria: story.acceptance_criteria, points: story.points };
    const message = buildReviewMessage({ missionTitle: mission.title, clientName: mission.client?.name ?? "", story: current, otherTitles, hint: text, note });
    let raw: Record<string, unknown>;
    try {
      raw = await reviewWithClaude(message);
    } catch (e) {
      // Journal sans contenu de story, de note ni de précision, ni clé : seulement la nature de l'échec.
      console.error("Relecture de story impossible :", e instanceof Error ? e.message : "erreur inconnue");
      throw e;
    }
    const review = verifyReview(raw, current, reviewSources({ hint: text, missionTitle: mission.title, clientName: mission.client?.name, story: current, otherTitles, note }), otherTitles);
    return { ok: true, ...review, noteCut: cut > 0, base: toFieldValues(current) };
  });

  // redirect() lève une exception : à appeler hors du try.
  if (result.status === "signed-out") redirect("/auth/login");
  if (result.status === "failed") return { ok: false, error: FAILED };
  return result.value;
}

/**
 * Applique les champs choisis d'une relecture. `base` est ce que l'utilisateur a relu : si un champ choisi a changé depuis (autre onglet), rien n'est écrit.
 * Seuls les champs choisis sont écrits (jamais le statut, la position, le sprint ni les tâches) ; l'écriture elle-même est conditionnée à la date de dernière modification lue
 * (même lecture-puis-écriture que `setStoryStatus`, mais refusée si la ligne a bougé entre les deux : condition sur `updated_at`).
 */
export async function applyStoryReview(storyId: string, base: FieldValues, chosen: Partial<FieldValues>): Promise<ApplyState> {
  const result = await withSession(async (supabase): Promise<ApplyState> => {
    if (!isUuid(String(storyId))) return { ok: false, error: STORY_GONE, gone: true };
    const asText = (o: unknown): Partial<FieldValues> => {
      const out: Partial<FieldValues> = {};
      if (o && typeof o === "object") for (const f of REVIEW_FIELDS) if (typeof (o as Record<string, unknown>)[f] === "string") out[f] = (o as Record<string, string>)[f];
      return out;
    };
    const baseText = asText(base);
    const picked = asText(chosen);
    // `base` doit être complet pour chaque champ choisi.
    for (const f of Object.keys(picked) as (keyof FieldValues)[]) if (typeof baseText[f] !== "string") return { ok: false, error: "Relance la relecture." };

    const found = await supabase.from("user_stories").select(`mission_id, updated_at, ${COLUMNS}`).eq("id", storyId).maybeSingle();
    if (found.error) throw new Error(`story ${found.error.code ?? ""}`.trim());
    if (!found.data) return { ok: false, error: STORY_GONE, gone: true };
    const status = parseStoryStatus(found.data.status);
    if (!status) return { ok: false, error: FAILED };
    const current = toFieldValues({ title: found.data.title, role: found.data.role, benefit: found.data.benefit, acceptance_criteria: found.data.acceptance_criteria, points: found.data.points });
    const merged = mergeReview({ ...current, ...baseText }, current, status, picked);
    if (!merged.ok) return { ok: false, error: merged.error, gone: merged.changed };

    // Écriture conditionnée à la ligne telle que je viens de la lire (sa date de dernière modification) : une modification arrivée entre la lecture et l'écriture
    // fait refuser (aucune ligne touchée). Une condition sur chaque champ mettrait jusqu'à 4 000 caractères de critères dans l'URL de la requête.
    const values: Record<string, string | number | null> = {};
    for (const f of REVIEW_FIELDS) {
      if (merged.fields[f] === undefined) continue;
      const v = merged.fields[f] as string;
      values[f] = f === "title" ? v : v === "" ? null : f === "points" ? Number(v) : v;
    }
    const query = supabase.from("user_stories").update(values as TablesUpdate<"user_stories">).eq("id", storyId).eq("updated_at", found.data.updated_at as string);
    const { data, error } = await query.select("id");
    if (error) throw new Error(`mise à jour ${error.code ?? ""}`.trim());
    if (!data?.length) return { ok: false, error: "Cette story a changé entre-temps. Relance la relecture.", gone: true };
    revalidatePath(`/missions/${found.data.mission_id}`);
    revalidatePath("/missions");
    return { ok: true, applied: Object.keys(merged.fields) as (keyof FieldValues)[] };
  });

  if (result.status === "signed-out") redirect("/auth/login");
  if (result.status === "failed") return { ok: false, error: "Enregistrement impossible. Réessaie." };
  return result.value;
}
