"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, useTransition } from "react";

import { closeSprint, deleteSprint, startSprint, updateSprint, type SprintActionState } from "@/app/(app)/missions/sprint-actions";
import { SprintComposer } from "@/components/sprint-composer";
import { SprintForm } from "@/components/sprint-form";
import { StoryList } from "@/components/story-list";
import { selectClass } from "@/components/story-form";
import { Badge } from "@/components/ui/badge";
import { ConfirmPanel } from "@/components/confirm-panel";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { isRedirect, UNREACHABLE } from "@/lib/client-actions";
import type { SprintRecord } from "@/lib/db/sprints";
import type { StoryRecord } from "@/lib/db/user-stories";
import type { TaskRecord } from "@/lib/db/tasks";
import { SPRINT_STATUS_LABELS, sprintProgress, sprintProgressLabel, sprintTimeLabel } from "@/lib/domain/sprints";
import { formatDate } from "@/lib/format";

/**
 * Un sprint : nom, état, objectif, dates, avancement, ses stories, et les actions « Démarrer », « Clore », « Modifier », « Supprimer ».
 * À la clôture, les stories non terminées retournent au backlog ou passent à un sprint planifié (au choix) ; les terminées restent dans le sprint clos.
 */
export function SprintBlock({
  sprint,
  stories,
  tasksByStory,
  sprints,
  today,
  onChanged,
  onDeleted,
  onMoved,
}: {
  sprint: SprintRecord;
  stories: StoryRecord[];
  tasksByStory: Map<string, TaskRecord[]>;
  sprints: SprintRecord[];
  /** Date du jour à Paris, calculée côté serveur (jamais dans le navigateur). */
  today: string;
  /** Annonce une issue (sprint démarré, clos, supprimé) et rend le focus au titre de la zone. */
  onChanged: (message: string) => void;
  onDeleted: () => void;
  onMoved: (message: string) => void;
}) {
  const router = useRouter();
  const titleId = useId();
  const [mode, setMode] = useState<"view" | "edit" | "close" | "delete">("view");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const [moveTo, setMoveTo] = useState("");
  const openedFrom = useRef<"edit" | "close" | "delete" | null>(null);
  const editButton = useRef<HTMLButtonElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const deleteButton = useRef<HTMLButtonElement>(null);
  const cancelButton = useRef<HTMLButtonElement>(null);
  const closeMode = () => setMode("view");

  // Le focus suit le mode : « Annuler » à la clôture (le choix sûr), le bouton d'origine au retour (la suppression : ConfirmPanel).
  useEffect(() => {
    if (mode === "close") cancelButton.current?.focus();
    if (mode === "view" && openedFrom.current) (openedFrom.current === "edit" ? editButton : openedFrom.current === "close" ? closeButton : deleteButton).current?.focus();
    openedFrom.current = mode === "view" ? null : mode;
  }, [mode]);

  const progress = sprintProgress(stories);
  const open = stories.filter((s) => s.status !== "done").length;
  const planned = sprints.filter((sp) => sp.status === "planned" && sp.id !== sprint.id);
  // Le sprint choisi a pu disparaître ou démarrer entre-temps : le menu montre alors « backlog », l'appel doit faire de même.
  const target = planned.some((sp) => sp.id === moveTo) ? moveTo : "";
  // La garde `pending` lit le rendu courant : deux clics avant le rendu lanceraient deux appels. Ce verrou est synchrone.
  const busy = useRef(false);

  const run = (task: () => Promise<SprintActionState>, onOk: () => void) => {
    if (pending || busy.current) return;
    busy.current = true;
    startTransition(async () => {
      setError("");
      try {
        const result = await task();
        if (result.message) {
          setError(result.message);
          if (result.gone) router.refresh();
        } else onOk();
      } catch (e) {
        if (isRedirect(e)) throw e;
        setError(UNREACHABLE);
      } finally {
        busy.current = false;
      }
    });
  };

  if (mode === "edit") {
    return (
      <SprintForm
        idPrefix={`edit-sprint-${sprint.id}`}
        action={updateSprint.bind(null, sprint.id)}
        initial={{ name: sprint.name, goal: sprint.goal ?? "", start_date: sprint.start_date, end_date: sprint.end_date }}
        submitLabel="Enregistrer les modifications"
        datesLocked={sprint.status === "closed"}
        onDone={closeMode}
        onCancel={closeMode}
      />
    );
  }

  return (
    <section aria-labelledby={titleId} className="flex flex-col gap-3 rounded-md border bg-card p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <h3 id={titleId} className="min-w-0 break-words font-semibold">
            {sprint.name}
          </h3>
          <Badge variant={sprint.status === "active" ? "default" : "secondary"}>{SPRINT_STATUS_LABELS[sprint.status]}</Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          {formatDate(sprint.start_date)} → {formatDate(sprint.end_date)} · {sprintTimeLabel(sprint, today)}
        </p>
      </div>
      {sprint.goal && <p className="break-words text-sm">Objectif : {sprint.goal}</p>}
      <p className="text-sm text-muted-foreground">{sprintProgressLabel(progress)}</p>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      {mode === "view" && (
        <div className="flex flex-wrap items-center gap-2">
          {sprint.status === "planned" && (
            <Button type="button" size="sm" aria-disabled={pending} onClick={() => run(() => startSprint(sprint.id), () => onChanged(`Sprint « ${sprint.name} » démarré.`))}>
              {pending ? "Démarrage…" : "Démarrer le sprint"}
            </Button>
          )}
          {sprint.status === "active" && (
            <Button ref={closeButton} type="button" size="sm" onClick={() => setMode("close")}>
              Clore le sprint
            </Button>
          )}
          <Button ref={editButton} type="button" variant="outline" size="sm" onClick={() => setMode("edit")}>
            Modifier<span className="sr-only"> le sprint {sprint.name}</span>
          </Button>
          <Button ref={deleteButton} type="button" variant="outline" size="sm" className="text-destructive" onClick={() => setMode("delete")}>
            Supprimer<span className="sr-only"> le sprint {sprint.name}</span>
          </Button>
        </div>
      )}
      {mode === "view" && sprint.status !== "closed" && <SprintComposer sprintId={sprint.id} sprintName={sprint.name} />}
      {mode === "close" && (
        <form
          role="group"
          aria-label={`Clore le sprint ${sprint.name}`}
          className="flex flex-col gap-3 rounded-md border border-primary/30 bg-primary/10 p-3"
          onKeyDown={(e) => {
            if (e.key !== "Escape" || pending) return;
            e.preventDefault();
            e.stopPropagation();
            setMode("view");
          }}
          onSubmit={(e) => {
            e.preventDefault();
            run(() => closeSprint(sprint.id, target === "" ? null : target), () => onChanged(`Sprint « ${sprint.name} » clos.`));
          }}
        >
          <p className="text-sm font-semibold">
            Clore ce sprint ?{" "}
            {open === 0 ? "Toutes ses stories sont terminées." : `${open} story${open > 1 ? " non terminées" : " non terminée"} : que veux-tu en faire ?`}
          </p>
          {open > 0 && (
            <div className="grid gap-2">
              <Label htmlFor={`${titleId}-move`}>Les stories non terminées</Label>
              <select id={`${titleId}-move`} value={target} onChange={(e) => setMoveTo(e.target.value)} className={`${selectClass} sm:max-w-md`}>
                <option value="">Retournent au backlog</option>
                {planned.map((sp) => (
                  <option key={sp.id} value={sp.id}>
                    Passent au sprint « {sp.name} »
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="flex gap-3">
            <Button type="submit" size="sm" aria-disabled={pending}>
              {pending ? "Clôture…" : "Oui, clore le sprint"}
            </Button>
            <Button ref={cancelButton} type="button" variant="outline" size="sm" onClick={() => setMode("view")}>
              Annuler
            </Button>
          </div>
        </form>
      )}
      {mode === "delete" && (
        <ConfirmPanel
          label={`Supprimer le sprint ${sprint.name}`}
          question="Supprimer ce sprint ? C'est définitif."
          size="compact"
          stopEscape
          pending={pending}
          onCancel={() => setMode("view")}
          // `onDeleted` dès la réponse : la revalidation retire ce bloc avant qu'un effet ne s'exécute.
          onConfirm={() => run(() => deleteSprint(sprint.id), onDeleted)}
        >
          {stories.length > 0 && <strong className="text-foreground">{stories.length} stor{stories.length > 1 ? "ies retourneront" : "y retournera"} au backlog.</strong>}
        </ConfirmPanel>
      )}
      <StoryList
        listId={sprint.id}
        stories={stories}
        tasksByStory={tasksByStory}
        sprints={sprints}
        frozen={sprint.status === "closed"}
        emptyHint
        onDeleted={onMoved.bind(null, "User story supprimée.")}
        onMoved={onMoved}
      />
    </section>
  );
}
