"use client";

import { useDndContext, useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useCallback, useEffect, useId, useOptimistic, useRef, useState, useTransition, type ReactNode } from "react";

import { deleteStory, setStoryStatus, setStorySprint, updateStory, type StoryActionState } from "@/app/(app)/missions/story-actions";
import { Row } from "@/components/sortable-list";
import { selectClass } from "@/components/form-helpers";
import { StoryForm } from "@/components/story-form";
import { StoryReview } from "@/components/story-review";
import { Badge } from "@/components/ui/badge";
import { Tasks } from "@/components/tasks";
import { ConfirmPanel } from "@/components/confirm-panel";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { isRedirect, UNREACHABLE } from "@/lib/client-actions";
import type { SprintRecord } from "@/lib/db/sprints";
import type { TaskRecord } from "@/lib/db/tasks";
import type { StoryRecord } from "@/lib/db/user-stories";
import { SPRINT_STATUS_LABELS, acceptsStories } from "@/lib/domain/sprints";
import { showTaskProgress, taskProgress, taskProgressLabel } from "@/lib/domain/tasks";
import { STORY_STATUSES, STORY_STATUS_LABELS, storySentence, type StoryStatus } from "@/lib/domain/user-stories";

function DeleteStory({ story, taskCount, onCancel, onDeleted }: { story: StoryRecord; taskCount: number; onCancel: () => void; onDeleted: () => void }) {
  // `onDeleted` est appelé dès la réponse de l'action, pas dans un effet : l'action revalide la page et cette confirmation disparaît avec sa ligne avant qu'un effet ne s'exécute.
  const [state, action, pending] = useActionState<StoryActionState>(async () => {
    try {
      const result = await deleteStory(story.id);
      if (!result.message) onDeleted();
      return result;
    } catch (error) {
      if (isRedirect(error)) throw error;
      return { message: UNREACHABLE };
    }
  }, {});
  return (
    <ConfirmPanel
      label={`Supprimer la user story ${story.title}`}
      question={`Supprimer cette user story ? C'est définitif.${taskCount > 0 ? ` Ses ${taskCount > 1 ? `${taskCount} tâches seront supprimées` : "1 tâche sera supprimée"} aussi.` : ""}`}
      size="compact"
      className="mt-3"
      action={action}
      pending={pending}
      error={state.message}
      onCancel={onCancel}
    />
  );
}

