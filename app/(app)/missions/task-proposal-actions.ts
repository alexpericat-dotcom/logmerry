"use server";

import { redirect } from "next/navigation";

import { proposeTasksWithClaude } from "@/lib/ai/task-proposals";
import { notesForProposal } from "@/lib/db/proposal-notes";
import { isUuid } from "@/lib/domain/notes";
import { limitNotes } from "@/lib/domain/story-proposals";
import { buildTaskMessage, taskSources, verifyTaskProposals } from "@/lib/domain/task-proposals";
import { validateHint } from "@/lib/domain/tasks";
import { withSession } from "@/lib/supabase/with-session";

export type TaskProposalState = { ok: true; tasks: string[]; dropped: number; duplicates: number; noteCut: boolean } | { ok: false; error: string };

const FAILED = "Proposition impossible pour le moment. Réessaie.";
const NOTHING = "L'IA n'a rien proposé de nouveau. Ajoute une précision.";
const STORY_GONE = "Cette user story n'existe plus.";

/**
 * Propose des tâches pour une de mes user stories : la story, sa note d'origine (seulement si elle est à moi, active et de la fiche du client de la mission),
 * les titres des tâches déjà présentes et ma précision. N'écrit rien : les propositions n'existent qu'à l'écran tant que l'utilisateur ne les garde pas.
 * Sans session : connexion. Toutes les vérifications sont faites sous la session.
 */
export async function proposeTasks(storyId: string, hint: string): Promise<TaskProposalState> {
  const result = await withSession(async (supabase): Promise<TaskProposalState> => {
    const checkedHint = validateHint(hint);
    if (!checkedHint.ok) return { ok: false, error: checkedHint.error };
    const text = checkedHint.value;
    if (!isUuid(String(storyId))) return { ok: false, error: STORY_GONE };

    const found = await supabase
      .from("user_stories")
      .select("title, role, benefit, acceptance_criteria, points, source_note_id, mission:missions(title, client_id, client:clients(name))")
      .eq("id", storyId)
      .maybeSingle();
    if (found.error) throw new Error(`story ${found.error.code ?? ""}`.trim());
    if (!found.data) return { ok: false, error: STORY_GONE };
    const story = found.data;
    const mission = story.mission;
    if (!mission) return { ok: false, error: STORY_GONE };

    const tasks = await supabase.from("tasks").select("title").eq("story_id", storyId).order("position", { ascending: true });
    if (tasks.error) throw new Error(`tâches ${tasks.error.code ?? ""}`.trim());
    const existingTitles = tasks.data.map((t) => t.title as string);

    // Note d'origine : même requête que le backlog (propriété, fiche, statut actif, texte non vide) ; un lien mort est simplement ignoré.
    const notes = story.source_note_id ? await notesForProposal(supabase, mission.client_id, [story.source_note_id as string]) : [];
    const { kept, cut } = limitNotes(notes);
    const note = kept[0] ?? null;

    const message = buildTaskMessage({
      missionTitle: mission.title,
      clientName: mission.client?.name ?? "",
      story: { title: story.title, role: story.role, benefit: story.benefit, acceptance_criteria: story.acceptance_criteria, points: story.points },
      existingTitles,
      hint: text,
      note,
    });
    let raw: unknown[];
    try {
      raw = await proposeTasksWithClaude(message);
    } catch (e) {
      // Journal sans contenu de story, de note ni de précision, ni clé : seulement la nature de l'échec.
      console.error("Proposition de tâches impossible :", e instanceof Error ? e.message : "erreur inconnue");
      throw e;
    }
    const verified = verifyTaskProposals(raw, {
      // Les titres des tâches existantes sont aussi des sources : « Relancer 12 familles » copié d'une tâche n'est pas un chiffre inventé.
      texts: taskSources({ hint: text, missionTitle: mission.title, story, existingTitles, note }),
      existingTitles,
    });
    if (!verified.tasks.length) {
      // Les compteurs sont dits même quand tout est écarté : on sait pourquoi il n'y a rien à relire.
      const why = [verified.duplicates ? `${verified.duplicates} déjà dans la liste` : "", verified.dropped ? `${verified.dropped} invalide${verified.dropped > 1 ? "s" : ""} ou avec un chiffre absent de tes sources` : ""].filter(Boolean).join(", ");
      return { ok: false, error: `${NOTHING}${why ? ` (écartées : ${why}.)` : ""}` };
    }
    return { ok: true, ...verified, noteCut: cut > 0 };
  });

  // redirect() lève une exception : à appeler hors du try.
  if (result.status === "signed-out") redirect("/auth/login");
  if (result.status === "failed") return { ok: false, error: FAILED };
  return result.value;
}
