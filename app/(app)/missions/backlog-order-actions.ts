"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { orderWithClaude } from "@/lib/ai/backlog-order";
import { renumber } from "@/lib/db/renumber";
import { applyOrderToSlots, backlogUnchanged, buildOrderMessage, moves, orderSources, pickOrderable, sameOrder, verifyOrder } from "@/lib/domain/backlog-order";
import { isUuid } from "@/lib/domain/notes";
import { validateHint } from "@/lib/domain/tasks";
import { parseReorderIds } from "@/lib/domain/user-stories";
import { withSession } from "@/lib/supabase/with-session";

export type OrderItem = { id: string; title: string; points: number | null; from: number; to: number; reason: string };
export type OrderState =
  | { ok: true; items: OrderItem[]; baseIds: string[]; sentIds: string[]; same: boolean; dropped: number; droppedTexts: number; omitted: number; cut: boolean }
  | { ok: false; error: string };
export type ApplyOrderState = { ok: true; moved: number } | { ok: false; error: string; gone?: boolean };

const FAILED = "Proposition impossible pour le moment. Réessaie.";
const MISSION_GONE = "Cette mission n'existe plus.";
const CHANGED = "Le backlog a changé entre-temps. Relance la proposition.";
const COLUMNS = "id, title, role, benefit, acceptance_criteria, points, status";

/** Le backlog d'une de mes missions (hors sprint), dans l'ordre de la page (position puis création). */
async function loadBacklog(supabase: Parameters<Parameters<typeof withSession>[0]>[0], missionId: string) {
  const found = await supabase.from("user_stories").select(COLUMNS).eq("mission_id", missionId).is("sprint_id", null).order("position", { ascending: true }).order("created_at", { ascending: true }).order("id", { ascending: true });
  if (found.error) throw new Error(`backlog ${found.error.code ?? ""}`.trim());
  return found.data;
}

/**
 * Propose un ordre pour le backlog (hors sprint, stories non terminées, 60 au plus) d'une de mes missions : les stories à ordonner, les titres des stories déjà en sprint,
 * le titre de la mission, le nom du client et ma précision. N'écrit rien. Sans session : connexion. Toutes les vérifications sont faites sous la session.
 */
export async function proposeBacklogOrder(missionId: string, hint: string): Promise<OrderState> {
  const result = await withSession(async (supabase): Promise<OrderState> => {
    const checkedHint = validateHint(hint);
    if (!checkedHint.ok) return { ok: false, error: checkedHint.error };
    const text = checkedHint.value;
    if (!isUuid(String(missionId))) return { ok: false, error: MISSION_GONE };
    missionId = String(missionId).toLowerCase();

    const mission = await supabase.from("missions").select("title, client:clients(name)").eq("id", missionId).maybeSingle();
    if (mission.error) throw new Error(`mission ${mission.error.code ?? ""}`.trim());
    if (!mission.data) return { ok: false, error: MISSION_GONE };

    const backlog = await loadBacklog(supabase, missionId);
    const open = backlog.filter((s) => s.status !== "done");
    // Moins de 2 stories ouvertes : rien à ordonner, on le dit sans appeler Claude.
    if (open.length < 2) return { ok: false, error: "Il faut au moins 2 stories ouvertes pour proposer un ordre." };
    const picked = pickOrderable(backlog);
    const byIdAll = new Map(backlog.map((s) => [s.id, s]));
    const sent = picked.sent.map((id) => byIdAll.get(id)!);

    const inSprints = await supabase.from("user_stories").select("title").eq("mission_id", missionId).not("sprint_id", "is", null).order("position", { ascending: true }).limit(100);
    if (inSprints.error) throw new Error(`sprints ${inSprints.error.code ?? ""}`.trim());
    const sprintTitles = inSprints.data.map((s) => s.title as string);

    const clientName = mission.data.client?.name ?? "";
    const input = { missionTitle: mission.data.title as string, clientName, stories: sent, sprintTitles, hint: text };
    let raw: Record<string, unknown>;
    try {
      raw = await orderWithClaude(buildOrderMessage(input));
    } catch (e) {
      // Journal sans contenu de story ni de précision, ni clé : seulement la nature de l'échec.
      console.error("Ordre du backlog impossible :", e instanceof Error ? e.message : "erreur inconnue");
      throw e;
    }
    const sentIds = sent.map((s) => s.id);
    const verified = verifyOrder(raw, { ids: sentIds, sources: orderSources(input) });
    // L'IA n'a rien classé d'exploitable (liste vide, identifiants inconnus) : ce n'est pas « l'ordre est déjà logique ».
    if (verified.omitted === sentIds.length) return { ok: false, error: "L'IA n'a rien classé d'exploitable. Réessaie." };
    const byId = new Map(sent.map((s) => [s.id, s]));
    // Places telles qu'on les voit dans le backlog affiché (stories terminées comprises) : avant = rang actuel, après = rang une fois l'ordre appliqué.
    const baseIds = backlog.map((s) => s.id);
    const full = applyOrderToSlots(baseIds, sentIds, verified.order) ?? baseIds;
    const items = moves(sentIds, verified.order).map((m) => {
      const from = baseIds.indexOf(m.id) + 1;
      const to = full.indexOf(m.id) + 1;
      return { id: m.id, title: byId.get(m.id)!.title, points: byId.get(m.id)!.points, from, to, reason: from === to ? "" : (verified.reasons[m.id] ?? "") };
    });
    return {
      ok: true,
      items,
      baseIds,
      sentIds,
      same: sameOrder(sentIds, verified.order),
      dropped: verified.dropped,
      droppedTexts: verified.droppedTexts,
      omitted: verified.omitted,
      cut: picked.cut,
    };
  });

  // redirect() lève une exception : à appeler hors du try.
  if (result.status === "signed-out") redirect("/auth/login");
  if (result.status === "failed") return { ok: false, error: FAILED };
  return result.value;
}

