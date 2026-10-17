"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { renumber } from "@/lib/db/renumber";
import { isUuid } from "@/lib/domain/notes";
import { PROPOSAL_TASKS_MAX } from "@/lib/domain/story-proposals";
import { validateTaskTitle } from "@/lib/domain/tasks";
import { acceptsStories } from "@/lib/domain/sprints";
import { nextPosition, parseReorderIds, parseStoryStatus, validateStoryInput, type StoryErrors, type StoryValues } from "@/lib/domain/user-stories";
import { withSession } from "@/lib/supabase/with-session";

export type StoryFormValues = { title: string; role: string; benefit: string; acceptance_criteria: string; points: string; status: string };
/** `gone` : la story ou la mission n'existe plus (supprimée ailleurs) ; l'écran se recharge pour la retirer de la liste. */
/** `notice` : la story est bien enregistrée mais une partie n'a pas pu l'être (ses tâches) ; l'écran retire la proposition et dit le message. */
export type StoryFormState = { ok?: boolean; errors?: StoryErrors; message?: string; values?: StoryFormValues; gone?: boolean; sent?: number; notice?: string };
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
  write: (supabase: SupabaseClient, value: StoryValues) => Promise<{ outcome: Outcome; missionId?: string; gone?: string; failMessage?: string; notice?: string }>,
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
  if (written.outcome !== "saved") return { message: written.failMessage ?? SAVE_FAILED, values };
  return written.notice ? { ok: true, notice: written.notice } : { ok: true };
}

/** Insère une user story à la dernière place du backlog d'une de mes missions (la RLS refuse une mission qui n'est pas à moi) ; renvoie son identifiant. */
async function insertStory(
  supabase: SupabaseClient,
  missionId: string,
  value: StoryValues,
  source: string | null,
): Promise<{ outcome: Outcome; missionId?: string; gone?: string; id?: string }> {
  if (!isUuid(missionId)) return { outcome: "not-found", gone: MISSION_GONE };
  const mission = await supabase.from("missions").select("id, client_id").eq("id", missionId).maybeSingle();
  if (mission.error) return { outcome: "error" };
  if (!mission.data) return { outcome: "not-found", gone: MISSION_GONE };
  // La note d'origine doit être une note de la fiche de cette mission ; si elle a disparu (supprimée pendant la relecture) ou n'en est pas une,
  // la story est gardée sans source plutôt que de buter sur une clé étrangère.
  let sourceId: string | null = null;
  if (source) {
    const note = await supabase.from("notes").select("id").eq("id", source).eq("client_id", mission.data.client_id).maybeSingle();
    if (note.error) return { outcome: "error" };
    sourceId = note.data ? source : null;
  }
  const last = await supabase.from("user_stories").select("position").eq("mission_id", missionId).is("sprint_id", null).order("position", { ascending: false }).limit(1);
  if (last.error) return { outcome: "error" };
  const { data, error } = await supabase
    .from("user_stories")
    .insert({ ...value, mission_id: missionId, position: nextPosition(last.data.map((r) => r.position)), source_note_id: sourceId })
    .select("id")
    .single();
  return error || !data ? { outcome: "error" } : { outcome: "saved", missionId, id: data.id as string };
}

/** Ajoute une user story à la dernière place du backlog d'une de mes missions (la RLS refuse une mission qui n'est pas à moi). */
export async function addStory(missionId: string, _prev: StoryFormState, formData: FormData): Promise<StoryFormState> {
  // Note d'origine d'une proposition de l'IA gardée (facultative) : la base refuse une note qui n'est pas à moi.
  const rawSource = String(formData.get("source_note_id") ?? "");
  const source = isUuid(rawSource) ? rawSource : null;
  return save(readValues(formData), (supabase, value) => insertStory(supabase, missionId, value, source));
}

/**
 * Ajoute une proposition de l'IA avec ses tâches (8.17b) : la story, puis ses tâches en UNE insertion. Tout ou rien : si les tâches échouent, la story est retirée
 * et le message le dit ; si ce retrait échoue aussi, le message dit que la story est dans le backlog sans ses tâches.
 * ponytail : compensation en deux écritures, pas une transaction ; une fonction SQL si une panne entre les deux devient gênante.
 */