export function StoryItem({
  story,
  tasks,
  handle,
  sprints,
  onDeleted,
  onMoved,
}: {
  story: StoryRecord;
  tasks: TaskRecord[];
  /** Poignée de glisser-déposer ; `null` dans un sprint clos (liste figée). */
  handle: ReactNode;
  /** Tous les sprints de la mission, pour le menu « Sprint ». */
  sprints: SprintRecord[];
  onDeleted: () => void;
  /** La story a changé de liste : la ligne disparaît d'ici, le parent annonce et rend le focus. */
  onMoved: (message: string) => void;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<"view" | "edit" | "delete">("view");
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setMode("view"), []);
  const editButton = useRef<HTMLButtonElement>(null);
  const deleteButton = useRef<HTMLButtonElement>(null);
  const openedFrom = useRef<"edit" | "delete" | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [status, setOptimisticStatus] = useOptimistic<StoryStatus, StoryStatus>(story.status, (_, next) => next);
  const progress = taskProgress(tasks);
  const currentSprint = sprints.find((sp) => sp.id === story.sprint_id) ?? null;
  const sprintSelectId = useId();
  const detailsId = useId();

  // Le focus revient sur le bouton qui avait ouvert le formulaire ou la confirmation (« Modifier » ou « Supprimer ») quand on la ferme sans supprimer.
  useEffect(() => {
    if (mode === "view" && openedFrom.current) (openedFrom.current === "edit" ? editButton : deleteButton).current?.focus();
    openedFrom.current = mode === "view" ? null : mode;
  }, [mode]);

  if (mode === "edit") {
    return (
      <StoryForm
        idPrefix={`edit-${story.id}`}
        action={updateStory.bind(null, story.id)}
        initial={{
          title: story.title,
          role: story.role ?? "",
          benefit: story.benefit ?? "",
          acceptance_criteria: story.acceptance_criteria ?? "",
          points: story.points === null ? "" : String(story.points),
          status: story.status,
        }}
        submitLabel="Enregistrer les modifications"
        onDone={close}
        onCancel={close}
      />
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-md border bg-card p-2">
      {/* Ligne repliée : poignée, titre (bouton qui déplie), statut, points, avancement des tâches. */}
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        {handle}
        <button
          type="button"
          aria-expanded={open}
          aria-controls={open ? detailsId : undefined}
          onClick={() => setOpen((o) => !o)}
          className="flex min-h-9 min-w-[10rem] flex-1 items-center gap-2 rounded-md text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring max-md:min-h-11"
        >
          <ChevronRight size={16} aria-hidden="true" className={`shrink-0 transition-transform ${open ? "rotate-90" : ""}`} />
          <span className="line-clamp-2 min-w-0 break-words font-semibold">{story.title}</span>
        </button>
        <div className="ml-auto flex shrink-0 items-center gap-2 max-md:pl-11">
          {showTaskProgress(status, progress) && (
            <span className="whitespace-nowrap text-xs text-muted-foreground" title={taskProgressLabel(progress)}>
              <span aria-hidden="true">{progress.done}/{progress.total} tâches</span>
              <span className="sr-only">{taskProgressLabel(progress)}</span>
            </span>
          )}
          {story.points !== null && <Badge variant="secondary">{story.points} pts</Badge>}
          <select
            aria-label={`Statut de la user story ${story.title}`}
            value={status}
            aria-busy={pending}
            onChange={(e) => {
              if (pending) return;
              const next = e.target.value as StoryStatus;
              startTransition(async () => {
                setError("");
                setOptimisticStatus(next);
                try {
                  const result = await setStoryStatus(story.id, next);
                  if (result.message) {
                    setError(result.message);
                    if (result.gone) router.refresh();
                  }
                } catch (e) {
                  if (isRedirect(e)) throw e;
                  setError(UNREACHABLE);
                }
              });
            }}
            className={`${selectClass} w-auto`}
          >
            {STORY_STATUSES.map((s) => (
              <option key={s} value={s}>
                {STORY_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </div>
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      {/* Détail monté seulement ouvert ; les tâches arrivent déjà avec la page. */}
      {open && (
        <div id={detailsId} className="flex flex-col gap-3 border-t border-filet px-1 pt-3">
          <p className="min-w-0 break-words">{storySentence(story)}</p>
          {story.source_note_id && story.source_note && (
            <p className="text-xs text-muted-foreground">
              Source :{" "}
              <Link href={`/notes/${story.source_note_id}`} className="text-primary underline underline-offset-4 max-md:inline-flex max-md:min-h-11 max-md:items-center">
                {story.source_note.title}
              </Link>
            </p>
          )}
          {story.acceptance_criteria && (
            <div className="text-sm">
              <p className="font-semibold">Critères d&apos;acceptation</p>
              <p className="mt-1 whitespace-pre-line break-words text-muted-foreground">{story.acceptance_criteria}</p>
            </div>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <Label htmlFor={sprintSelectId} className="text-sm">
              Sprint
            </Label>
            <select
              id={sprintSelectId}
              value={story.sprint_id ?? ""}
              aria-busy={pending}
              disabled={currentSprint?.status === "closed"}
              onChange={(e) => {
                if (pending) return;
                const next = e.target.value === "" ? null : e.target.value;
                const dest = next === null ? "le backlog" : (sprints.find((sp) => sp.id === next)?.name ?? "ce sprint");
                startTransition(async () => {
                  setError("");
                  try {
                    const result = await setStorySprint(story.id, next);
                    if (result.message) {
                      setError(result.message);
                      if (result.gone) router.refresh();
                    } else onMoved(`« ${story.title} » est maintenant dans ${next === null ? dest : `le sprint « ${dest} »`}.`);
                  } catch (err) {
                    if (isRedirect(err)) throw err;
                    setError(UNREACHABLE);
                  }
                });
              }}
              className={`${selectClass} w-auto min-w-48`}
            >
              <option value="">Hors sprint (backlog)</option>
              {sprints
                .filter((sp) => acceptsStories(sp.status) || sp.id === story.sprint_id)
                .map((sp) => (
                  <option key={sp.id} value={sp.id}>
                    {sp.name} ({SPRINT_STATUS_LABELS[sp.status].toLowerCase()})
                  </option>
                ))}
            </select>
            {currentSprint?.status === "closed" && <span className="text-xs text-muted-foreground">Sprint clos : la story n&apos;en sort plus.</span>}
          </div>
          <StoryReview storyId={story.id} storyTitle={story.title} />
          <Tasks storyId={story.id} storyTitle={story.title} tasks={tasks} showProgress={showTaskProgress(status, progress)} />
          {mode === "view" && (
            <div className="flex flex-wrap items-center justify-end gap-2 border-t border-filet pt-3">
              <Button ref={editButton} type="button" variant="outline" size="sm" onClick={() => setMode("edit")}>
                Modifier<span className="sr-only"> la user story {story.title}</span>
              </Button>
              <Button ref={deleteButton} type="button" variant="outline" size="sm" className="text-destructive" onClick={() => setMode("delete")}>
                Supprimer<span className="sr-only"> la user story {story.title}</span>
              </Button>
            </div>
          )}
          {mode === "delete" && <DeleteStory story={story} taskCount={tasks.length} onCancel={close} onDeleted={onDeleted} />}
        </div>
      )}
    </div>
  );
}


/**
 * Une liste de stories : celles d'un sprint ou le backlog hors sprint. Triable et zone de dépôt du contexte de glisser-déposer de la page (voir `Backlog`) :
 * les stories se réordonnent ici et passent d'une liste à l'autre ; figée (sans poignée ni zone de dépôt) pour un sprint clos.
 * Le menu « Sprint » de la story reste l'équivalent clavier et lecteur d'écran.
 */
export function StoryList({
  listId,
  stories,
  tasksByStory,
  sprints,
  frozen = false,
  emptyHint = false,
  onDeleted,
  onMoved,
}: {
  /** Identifiant de la liste dans le contexte de glisser-déposer : `BACKLOG` ou l'identifiant du sprint. */
  listId: string;
  stories: StoryRecord[];
  tasksByStory: Map<string, TaskRecord[]>;
  sprints: SprintRecord[];
  frozen?: boolean;
  /** Liste vide : montrer une zone où déposer une story. */
  emptyHint?: boolean;
  onDeleted: () => void;
  onMoved: (message: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: listId, disabled: frozen });
  const { active } = useDndContext();
  if (frozen) {
    if (stories.length === 0) return null;
    return (
      <ol className="flex flex-col gap-2">
        {stories.map((story) => (
          <li key={story.id}>
            <StoryItem story={story} tasks={tasksByStory.get(story.id) ?? []} handle={null} sprints={sprints} onDeleted={onDeleted} onMoved={onMoved} />
          </li>
        ))}
      </ol>
    );
  }
  if (stories.length === 0 && !emptyHint) return null;
  return (
    <SortableContext id={listId} items={stories.map((s) => s.id)} strategy={verticalListSortingStrategy}>
      <div ref={setNodeRef} className="flex flex-col gap-2">
        {stories.length === 0 ? (
          <p className={`rounded-md border border-dashed p-3 text-center text-sm text-muted-foreground ${active && isOver ? "border-primary bg-primary/10 text-foreground" : ""}`}>
            Glisse une story ici.
          </p>
        ) : (
          <ol className="flex flex-col gap-2">
            {stories.map((story) => (
              <Row key={story.id} item={story} itemName={story.title} noun="la user story" ghost>
                {(item, handle) => <StoryItem story={item} tasks={tasksByStory.get(item.id) ?? []} handle={handle} sprints={sprints} onDeleted={onDeleted} onMoved={onMoved} />}
              </Row>
            ))}
          </ol>
        )}
      </div>
    </SortableContext>
  );
}
