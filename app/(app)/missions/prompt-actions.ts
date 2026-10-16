"use server";

import { redirect } from "next/navigation";

import { writePromptWithClaude } from "@/lib/ai/prompt-generation";
import { isUuid } from "@/lib/domain/notes";
import { buildMissionContext, parseContextLevel, type StoryForContext, type TaskForContext } from "@/lib/domain/mission-context";
import { parseMissionStatus } from "@/lib/domain/missions";
import { assemblePrompt, buildPromptMessage, parsePromptTarget, validateObjective, verifyInstruction } from "@/lib/domain/prompt-generation";
import { parseStoryStatus } from "@/lib/domain/user-stories";
import { withSession } from "@/lib/supabase/with-session";

export type PromptOptions = { level: string; target: string; objective: string; includeClient: boolean };
export type PromptState = { ok: true; prompt: string; omitted: number } | { ok: false; error: string };

const FAILED = "Génération impossible pour le moment. Réessaie.";
const MISSION_GONE = "Cette mission n'existe plus.";

/**
 * Génère un prompt pour une de mes missions : Claude rédige la consigne (rôle, objectif, contraintes, format, questions d'abord, adaptée à la cible),
 * le code ajoute le bloc « Contexte » tel quel (mission, backlog selon le niveau). N'écrit rien : le prompt n'existe qu'à l'écran. Jamais de notes envoyées.
 * Sans session : connexion. Toutes les vérifications sont faites sous la session.
 */
export async function generateMissionPrompt(missionId: string, options: PromptOptions): Promise<PromptState> {
  const result = await withSession(async (supabase): Promise<PromptState> => {
    const level = parseContextLevel(options?.level);
    const target = parsePromptTarget(options?.target);
    if (!level || !target) return { ok: false, error: "Choisis le contenu du prompt et l'assistant visé." };
    const objective = validateObjective(options?.objective);
    if (!objective.ok) return { ok: false, error: objective.error };
    const includeClient = options.includeClient === true;
    if (!isUuid(String(missionId))) return { ok: false, error: MISSION_GONE };

    const found = await supabase.from("missions").select("title, status, start_date, end_date, client:clients(name)").eq("id", missionId).maybeSingle();
    if (found.error) throw new Error(`mission ${found.error.code ?? ""}`.trim());
    if (!found.data) return { ok: false, error: MISSION_GONE };
    const status = parseMissionStatus(found.data.status);
    if (!status) throw new Error("statut de mission inconnu");
    const clientName = (found.data.client as unknown as { name?: string } | null)?.name ?? null;

    let stories: StoryForContext[] = [];
    let tasks: TaskForContext[] = [];
    if (level !== "mission") {
      const rows = await supabase
        .from("user_stories")
        .select("id, title, role, benefit, acceptance_criteria, points, status")
        .eq("mission_id", missionId)
        .order("position", { ascending: true })
        .order("created_at", { ascending: true });
      if (rows.error) throw new Error(`backlog ${rows.error.code ?? ""}`.trim());
      stories = rows.data.map((r) => ({ ...r, status: parseStoryStatus(r.status) ?? "todo" })) as StoryForContext[];
      if (level === "tasks" && stories.length) {
        const t = await supabase.from("tasks").select("story_id, title, done").in("story_id", stories.map((s) => s.id)).order("position", { ascending: true }).order("created_at", { ascending: true });
        if (t.error) throw new Error(`tâches ${t.error.code ?? ""}`.trim());
        tasks = t.data as TaskForContext[];
      }
    }

    const context = buildMissionContext({ mission: { title: found.data.title, status, start_date: found.data.start_date, end_date: found.data.end_date, clientName }, stories, tasks, level, includeClient });
    const message = buildPromptMessage({ missionTitle: found.data.title, level, target, objective: objective.value, contextText: context.text });
    let raw: string;
    try {
      raw = await writePromptWithClaude(message, target);
    } catch (e) {
      // Journal sans contenu de mission, de backlog ni d'objectif, ni clé : seulement la nature de l'échec.
      console.error("Génération de prompt impossible :", e instanceof Error ? e.message : "erreur inconnue");
      throw e;
    }
    const checked = verifyInstruction(raw, [context.text, objective.value, found.data.title]);
    if (!checked.ok) {
      return { ok: false, error: checked.reason === "invented_number" ? "La consigne contenait un chiffre absent de ta mission. Régénère-la." : checked.reason === "too_long" ? "La consigne est trop longue. Régénère-la." : "L'IA n'a rien produit d'exploitable. Régénère-la." };
    }
    return { ok: true, prompt: assemblePrompt(checked.instruction, context.text), omitted: context.omitted };
  });

  // redirect() lève une exception : à appeler hors du try.
  if (result.status === "signed-out") redirect("/auth/login");
  if (result.status === "failed") return { ok: false, error: FAILED };
  return result.value;
}