export async function addStoryWithTasks(missionId: string, taskTitles: string[], _prev: StoryFormState, formData: FormData): Promise<StoryFormState> {
  const rawSource = String(formData.get("source_note_id") ?? "");
  const source = isUuid(rawSource) ? rawSource : null;
  const values = readValues(formData);
  return save(values, async (supabase, value) => {
    // Titres contrôlés avant toute écriture (et après la session : sans connexion, c'est la redirection qui répond), en nommant la tâche en cause.
    const titles: string[] = [];
    if (!Array.isArray(taskTitles) || taskTitles.length > PROPOSAL_TASKS_MAX) return { outcome: "error", failMessage: `Une proposition a ${PROPOSAL_TASKS_MAX} tâches au plus.` };
    for (const [i, raw] of taskTitles.entries()) {
      const checked = validateTaskTitle(raw);
      if (!checked.ok) return { outcome: "error", failMessage: `Tâche ${i + 1} : ${checked.error}` };
      titles.push(checked.value);
    }
    const story = await insertStory(supabase, missionId, value, source);
    if (story.outcome !== "saved" || !story.id || titles.length === 0) return story;
    // Une exception (et non seulement une erreur renvoyée) pendant les tâches suit le même chemin : la story vient d'être créée, il faut la retirer ou le dire.
    let tasksSaved = false;
    try {
      tasksSaved = !(await supabase.from("tasks").insert(titles.map((title, position) => ({ story_id: story.id, title, position })))).error;
    } catch {
      tasksSaved = false;
    }
    if (tasksSaved) return story;
    let undone = false;
    try {
      const removed = await supabase.from("user_stories").delete().eq("id", story.id).select("id");
      undone = !removed.error && !!removed.data?.length;
    } catch {
      undone = false;
    }
    if (undone) return { outcome: "error", failMessage: "Les tâches n'ont pas pu être ajoutées : rien n'a été ajouté. Réessaie." };
    // La story existe sans ses tâches : c'est un succès partiel (la proposition est retirée de l'écran, sinon un second « Garder » ferait un doublon).
    return { outcome: "saved", missionId: story.missionId, notice: "La user story a été ajoutée sans ses tâches (elles n'ont pas pu l'être). Ajoute-les depuis la story." };
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

/** Nouvel ordre d'une liste après un glisser-déposer : `ids` est la liste complète des stories du sprint (ou du backlog hors sprint si `sprintId` est nul), dans l'ordre voulu. */
export async function reorderStories(missionId: string, ids: string[], sprintId: string | null = null): Promise<StoryActionState> {
  const result = await withSession(async (supabase): Promise<Outcome> => {
    const order = parseReorderIds(ids);
    if (!isUuid(missionId) || !order || (sprintId !== null && !isUuid(String(sprintId)))) return "not-found";
    if (sprintId !== null) {
      const sprint = await supabase.from("sprints").select("status").eq("id", sprintId).maybeSingle();
      if (sprint.error) return "error";
      if (!sprint.data || sprint.data.status === "closed") return "not-found"; // sprint disparu ou clos : liste figée, l'écran se recharge
    }
    // La liste ordonnée est celle d'un sprint (`sprintId`) ou le backlog hors sprint (`null`) : les positions ne se comparent qu'à l'intérieur d'une liste.
    const done = await renumber(supabase, "user_stories", { column: "mission_id", id: missionId }, order, { column: "sprint_id", id: sprintId });
    await refresh(supabase, missionId); // même en cas d'échec ou de conflit : l'écran montre l'état réel
    return done === "saved" ? "saved" : done === "changed" ? "not-found" : "error";
  });
  if (result.status === "signed-out") redirect("/auth/login");
  if (result.status === "failed" || result.value === "error") return { message: "Déplacement impossible pour le moment. Réessaie." };
  if (result.value === "not-found") return { message: "Le backlog a changé entre-temps. Il est rechargé : recommence le déplacement.", gone: true };
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

type Placed = "saved" | "story-gone" | "sprint-gone" | "closed" | "source-closed" | "error";

/** Place une story à la dernière place de la liste d'arrivée (un sprint non clos de la même mission, ou le backlog si `sprintId` est nul). */
async function place(supabase: SupabaseClient, storyId: string, sprintId: string | null, expectedMissionId?: string): Promise<Placed> {
  if (!isUuid(storyId) || (sprintId !== null && !isUuid(String(sprintId)))) return "story-gone";
  const story = await supabase.from("user_stories").select("mission_id, sprint:sprints(status)").eq("id", storyId).maybeSingle();
  if (story.error) return "error";
  if (!story.data) return "story-gone";
  const missionId = story.data.mission_id as string;
  if (expectedMissionId !== undefined && expectedMissionId !== missionId) return "story-gone";
  // Le contenu d'un sprint clos est figé : la story n'en sort plus (l'écran le sait déjà, le serveur le garantit aussi).
  const from = story.data.sprint as unknown as { status: string } | null;
  if (from?.status === "closed") return "source-closed";
  if (sprintId !== null) {
    const sprint = await supabase.from("sprints").select("status, mission_id").eq("id", sprintId).maybeSingle();
    if (sprint.error) return "error";
    if (!sprint.data || sprint.data.mission_id !== missionId) return "sprint-gone";
    if (!acceptsStories(sprint.data.status)) return "closed";
  }
  let last = supabase.from("user_stories").select("position").eq("mission_id", missionId).order("position", { ascending: false }).limit(1);
  last = sprintId === null ? last.is("sprint_id", null) : last.eq("sprint_id", sprintId);
  const tail = await last;
  if (tail.error) return "error";
  const { data, error } = await supabase.from("user_stories").update({ sprint_id: sprintId, position: nextPosition(tail.data.map((r) => r.position)) }).eq("id", storyId).select("id");
  if (error) return "error";
  if (!data?.length) return "story-gone";
  await refresh(supabase, missionId);
  return "saved";
}

function placedMessage(placed: Placed): StoryActionState {
  if (placed === "error") return { message: "Déplacement impossible pour le moment. Réessaie." };
  if (placed === "story-gone") return { message: STORY_GONE, gone: true };
  if (placed === "sprint-gone") return { message: "Ce sprint n'existe plus.", gone: true };
  if (placed === "closed") return { message: "Ce sprint est clos : il n'accepte plus de story.", gone: true };
  if (placed === "source-closed") return { message: "Cette story est dans un sprint clos : elle n'en sort plus.", gone: true };
  return {};
}

/**
 * Place une story dans un sprint (planifié ou en cours), ou la remet au backlog (`sprintId` nul), à la dernière place de la liste d'arrivée.
 * Un sprint clos n'accepte plus de story ; le sprint doit être de la même mission (la policy le garantit aussi).
 */
export async function setStorySprint(storyId: string, sprintId: string | null): Promise<StoryActionState> {
  const result = await withSession((supabase) => place(supabase, storyId, sprintId));
  if (result.status === "signed-out") redirect("/auth/login");
  if (result.status === "failed") return placedMessage("error");
  return placedMessage(result.value);
}

/**
 * Glisser-déposer entre listes : place la story dans la liste d'arrivée (`sprintId`, nul = backlog) puis y applique l'ordre voulu (`ids` : toute la liste d'arrivée,
 * story comprise). Si la liste a changé entre-temps, la story reste en dernière place de la liste d'arrivée et l'écran se recharge.
 * ponytail : deux écritures non atomiques (placer, puis renuméroter) ; une procédure stockée si une panne entre les deux devient gênante.
 */
export async function moveStory(missionId: string, storyId: string, sprintId: string | null, ids: string[]): Promise<StoryActionState> {
  const result = await withSession(async (supabase): Promise<Placed | "changed" | "order-lost"> => {
    const order = parseReorderIds(ids);
    if (typeof storyId !== "string" || !isUuid(missionId) || !order || !order.includes(storyId.toLowerCase())) return "story-gone";
    const placed = await place(supabase, storyId, sprintId, missionId);
    if (placed !== "saved") return placed;
    const done = await renumber(supabase, "user_stories", { column: "mission_id", id: missionId }, order, { column: "sprint_id", id: sprintId });
    await refresh(supabase, missionId);
    return done === "saved" ? "saved" : done === "changed" ? "changed" : "order-lost";
  });
  if (result.status === "signed-out") redirect("/auth/login");
  if (result.status === "failed") return placedMessage("error");
  // La story a bien changé de liste mais son ordre n'est pas enregistré : l'écran se recharge pour montrer l'état réel.
  if (result.value === "order-lost") return { message: "La story a changé de liste, mais sa place n'a pas pu être enregistrée. Elle est en dernière place.", gone: true };
  if (result.value === "changed") return { message: "La liste a changé entre-temps. Elle est rechargée : recommence le déplacement.", gone: true };
  return placedMessage(result.value);
}
