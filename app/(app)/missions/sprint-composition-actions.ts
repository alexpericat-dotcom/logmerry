"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { consumeAiQuota } from "@/lib/ai/quota";
import { quotaMessage } from "@/lib/domain/ai-quota";
import { composeWithClaude } from "@/lib/ai/sprint-composition";
import { renumber } from "@/lib/db/renumber";
import { isUuid } from "@/lib/domain/notes";
import {
  BACKLOG_MAX,
  PLACE_MAX,
  buildComposeMessage,
  composeSources,
  validateCapacity,
  verifyComposition,
} from "@/lib/domain/sprint-composition";
import { SPRINT_GOAL_MAX, acceptsStories, parseSprintStatus } from "@/lib/domain/sprints";
import { validateHint } from "@/lib/domain/tasks";
import { nextPosition, parseReorderIds } from "@/lib/domain/user-stories";
import { withSession } from "@/lib/supabase/with-session";

export type ComposeStory = { id: string; title: string; points: number | null; reason: string };
export type ComposeState =
  | { ok: true; stories: ComposeStory[]; goal: string | null; dropped: number; droppedTexts: number; cutBacklog: boolean; placedPoints: number; capacity: number | null; sprintName: string }
  | { ok: false; error: string };
/** `goalSkipped` : le sprint avait déjà un objectif ; `goalFailed` : l'objectif n'a pas pu être écrit. `ok: false` avec `gone` : la proposition est périmée (`placed` : stories déjà placées malgré tout). */
export type PlaceState = { ok: true; placed: number; goalSet: boolean; goalSkipped: boolean; goalFailed: boolean } | { ok: false; error: string; gone?: boolean; placed?: number };

const FAILED = "Proposition impossible pour le moment. Réessaie.";
const SPRINT_GONE = "Ce sprint n'existe plus.";
const SPRINT_CLOSED = "Ce sprint est clos : il n'accepte plus de story.";
const CHANGED = "Une story a changé de liste entre-temps. Relance la proposition.";
const SPRINT_COLUMNS = "name, goal, start_date, end_date, status, mission_id";

/**
 * Propose des stories du backlog pour un de mes sprints non clos : le sprint et sa durée, ce qui y est déjà, le backlog hors sprint dans l'ordre de priorité
 * (stories terminées exclues, 60 au plus), ma capacité visée et ma précision. N'écrit rien. Sans session : connexion. Toutes les vérifications sont faites sous la session.
 */
