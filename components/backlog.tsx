"use client";

import { ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useCallback, useEffect, useId, useOptimistic, useRef, useState, useTransition, type ReactNode } from "react";

import {
  addStory,
  deleteStory,
  reorderStories,
  setStoryStatus,
  updateStory,
  type StoryActionState,
} from "@/app/(app)/missions/story-actions";
import Link from "next/link";

import { SortableList } from "@/components/sortable-list";
import { StoryForm, selectClass } from "@/components/story-form";
import { StoryProposals, type LinkedNote } from "@/components/story-proposals";
import { Badge } from "@/components/ui/badge";
import { Tasks } from "@/components/tasks";
import { Button } from "@/components/ui/button";
import type { TaskRecord } from "@/lib/db/tasks";
import { taskProgress, taskProgressLabel } from "@/lib/domain/tasks";
import type { StoryRecord } from "@/lib/db/user-stories";
import {
  STORY_STATUSES,
  STORY_STATUS_LABELS,
  progressLabel,
  storyProgress,
  storySentence,
  type StoryStatus,
} from "@/lib/domain/user-stories";

/** Une action qui lève (réseau coupé, erreur serveur) ne doit pas faire sauter la page ; une redirection voulue (déconnexion) doit, elle, remonter. */
function isRedirect(error: unknown): boolean {
  return typeof error === "object" && error !== null && String((error as { digest?: unknown }).digest ?? "").startsWith("NEXT_REDIRECT");
}
const UNREACHABLE = "Le serveur ne répond pas. Réessaie dans un instant.";

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
  const cancel = useRef<HTMLButtonElement>(null);
  useEffect(() => cancel.current?.focus(), []); // « Annuler » d'abord : le choix sûr
  return (
    <form
      action={action}
      role="group"
      aria-label={`Supprimer la user story ${story.title}`}
      onKeyDown={(e) => {
        if (e.key !== "Escape" || pending) return;
        e.preventDefault(); // la confirmation prend la touche : le panneau de l'assistant reste ouvert
        onCancel();
      }}
      className="mt-3 flex flex-col gap-2 rounded-md border border-destructive p-3"
    >
      <p className="text-sm font-semibold">
        Supprimer cette user story ? C&apos;est définitif.
        {taskCount > 0 && ` Ses ${taskCount > 1 ? `${taskCount} tâches seront supprimées` : "1 tâche sera supprimée"} aussi.`}
      </p>
      {state.message && (
        <p role="alert" className="text-sm text-destructive">
          {state.message}
        </p>
      )}
      <div className="flex gap-3">
        <Button type="submit" variant="destructive" size="sm" disabled={pending}>
          {pending ? "Suppression…" : "Oui, supprimer"}
        </Button>
        <Button ref={cancel} type="button" variant="outline" size="sm" disabled={pending} onClick={onCancel}>
          Annuler
        </Button>
      </div>
    </form>
  );
}

function StoryItem({ story, tasks, handle, onDeleted }: { story: StoryRecord; tasks: TaskRecord[]; handle: ReactNode; onDeleted: () => void }) {
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
          aria-controls={detailsId}
          onClick={() => setOpen((o) => !o)}
          className="flex min-h-9 min-w-[10rem] flex-1 items-center gap-2 rounded-md text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring max-md:min-h-11"
        >
          <ChevronRight size={16} aria-hidden="true" className={`shrink-0 transition-transform ${open ? "rotate-90" : ""}`} />
          <span className="line-clamp-2 min-w-0 break-words font-semibold">{story.title}</span>
          <span className="sr-only">{open ? " (replier)" : " (déplier)"}</span>
        </button>
        <div className="ml-auto flex shrink-0 items-center gap-2 max-md:pl-11">
          {progress.total > 0 && (
            <span className="text-xs text-muted-foreground" title={taskProgressLabel(progress)}>
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
          <Tasks storyId={story.id} storyTitle={story.title} tasks={tasks} />
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

/** Backlog d'une mission : les user stories dans l'ordre de priorité, compactes (le détail et les tâches se déplient), réordonnables par glisser-déposer, avec ajout, modification, statut et suppression sur place. */
export function Backlog({ missionId, stories, tasks, notes }: { missionId: string; stories: StoryRecord[]; tasks: TaskRecord[]; notes: LinkedNote[] }) {
  const tasksByStory = new Map<string, TaskRecord[]>();
  for (const t of tasks) tasksByStory.set(t.story_id, [...(tasksByStory.get(t.story_id) ?? []), t]);
  const [adding, setAdding] = useState(false);
  // L'annonce porte un numéro : la même phrase deux fois de suite remonte l'élément et est relue par les lecteurs d'écran.
  const [announce, setAnnounceState] = useState({ text: "", n: 0 });
  const setAnnounce = useCallback((text: string) => setAnnounceState((a) => ({ text, n: a.n + 1 })), []);
  const heading = useRef<HTMLHeadingElement>(null);
  // Une story supprimée emporte le bouton qui avait le focus : on le rend au titre du backlog et on annonce la suppression.
  const deleted = useCallback(() => {
    setAnnounce("User story supprimée.");
    heading.current?.focus();
  }, [setAnnounce]);
  const addButton = useRef<HTMLButtonElement>(null);
  const wasAdding = useRef(false);
  const done = useCallback(() => setAdding(false), []);
  useEffect(() => {
    if (!adding && wasAdding.current) addButton.current?.focus();
    wasAdding.current = adding;
  }, [adding]);

  return (
    <section aria-labelledby="backlog-title" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="backlog-title" ref={heading} tabIndex={-1} className="text-lg font-semibold outline-none">
          Backlog
        </h2>
        <p role="status" className="text-sm text-muted-foreground">
          {progressLabel(storyProgress(stories))}
        </p>
      </div>
      <p key={announce.n} className="sr-only" role="status" aria-live="polite">
        {announce.text}
      </p>
      {stories.length === 0 && !adding && (
        <p className="text-sm text-muted-foreground">
          Le backlog est la liste de ce qu&apos;il reste à faire pour cette mission, de la plus à la moins prioritaire. Ajoute une première user story : ce que tu veux faire, pour qui et pourquoi.
        </p>
      )}
      {stories.length > 0 && (
        <SortableList
          items={stories}
          noun="la user story"
          name={(story) => story.title}
          onReorder={(ids) => reorderStories(missionId, ids)}
          className="flex flex-col gap-2"
        >
          {(story, handle) => <StoryItem story={story} tasks={tasksByStory.get(story.id) ?? []} handle={handle} onDeleted={deleted} />}
        </SortableList>
      )}
      {/* Toujours monté, seulement masqué pendant l'ajout à la main : brief, notes cochées et propositions ne sont pas perdus. */}
      <div className={adding ? "hidden" : "contents"}>
        <StoryProposals missionId={missionId} notes={notes} />
      </div>
      {adding ? (
        <StoryForm idPrefix="new-story" action={addStory.bind(null, missionId)} submitLabel="Ajouter la user story" onDone={done} onCancel={done} />
      ) : (
        <Button ref={addButton} type="button" className="self-start" onClick={() => setAdding(true)}>
          Ajouter une user story
        </Button>
      )}
    </section>
  );
}
