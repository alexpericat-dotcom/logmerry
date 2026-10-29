"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { isUuid } from "@/lib/domain/notes";
import { sprintNameForCreate, validateSprintInput, type SprintErrors } from "@/lib/domain/sprints";
import { nextPosition } from "@/lib/domain/user-stories";
import { withSession } from "@/lib/supabase/with-session";
import type { Db } from "@/lib/supabase/server";

export type SprintFormValues = { name: string; goal: string; start_date: string; end_date: string };
/** `gone` : le sprint ou la mission n'existe plus (supprimé ailleurs) ; l'écran se recharge. */
export type SprintFormState = { ok?: boolean; errors?: SprintErrors; message?: string; values?: SprintFormValues; gone?: boolean; sent?: number };
export type SprintActionState = { message?: string; gone?: boolean };

const SAVE_FAILED = "Enregistrement impossible. Réessaie.";
const MISSION_GONE = "Cette mission n'existe plus.";
const SPRINT_GONE = "Ce sprint n'existe plus.";

const readValues = (formData: FormData): SprintFormValues => ({
  name: String(formData.get("name") ?? ""),
  goal: String(formData.get("goal") ?? ""),
  start_date: String(formData.get("start_date") ?? ""),
  end_date: String(formData.get("end_date") ?? ""),
});

const refresh = (missionId: string) => revalidatePath(`/missions/${missionId}`);

type Outcome = "saved" | "not-found" | "error";

/** Session, validation, écriture d'un sprint ; `write` dit si la base a enregistré ou si la mission ou le sprint a disparu. */
async function save(
  values: SprintFormValues,
  write: (supabase: Db, value: ReturnType<typeof okValue>) => Promise<{ outcome: Outcome; missionId?: string; gone?: string }>,
  /** Avant la validation : complète les valeurs (le nom automatique d'un nouveau sprint dépend des sprints de la mission). */
  prepare?: (supabase: Db, values: SprintFormValues) => Promise<SprintFormValues>,
): Promise<SprintFormState> {
  const result = await withSession(async (supabase) => {
    const checked = validateSprintInput(prepare ? await prepare(supabase, values) : values);
    if (!checked.ok) return { errors: checked.errors } as const;
    const written = await write(supabase, checked.value);
    if (written.outcome === "saved" && written.missionId) refresh(written.missionId);
    return { written } as const;
  });
  if (result.status === "signed-out") redirect("/auth/login");
  if (result.status === "failed") return { message: SAVE_FAILED, values };
  if ("errors" in result.value) return { errors: result.value.errors, values };
  const { written } = result.value;
  if (written.outcome === "not-found") return { message: written.gone ?? SPRINT_GONE, values, gone: true };
  if (written.outcome !== "saved") return { message: SAVE_FAILED, values };
  return { ok: true };
}
const okValue = () => ({ name: "", goal: null as string | null, start_date: "", end_date: "" });

/** Crée un sprint « planifié » dans une de mes missions (la RLS refuse une mission qui n'est pas à moi). */
export async function createSprint(missionId: string, _prev: SprintFormState, formData: FormData): Promise<SprintFormState> {
  return save(
    readValues(formData),
    async (supabase, value) => {
      if (!isUuid(missionId)) return { outcome: "not-found", gone: MISSION_GONE };
      const mission = await supabase.from("missions").select("id").eq("id", missionId).maybeSingle();
      if (mission.error) return { outcome: "error" };
      if (!mission.data) return { outcome: "not-found", gone: MISSION_GONE };
      const { error } = await supabase.from("sprints").insert({ ...value, mission_id: missionId });
      return error ? { outcome: "error" } : { outcome: "saved", missionId };
    },
    // Nom vide ou « Sprint N » déjà pris : prochain numéro libre de la mission (calculé ici, côté serveur, pour que deux onglets ne créent pas deux « Sprint 3 »).
    async (supabase, values) => {
      if (!isUuid(missionId)) return values;
      const names = await supabase.from("sprints").select("name").eq("mission_id", missionId);
      if (names.error) throw new Error(`noms ${names.error.code ?? ""}`.trim());
      return { ...values, name: sprintNameForCreate(String(values.name ?? ""), names.data.map((r) => r.name as string)) };
    },
  );
}

/** Modifie un sprint. Un sprint clos garde ses dates (seuls le nom et l'objectif changent) : les dates envoyées sont alors ignorées. */
export async function updateSprint(id: string, _prev: SprintFormState, formData: FormData): Promise<SprintFormState> {
  return save(readValues(formData), async (supabase, value) => {
    if (!isUuid(id)) return { outcome: "not-found" };
    const current = await supabase.from("sprints").select("status").eq("id", id).maybeSingle();
    if (current.error) return { outcome: "error" };
    if (!current.data) return { outcome: "not-found" };
    const patch = current.data.status === "closed" ? { name: value.name, goal: value.goal } : value;
    const { data, error } = await supabase.from("sprints").update(patch).eq("id", id).select("id, mission_id");
    if (error) return { outcome: "error" };
    return data?.length ? { outcome: "saved", missionId: data[0].mission_id } : { outcome: "not-found" };
  });
}

