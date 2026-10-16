"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { isUuid } from "@/lib/domain/notes";
import { nextPosition, parseStoryStatus, reorder, validateStoryInput, type StoryErrors, type StoryValues } from "@/lib/domain/user-stories";
import { withSession } from "@/lib/supabase/with-session";

export type StoryFormValues = { title: string; role: string; benefit: string; acceptance_criteria: string; points: string; status: string };
/** `gone` : la story ou la mission n'existe plus (supprimée ailleurs) ; l'écran se recharge pour la retirer de la liste. */
export type StoryFormState = { ok?: boolean; errors?: StoryErrors; message?: string; values?: StoryFormValues; gone?: boolean; sent?: number };
export type StoryActionState = { message?: string; gone?: boolean };

const SAVE_FAILED = "Enregistrement impossible. Réessaie.";
const MISSION_GONE = "Cette mission n'existe plus.";
const STORY_GONE = "Cette user story n'existe plus.";

const readValues = (formData: FormData): StoryFormValues => ({
  title: String(formData.get("title") ?? ""),
  role: String(formData.get("role") ?? ""),
  benefit: String(formData.get("benefit") ?? ""),
  acceptance_criteria: String(formData.get("acceptance_criteria") ?? ""),
  points: String(formData.get("points") ?? ""),
  status: String(formData.get("status") ?? ""),
});

type Outcome = "saved" | "not-found" | "error";

/** Les pages qui affichent le backlog ou son avancement : la mission, la liste des missions et la fiche du client. */
async function refresh(supabase: SupabaseClient, missionId: string) {
  revalidatePath(`/missions/${missionId}`);
  revalidatePath("/missions");
  try {
    const { data } = await supabase.from("missions").select("client_id").eq("id", missionId).maybeSingle();
    if (data?.client_id) revalidatePath(`/clients/${data.client_id}`);
  } catch {
    // La story est enregistrée : une lecture qui échoue ici ne doit pas faire croire à un échec (la fiche se mettra à jour à la prochaine visite).
  }
}

/** Session, validation, écriture d'une user story ; `write` dit si la base a enregistré ou si la mission ou la story a disparu. */
async function save(
  values: StoryFormValues,
  write: (supabase: SupabaseClient, value: StoryValues) => Promise<{ outcome: Outcome; missionId?: string; gone?: string }>,
): Promise<StoryFormState> {
  const result = await withSession(async (supabase) => {
    const checked = validateStoryInput(values);
    if (!checked.ok) return { errors: checked.errors } as const;
    const written = await write(supabase, checked.value);
    if (written.outcome === "saved" && written.missionId) await refresh(supabase, written.missionId);
    return { written } as const;
  });

  if (result.status === "signed-out") redirect("/auth/login");
  if (result.status === "failed") return { message: SAVE_FAILED, values };
  if ("errors" in result.value) return { errors: result.value.errors, values };
  const { written } = result.value;
  if (written.outcome === "not-found") return { message: written.gone ?? STORY_GONE, values, gone: true };
  if (written.outcome !== "saved") return { message: SAVE_FAILED, values };
  return { ok: true };
}

/** Ajoute une user story à la dernière place du backlog d'une de mes missions (la RLS refuse une mission qui n'est pas à moi). */
export async function addStory(missionId: string, _prev: StoryFormState, formData: FormData): Promise<StoryFormState> {
  // Note d'origine d'une proposition de l'IA gardée (facultative) : la base refuse une note qui n'est pas à moi.
  const rawSource = String(formData.get("source_note_id") ?? "");
  const source = isUuid(rawSource) ? rawSource : null;
  return save(readValues(formData), async (supabase, value) => {
    if (!isUuid(missionId)) return { outcome: "not-found", gone: MISSION_GONE };
    const mission = await supabase.from("missions").select("id").eq("id", missionId).maybeSingle();
    if (mission.error) return { outcome: "error" };
    if (!mission.data) return { outcome: "not-found", gone: MISSION_GONE };
    const last = await supabase.from("user_stories").select("position").eq("mission_id", missionId).order("position", { ascending: false }).limit(1);
    if (last.error) return { outcome: "error" };
    const { error } = await supabase.from("user_stories").insert({ ...value, mission_id: missionId, position: nextPosition(last.data.map((r) => r.position)), source_note_id: source });
    return error ? { outcome: "error" } : { outcome: "saved", missionId };
  });
}