/**
 * Applique l'ordre proposé. `baseIds` est le backlog (hors sprint) tel qu'il était à la proposition : si une story est apparue, a disparu, a changé de liste, est devenue
 * terminée ou si l'ordre a changé depuis, rien n'est écrit. Seules les places des stories ordonnées (`sentIds`) reçoivent le nouvel ordre ; les autres gardent leur place.
 * Seules des positions sont écrites (jamais le contenu, les points, le statut ni le sprint).
 * ponytail : une mise à jour par story déplacée, non atomique (comme le glisser-déposer) ; une fonction SQL si une panne en cours de route devient gênante.
 */
export async function applyBacklogOrder(missionId: string, baseIds: string[], sentIds: string[], newOrder: string[]): Promise<ApplyOrderState> {
  const result = await withSession(async (supabase): Promise<ApplyOrderState> => {
    const base = parseReorderIds(baseIds);
    const sent = parseReorderIds(sentIds);
    const order = parseReorderIds(newOrder);
    if (!isUuid(String(missionId)) || !base || !sent || !order) return { ok: false, error: CHANGED, gone: true };
    const mid = String(missionId).toLowerCase();

    const backlog = await loadBacklog(supabase, mid);
    // Le backlog doit être exactement celui de la proposition (mêmes stories, même ordre) et les stories ordonnées toujours ouvertes.
    if (!backlogUnchanged(backlog, base, sent)) return { ok: false, error: CHANGED, gone: true };
    const full = applyOrderToSlots(base, sent, order);
    if (!full) return { ok: false, error: CHANGED, gone: true };

    const done = await renumber(supabase, "user_stories", { column: "mission_id", id: mid }, full, { column: "sprint_id", id: null });
    revalidatePath(`/missions/${mid}`);
    revalidatePath("/missions");
    if (done === "changed") return { ok: false, error: CHANGED, gone: true };
    if (done !== "saved") return { ok: false, error: "Réordonnancement impossible pour le moment. Relance une proposition.", gone: true };
    const sentCurrent = base.filter((id) => sent.includes(id));
    return { ok: true, moved: order.filter((id, i) => sentCurrent[i] !== id).length };
  });

  if (result.status === "signed-out") redirect("/auth/login");
  if (result.status === "failed") return { ok: false, error: "Enregistrement impossible. Réessaie." };
  return result.value;
}
