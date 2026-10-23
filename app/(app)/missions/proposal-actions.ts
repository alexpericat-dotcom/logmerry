"use server";

import { redirect } from "next/navigation";

import { proposeWithClaude } from "@/lib/ai/story-proposals";
import { notesForProposal } from "@/lib/db/proposal-notes";
import { isUuid } from "@/lib/domain/notes";
import { BRIEF_MAX, buildProposalMessage, limitNotes, verifyProposals, type Proposal } from "@/lib/domain/story-proposals";
import { withSession } from "@/lib/supabase/with-session";

export type ProposalState = { ok: true; proposals: Proposal[]; dropped: number; droppedTasks: number; cut: number } | { ok: false; error: string };

const FAILED = "Proposition impossible pour le moment. Réessaie.";
const NOTHING = "L'IA n'a rien proposé d'exploitable. Précise ton brief.";

/**
 * Propose des user stories pour une de mes missions : brief saisi, titre de la mission, nom du client, titres du backlog et notes cochées
 * **liées à la fiche de cette mission** (lecture sous RLS : jamais la note d'un autre compte ni d'un autre client). N'écrit rien : les
 * propositions n'existent qu'à l'écran tant que l'utilisateur ne garde pas l'une d'elles. Sans session : connexion.
 */
export async function proposeStories(missionId: string, brief: string, noteIds: string[], withTasks = false): Promise<ProposalState> {
  const result = await withSession(async (supabase): Promise<ProposalState> => {
    // Toutes les vérifications sont faites sous la session : sans connexion, c'est la redirection qui répond, jamais un message de validation.
    const text = String(brief ?? "");
    if (text.length > BRIEF_MAX * 2 || [...text].length > BRIEF_MAX) return { ok: false, error: `Le brief est trop long (${BRIEF_MAX.toLocaleString("fr-FR")} caractères au plus).` };
    const wanted = [...new Set((Array.isArray(noteIds) ? noteIds.slice(0, 200) : []).map(String).filter(isUuid))].slice(0, 50);
    if (!text.trim() && wanted.length === 0) return { ok: false, error: "Colle un brief ou coche au moins une note." };
    if (!isUuid(String(missionId))) return { ok: false, error: "Cette mission n'existe plus." };

    const mission = await supabase.from("missions").select("title, client_id, client:clients(name)").eq("id", missionId).maybeSingle();
    if (mission.error) throw new Error(`mission ${mission.error.code ?? ""}`.trim());
    if (!mission.data) return { ok: false, error: "Cette mission n'existe plus." };

    const notes = await notesForProposal(supabase, mission.data.client_id, wanted);
    const { kept, cut } = limitNotes(notes);
    // Rien d'exploitable à envoyer : on le dit sans appeler Claude (un appel sans source inventerait des stories).
    if (!text.trim() && kept.length === 0) {
      return { ok: false, error: wanted.length && !notes.length ? "Aucune des notes cochées n'est disponible ou n'a de texte. Colle un brief." : "Les notes cochées sont trop volumineuses (30 000 caractères au plus en tout). Décoches-en ou colle un brief." };
    }

    const stories = await supabase.from("user_stories").select("title").eq("mission_id", missionId).order("position", { ascending: true });
    if (stories.error) throw new Error(`backlog ${stories.error.code ?? ""}`.trim());
    const existingTitles = stories.data.map((s) => s.title as string);
    const clientName = mission.data.client?.name ?? "";

    const message = buildProposalMessage({ missionTitle: mission.data.title, clientName, brief: text, notes: kept, existingTitles });
    let raw: unknown[];
    try {
      raw = await proposeWithClaude(message, withTasks === true);
    } catch (e) {
      // Journal sans contenu de brief ni de note ni clé : seulement la nature de l'échec.
      console.error("Proposition de backlog impossible :", e instanceof Error ? e.message : "erreur inconnue");
      throw e;
    }
    const { proposals, dropped, droppedTasks } = verifyProposals(raw, {
      withTasks: withTasks === true,
      // Les titres du backlog sont aussi des sources : « Phase 12 » copié d'une story existante n'est pas un chiffre inventé.
      texts: [text, mission.data.title, ...existingTitles, ...kept.flatMap((n) => [n.title, n.body])],
      sentNoteIds: kept.map((n) => n.id),
      existingTitles,
    });
    if (!proposals.length) return { ok: false, error: NOTHING };
    return { ok: true, proposals, dropped, droppedTasks, cut };
  });

  // redirect() lève une exception : à appeler hors du try.
  if (result.status === "signed-out") redirect("/auth/login");
  if (result.status === "failed") return { ok: false, error: FAILED };
  return result.value;
}