export async function updateStory(id: string, _prev: StoryFormState, formData: FormData): Promise<StoryFormState> {
  return save(readValues(formData), async (supabase, value) => {
    if (!isUuid(id)) return { outcome: "not-found" };
    const { data, error } = await supabase.from("user_stories").update(value).eq("id", id).select("id, mission_id");
    if (error) return { outcome: "error" };
    return data?.length ? { outcome: "saved", missionId: data[0].mission_id } : { outcome: "not-found" };
  });
}

/** Un clic sur le menu de statut : seul le statut change. */
export async function setStoryStatus(id: string, status: string): Promise<StoryActionState> {
  const next = parseStoryStatus(status);
  if (!next) return { message: "Choisis un statut." };
  const result = await withSession(async (supabase): Promise<Outcome> => {
    if (!isUuid(id)) return "not-found";
    const { data, error } = await supabase.from("user_stories").update({ status: next }).eq("id", id).select("id, mission_id");
    if (error) return "error";
    if (!data?.length) return "not-found";
    await refresh(supabase, data[0].mission_id);
    return "saved";
  });
  if (result.status === "signed-out") redirect("/auth/login");
  if (result.status === "failed" || result.value === "error") return { message: "Changement impossible pour le moment. Réessaie." };
  if (result.value === "not-found") return { message: STORY_GONE, gone: true };
  return {};
}

/**
 * Monte ou descend une story d'une place. Le backlog est relu, réordonné puis renuméroté (0, 1, 2…) : c'est lisible et ça répare d'éventuels doublons.
 * ponytail : une mise à jour par story déplacée, non atomique ; un backlog compte quelques dizaines de stories, une procédure stockée au-delà.
 */
export async function moveStory(id: string, direction: "up" | "down"): Promise<StoryActionState> {
  const result = await withSession(async (supabase): Promise<Outcome> => {
    if (!isUuid(id) || (direction !== "up" && direction !== "down")) return "not-found";
    const story = await supabase.from("user_stories").select("mission_id").eq("id", id).maybeSingle();
    if (story.error) return "error";
    if (!story.data) return "not-found";
    const missionId = story.data.mission_id as string;
    const all = await supabase.from("user_stories").select("id, position").eq("mission_id", missionId).order("position", { ascending: true }).order("created_at", { ascending: true });
    if (all.error) return "error";
    // Supprimée entre les deux lectures : on ne prétend pas l'avoir déplacée.
    if (!all.data.some((r) => r.id === id)) return "not-found";
    const next = reorder(all.data.map((r) => r.id as string), id, direction);
    if (!next) return "saved"; // déjà en haut ou en bas : rien à faire
    const current = new Map(all.data.map((r) => [r.id as string, r.position as number]));
    for (const [rank, storyId] of next.entries()) {
      if (current.get(storyId) === rank) continue;
      const { data, error } = await supabase.from("user_stories").update({ position: rank }).eq("id", storyId).select("id");
      if (error || !data?.length) {
        await refresh(supabase, missionId); // l'ordre a peut-être changé en route : l'écran montre l'état réel
        return error ? "error" : "not-found";
      }
    }
    await refresh(supabase, missionId);
    return "saved";
  });
  if (result.status === "signed-out") redirect("/auth/login");
  if (result.status === "failed" || result.value === "error") return { message: "Déplacement impossible pour le moment. Réessaie." };
  if (result.value === "not-found") return { message: STORY_GONE, gone: true };
  return {};
}

export async function deleteStory(id: string): Promise<StoryActionState> {
  const result = await withSession(async (supabase): Promise<Outcome> => {
    if (!isUuid(id)) return "not-found";
    const { data, error } = await supabase.from("user_stories").delete().eq("id", id).select("id, mission_id");
    if (error) return "error";
    // Déjà supprimée (autre onglet, double clic) : l'état voulu est atteint.
    if (data?.length) await refresh(supabase, data[0].mission_id);
    return "saved";
  });
  if (result.status === "signed-out") redirect("/auth/login");
  if (result.status === "failed" || result.value === "error") return { message: "Suppression impossible. La user story est conservée. Réessaie." };
  return {};
}
