"use server";

import { redirect } from "next/navigation";

import { writePromptWithClaude } from "@/lib/ai/prompt-generation";
import { isUuid } from "@/lib/domain/notes";
import { buildMissionContext, clientNameOf, type StoryForContext, type TaskForContext } from "@/lib/domain/mission-context";
import { parseMissionStatus } from "@/lib/domain/missions";
import { assemblePrompt, buildPromptMessage, parsePromptOptions, verifyInstruction } from "@/lib/domain/prompt-generation";
import { parseStoryStatus } from "@/lib/domain/user-stories";
import { withSession } from "@/lib/supabase/with-session";

export type PromptState = { ok: true; prompt: string; omitted: number } | { ok: false; error: string };

const FAILED = "Génération impossible pour le moment. Réessaie.";
const MISSION_GONE = "Cette mission n'existe plus.";

/**
 * Génère un prompt pour une de mes missions : Claude rédige la consigne (rôle, objectif, contraintes, format, questions d'abord, adaptée à la cible),
 * le code ajoute le bloc « Contexte » tel quel (mission, backlog selon le niveau). N'écrit rien : le prompt n'existe qu'à l'écran. Jamais de notes envoyées.
 * Sans session : connexion. Toutes les vérifications sont faites sous la session.
 */
export async function generateMissionPrompt(missionId: string, options: { level: string; target: string; objective: string; includeClient: boolean }): Promise<PromptState> {
  const result = await withSession(async (supabase): Promise<PromptState> => {
    const parsed = parsePromptOptions(options);
    if (!parsed.ok) return { ok: false, error: parsed.error };
    const { level, target, objective, includeClient } = parsed;
    if (!isUuid(String(missionId))) return { ok: false, error: MISSION_GONE };

    const found = await supabase.from("missions").select("title, status, start_date, end_date, client:clients(name)").eq("id", missionId).maybeSingle();
    if (found.error) throw new Error(`mission ${found.error.code ?? ""}`.trim());
    if (!found.data) return { ok: false, error: MISSION_GONE };
    const status = parseMissionStatus(found.data.status);
    if (!status) throw new Error("statut de mission inconnu");
    // Lu avec la mission, mais ni transmis ni écrit quand l'utilisateur l'a retiré.
    const clientName = includeClient ? clientNameOf((found.data as unknown as { client?: unknown }).client) : null;

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
      stories = rows.data.map((r) => {
        // Comme pour la mission : un statut inconnu est une erreur, pas un « à faire » affiché à tort.
        const storyStatus = parseStoryStatus(r.status);
        if (!storyStatus) throw new Error("statut de story inconnu");
        return { ...r, status: storyStatus };
      }) as StoryForContext[];
      if (level === "tasks" && stories.length) {
        const t = await supabase.from("tasks").select("story_id, title, done").in("story_id", stories.map((s) => s.id)).order("position", { ascending: true }).order("created_at", { ascending: true });
        if (t.error) throw new Error(`tâches ${t.error.code ?? ""}`.trim());
        // L'API plafonne à 1 000 lignes sans le dire : un compte tronqué fausserait « N sur M faites ».
        if (t.data.length >= 1000) return { ok: false, error: "Ce backlog a trop de tâches pour le niveau « tâches ». Choisis « stories détaillées »." };
        tasks = t.data as TaskForContext[];
      }
    }

    const context = buildMissionContext({ mission: { title: found.data.title, status, start_date: found.data.start_date, end_date: found.data.end_date, clientName }, stories, tasks, level, includeClient });
    const message = buildPromptMessage({ missionTitle: found.data.title, level, target, objective, contextText: context.text });
    let raw: string;
    try {
      raw = await writePromptWithClaude(message, target);
    } catch (e) {
      // Journal sans contenu de mission, de backlog ni d'objectif, ni clé : seulement la nature de l'échec.
      console.error("Génération de prompt impossible :", e instanceof Error ? e.message : "erreur inconnue");
      throw e;
    }
    const checked = verifyInstruction(raw, [context.text, objective, found.data.title]);
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