export async function composeSprint(sprintId: string, capacity: unknown, hint: string): Promise<ComposeState> {
  const result = await withSession(async (supabase): Promise<ComposeState> => {
    const cap = validateCapacity(capacity);
    if (!cap.ok) return { ok: false, error: cap.error };
    const checkedHint = validateHint(hint);
    if (!checkedHint.ok) return { ok: false, error: checkedHint.error };
    const text = checkedHint.value;
    if (!isUuid(String(sprintId))) return { ok: false, error: SPRINT_GONE };
    sprintId = String(sprintId).toLowerCase(); // `isUuid` accepte les majuscules, la comparaison avec `sprint_id` ne les accepterait pas

    const found = await supabase.from("sprints").select(`${SPRINT_COLUMNS}, mission:missions(title, client:clients(name))`).eq("id", sprintId).maybeSingle();
    if (found.error) throw new Error(`sprint ${found.error.code ?? ""}`.trim());
    if (!found.data) return { ok: false, error: SPRINT_GONE };
    const status = parseSprintStatus(found.data.status);
    if (!status || !acceptsStories(status)) return { ok: false, error: SPRINT_CLOSED };
    const mission = found.data.mission;
    if (!mission) return { ok: false, error: SPRINT_GONE };

    const all = await supabase
      .from("user_stories")
      .select("id, title, role, benefit, acceptance_criteria, points, status, sprint_id")
      .eq("mission_id", found.data.mission_id)
      .order("position", { ascending: true })
      .order("created_at", { ascending: true });
    if (all.error) throw new Error(`backlog ${all.error.code ?? ""}`.trim());
    const placed = all.data.filter((s) => s.sprint_id === sprintId).map((s) => ({ title: s.title as string, points: s.points as number | null }));
    const open = all.data.filter((s) => s.sprint_id === null && s.status !== "done");
    // Rien à placer : on le dit sans appeler Claude (un appel sans backlog inventerait des stories).
    if (open.length === 0) return { ok: false, error: "Le backlog est vide : rien à placer dans ce sprint." };
    const backlog = open.slice(0, BACKLOG_MAX);

    const sprint = { name: found.data.name as string, goal: found.data.goal as string | null, start_date: found.data.start_date as string, end_date: found.data.end_date as string };
    const input = { missionTitle: mission.title, clientName: mission.client?.name ?? "", sprint, placed, backlog, capacity: cap.value, hint: text };
    const quota = await consumeAiQuota(supabase);
    if (quota !== "ok") return { ok: false, error: quotaMessage(quota) };
    let raw: Record<string, unknown>;
    try {
      raw = await composeWithClaude(buildComposeMessage(input));
    } catch (e) {
      // Journal sans contenu de story, de précision ni clé : seulement la nature de l'échec.
      console.error("Composition de sprint impossible :", e instanceof Error ? e.message : "erreur inconnue");
      throw e;
    }
    const composition = verifyComposition(raw, { backlogIds: backlog.map((b) => b.id), sources: composeSources(input), hasGoal: !!sprint.goal });
    if (composition.picks.length === 0) return { ok: false, error: "L'IA n'a rien proposé d'exploitable. Précise ta capacité ou ta précision." };
    const byId = new Map(backlog.map((b) => [b.id.toLowerCase(), b]));
    const stories = composition.picks.map((p) => ({ id: byId.get(p.id)!.id, title: byId.get(p.id)!.title, points: byId.get(p.id)!.points, reason: p.reason }));
    return {
      ok: true,
      stories,
      goal: composition.goal,
      dropped: composition.dropped,
      droppedTexts: composition.droppedTexts,
      cutBacklog: open.length > BACKLOG_MAX,
      placedPoints: placed.reduce((sum, p) => sum + (p.points ?? 0), 0),
      capacity: cap.value,
      sprintName: sprint.name,
    };
  });

  // redirect() lève une exception : à appeler hors du try.
  if (result.status === "signed-out") redirect("/auth/login");
  if (result.status === "failed") return { ok: false, error: FAILED };
  return result.value;
}

/**
 * Place des stories du backlog à la fin d'un sprint non clos, dans l'ordre donné, et met à jour l'objectif du sprint s'il n'en a pas. Rien n'est écrit si le sprint est clos
 * ou supprimé, ou si une story n'est plus au backlog de la même mission. Le nom, les dates, les points et le statut ne changent jamais. Les stories passent d'abord toutes
 * en queue de liste (une écriture, conditionnée au backlog), puis la liste du sprint est renumérotée dans l'ordre demandé.
 * ponytail : deux écritures non atomiques (comme le glisser-déposer entre listes) ; une fonction SQL si une panne entre les deux devient gênante.
 */
