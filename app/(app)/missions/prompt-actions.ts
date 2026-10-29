"use server";

import { redirect } from "next/navigation";

import { consumeAiQuota } from "@/lib/ai/quota";
import { quotaMessage } from "@/lib/domain/ai-quota";
import { writePromptWithClaude } from "@/lib/ai/prompt-generation";
import { isUuid } from "@/lib/domain/notes";
import { buildMissionContext, clientNameOf, hideClientName, type StoryForContext, type TaskForContext } from "@/lib/domain/mission-context";
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
export async function generateMissionPrompt(missionId: string, options: { level: string; objective: string; includeClient: boolean }): Promise<PromptState> {
  const result = await withSession(async (supabase): Promise<PromptState> => {
    const parsed = parsePromptOptions(options);
    if (!parsed.ok) return { ok: false, error: parsed.error };
    const { level, objective, includeClient } = parsed;
    if (!isUuid(String(missionId))) return { ok: false, error: MISSION_GONE };

    const found = await supabase.from("missions").select("title, status, start_date, end_date, client:clients(name)").eq("id", missionId).maybeSingle();
    if (found.error) throw new Error(`mission ${found.error.code ?? ""}`.trim());
    if (!found.data) return { ok: false, error: MISSION_GONE };
    const status = parseMissionStatus(found.data.status);
    if (!status) throw new Error("statut de mission inconnu");
    // Le nom de la fiche est lu pour pouvoir le retirer PARTOUT (l'utilisateur l'écrit aussi dans ses stories) quand il a coché « sans le nom du client ».
    const knownClient = clientNameOf(found.data.client);
    const clientName = includeClient ? knownClient : null;

    let stories: StoryForContext[] = [];
    let tasks: TaskForContext[] = [];
    if (level === "all") {
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
      if (stories.length) {
        const t = await supabase.from("tasks").select("story_id, title, done").in("story_id", stories.map((s) => s.id)).order("position", { ascending: true }).order("created_at", { ascending: true });
        if (t.error) throw new Error(`tâches ${t.error.code ?? ""}`.trim());
        // L'API plafonne à 1 000 lignes sans le dire : un compte tronqué fausserait « N sur M faites ».
        if (t.data.length >= 1000) return { ok: false, error: "Ce backlog a trop de tâches pour être mis en entier dans le prompt. Choisis « La mission seule »." };
        tasks = t.data as TaskForContext[];
      }
    }

    // « Sans le nom du client » : remplacé par « le client » dans tout ce qui part (mission, stories, tâches, objectif), pas seulement sur la fiche.
    const shown = includeClient ? { missionTitle: found.data.title, objective, stories, tasks } : hideClientName({ missionTitle: found.data.title, objective, stories, tasks }, knownClient);
    const missionTitle = shown.missionTitle;
    const objectiveText = shown.objective;
    const context = buildMissionContext({ mission: { title: missionTitle, status, start_date: found.data.start_date, end_date: found.data.end_date, clientName }, stories: shown.stories, tasks: shown.tasks, level, includeClient });
    const message = buildPromptMessage({ missionTitle, level, objective: objectiveText, contextText: context.text });
    const quota = await consumeAiQuota(supabase);
    if (quota !== "ok") return { ok: false, error: quotaMessage(quota) };
    let raw: string;
    try {
      raw = await writePromptWithClaude(message);
    } catch (e) {
      // Journal sans contenu de mission, de backlog ni d'objectif, ni clé : seulement la nature de l'échec.
      console.error("Génération de prompt impossible :", e instanceof Error ? e.message : "erreur inconnue");
      throw e;
    }
    const checked = verifyInstruction(raw, [context.text, objectiveText, missionTitle]);
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