/** Démarre un sprint planifié : un seul sprint « en cours » par mission (l'index unique de la base le garantit même avec deux onglets). Passe aussi la mission « à planifier » en « en cours ». */
export async function startSprint(id: string): Promise<SprintActionState> {
  const result = await withSession(async (supabase): Promise<"saved" | "not-found" | "already" | "not-planned" | "error"> => {
    if (!isUuid(id)) return "not-found";
    const { data, error } = await supabase.from("sprints").update({ status: "active" }).eq("id", id).eq("status", "planned").select("id, mission_id");
    if (error) return error.code === "23505" ? "already" : "error";
    if (data?.length) {
      // Second temps : une mission « à planifier » devient « en cours ». Son échec ne défait pas le démarrage (rien n'est affiché, le statut se change à la main).
      try {
        await supabase.from("missions").update({ status: "in_progress" }).eq("id", data[0].mission_id).eq("status", "planned");
      } catch {
        // réseau coupé : le sprint est déjà démarré, on ne le présente pas comme un échec
      }
      refresh(data[0].mission_id);
      return "saved";
    }
    const exists = await supabase.from("sprints").select("id").eq("id", id).maybeSingle();
    return exists.error ? "error" : exists.data ? "not-planned" : "not-found";
  });
  if (result.status === "signed-out") redirect("/auth/login");
  if (result.status === "failed" || result.value === "error") return { message: "Démarrage impossible pour le moment. Réessaie." };
  if (result.value === "already") return { message: "Un sprint est déjà en cours. Clos-le d'abord.", gone: true };
  if (result.value === "not-planned") return { message: "Ce sprint ne peut plus être démarré.", gone: true };
  if (result.value === "not-found") return { message: SPRINT_GONE, gone: true };
  return {};
}

/**
 * Clôt un sprint en cours. Les stories non terminées retournent au backlog (`moveToId` nul) ou passent à un sprint planifié de la même mission ;
 * les terminées restent dans le sprint clos. Les stories sont déplacées en UNE écriture AVANT le changement d'état : un échec laisse le sprint « en cours » et rejouable.
 * ponytail : les stories déplacées prennent toutes la même position (la suivante de la liste d'arrivée), départagées par leur date de création ; le prochain glisser-déposer renumérote.
 */
export async function closeSprint(id: string, moveToId: string | null): Promise<SprintActionState> {
  const result = await withSession(async (supabase): Promise<"saved" | "not-found" | "not-active" | "target-gone" | "error"> => {
    if (!isUuid(id) || (moveToId !== null && !isUuid(String(moveToId)))) return "not-found";
    const sprint = await supabase.from("sprints").select("status, mission_id").eq("id", id).maybeSingle();
    if (sprint.error) return "error";
    if (!sprint.data) return "not-found";
    if (sprint.data.status !== "active") return "not-active";
    const missionId = sprint.data.mission_id as string;

    const open = await supabase.from("user_stories").select("id").eq("sprint_id", id).neq("status", "done");
    if (open.error) return "error";
    // La cible n'est contrôlée que s'il y a des stories à y mettre.
    if (moveToId !== null && open.data.length) {
      const target = await supabase.from("sprints").select("status, mission_id").eq("id", moveToId).maybeSingle();
      if (target.error) return "error";
      if (!target.data || target.data.mission_id !== missionId || target.data.status !== "planned") return "target-gone";
    }
    if (open.data.length) {
      let tail = supabase.from("user_stories").select("position").eq("mission_id", missionId).order("position", { ascending: false }).limit(1);
      tail = moveToId === null ? tail.is("sprint_id", null) : tail.eq("sprint_id", moveToId);
      const last = await tail;
      if (last.error) return "error";
      const moved = await supabase.from("user_stories").update({ sprint_id: moveToId, position: nextPosition(last.data.map((r) => r.position)) }).in("id", open.data.map((s) => s.id as string)).select("id");
      if (moved.error) return "error";
    }
    const closed = await supabase.from("sprints").update({ status: "closed" }).eq("id", id).eq("status", "active").select("id");
    if (closed.error) return "error";
    refresh(missionId);
    return closed.data?.length ? "saved" : "not-active";
  });
  if (result.status === "signed-out") redirect("/auth/login");
  if (result.status === "failed" || result.value === "error") return { message: "Clôture impossible pour le moment. Le sprint reste en cours : réessaie." };
  if (result.value === "not-found") return { message: SPRINT_GONE, gone: true };
  if (result.value === "not-active") return { message: "Ce sprint n'est plus en cours.", gone: true };
  if (result.value === "target-gone") return { message: "Le sprint choisi n'existe plus ou n'est plus planifié. Choisis-en un autre.", gone: true };
  return {};
}

/** Supprime un sprint : ses stories retournent au backlog (`on delete set null`). */
export async function deleteSprint(id: string): Promise<SprintActionState> {
  const result = await withSession(async (supabase): Promise<Outcome> => {
    if (!isUuid(id)) return "not-found";
    // Les stories gardent leur position de sprint en retournant au backlog et s'y mélangeraient : on les met d'abord à la suite du backlog, dans leur ordre.
    const own = await supabase.from("user_stories").select("id, mission_id").eq("sprint_id", id).order("position", { ascending: true }).order("created_at", { ascending: true });
    if (own.error) return "error";
    if (own.data.length) {
      const tail = await supabase.from("user_stories").select("position").eq("mission_id", own.data[0].mission_id).is("sprint_id", null).order("position", { ascending: false }).limit(1);
      if (tail.error) return "error";
      const start = nextPosition(tail.data.map((r) => r.position));
      for (const [i, s] of own.data.entries()) {
        const moved = await supabase.from("user_stories").update({ position: start + i }).eq("id", s.id);
        if (moved.error) return "error";
      }
    }
    const { data, error } = await supabase.from("sprints").delete().eq("id", id).select("id, mission_id");
    if (error) return "error";
    // Déjà supprimé (autre onglet, double clic) : l'état voulu est atteint.
    if (data?.length) refresh(data[0].mission_id);
    return "saved";
  });
  if (result.status === "signed-out") redirect("/auth/login");
  if (result.status === "failed" || result.value === "error") return { message: "Suppression impossible. Le sprint est conservé. Réessaie." };
  return {};
}