export async function placeStoriesInSprint(sprintId: string, storyIds: string[], goal: string | null): Promise<PlaceState> {
  const result = await withSession(async (supabase): Promise<PlaceState> => {
    const order = parseReorderIds(storyIds);
    if (!isUuid(String(sprintId))) return { ok: false, error: SPRINT_GONE, gone: true };
    if (!order || order.length === 0 || order.length > PLACE_MAX || new Set(order).size !== order.length) return { ok: false, error: "Coche au moins une story à placer." };
    let goalText: string | null = null;
    if (goal !== null && goal !== undefined) {
      if (typeof goal !== "string") return { ok: false, error: "L'objectif doit être du texte." };
      goalText = goal.replaceAll("\u0000", "").trim() || null;
      if (goalText && [...goalText].length > SPRINT_GOAL_MAX) return { ok: false, error: `L'objectif doit faire ${SPRINT_GOAL_MAX} caractères au plus.` };
    }

    const sprint = await supabase.from("sprints").select(SPRINT_COLUMNS).eq("id", sprintId).maybeSingle();
    if (sprint.error) throw new Error(`sprint ${sprint.error.code ?? ""}`.trim());
    if (!sprint.data) return { ok: false, error: SPRINT_GONE, gone: true };
    const status = parseSprintStatus(sprint.data.status);
    if (!status || !acceptsStories(status)) return { ok: false, error: SPRINT_CLOSED, gone: true };
    const missionId = sprint.data.mission_id as string;

    // Chaque story doit toujours être au backlog, de la même mission que le sprint (la RLS filtre déjà les autres comptes).
    const rows = await supabase.from("user_stories").select("id, mission_id, sprint_id, status").in("id", order);
    if (rows.error) throw new Error(`stories ${rows.error.code ?? ""}`.trim());
    if (rows.data.length !== order.length || rows.data.some((r) => r.mission_id !== missionId || r.sprint_id !== null || r.status === "done")) return { ok: false, error: CHANGED, gone: true };

    const inSprint = await supabase.from("user_stories").select("id, position").eq("mission_id", missionId).eq("sprint_id", sprintId).order("position", { ascending: true }).order("created_at", { ascending: true });
    if (inSprint.error) throw new Error(`sprint ${inSprint.error.code ?? ""}`.trim());
    const existing = inSprint.data.map((r) => r.id as string);
    const tail = nextPosition(inSprint.data.map((r) => r.position as number));

    // La condition vit dans l'écriture elle-même : « toujours au backlog » et « pas terminée » (un changement arrivé depuis la lecture fait refuser la story).
    const moved = await supabase.from("user_stories").update({ sprint_id: sprintId, position: tail }).in("id", order).is("sprint_id", null).neq("status", "done").select("id");
    // Le sprint clos entre la lecture et l'écriture : le déclencheur de la base refuse, on le dit comme le contrôle d'avant.
    if (moved.error?.code === "23514") return { ok: false, error: SPRINT_CLOSED, gone: true };
    if (moved.error) throw new Error(`placement ${moved.error.code ?? ""}`.trim());
    // Une story partie entre la lecture et l'écriture : celles qui ont été placées le sont, leur ordre est enregistré, et on le dit (l'écran se recharge).
    const placedIds = new Set((moved.data ?? []).map((r) => r.id as string));
    if (placedIds.size !== order.length) {
      if (placedIds.size > 0) await renumber(supabase, "user_stories", { column: "mission_id", id: missionId }, [...existing, ...order.filter((id) => placedIds.has(id))], { column: "sprint_id", id: sprintId });
      revalidatePath(`/missions/${missionId}`);
      revalidatePath("/missions");
      return { ok: false, error: `${placedIds.size} stor${placedIds.size > 1 ? "ies sur" : "y sur"} ${order.length} ${placedIds.size > 1 ? "ont" : "a"} été placée${placedIds.size > 1 ? "s" : ""} ; les autres ont changé de liste entre-temps. Relance la proposition.`, gone: true, placed: placedIds.size };
    }
    const done = await renumber(supabase, "user_stories", { column: "mission_id", id: missionId }, [...existing, ...order], { column: "sprint_id", id: sprintId });
    let goalSet = false;
    let goalSkipped = false;
    let goalFailed = false;
    if (goalText) {
      // L'objectif existant n'est jamais écrasé et un sprint clos entre-temps n'est pas touché : l'écriture est conditionnée à « pas d'objectif » et « pas clos ».
      const g = await supabase.from("sprints").update({ goal: goalText }).eq("id", sprintId).is("goal", null).neq("status", "closed").select("id");
      goalFailed = !!g.error;
      goalSet = !g.error && !!g.data?.length;
      goalSkipped = !g.error && !goalSet;
    }
    revalidatePath(`/missions/${missionId}`);
    revalidatePath("/missions");
    if (done !== "saved") return { ok: false, error: `Les stories sont placées${goalSet ? " et l'objectif est mis à jour" : ""}, mais leur ordre n'a pas pu être enregistré. Elles sont à la fin du sprint.`, gone: true, placed: order.length };
    return { ok: true, placed: order.length, goalSet, goalSkipped, goalFailed };
  });

  if (result.status === "signed-out") redirect("/auth/login");
  if (result.status === "failed") return { ok: false, error: "Enregistrement impossible. Réessaie." };
  return result.value;
}
