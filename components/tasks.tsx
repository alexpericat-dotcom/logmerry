"use client";

import { Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useId, useOptimistic, useRef, useState, useTransition, type ReactNode } from "react";

import { addTask, deleteTask, reorderTasks, setTaskDone, updateTask, type TaskActionState } from "@/app/(app)/missions/task-actions";
import { SortableList } from "@/components/sortable-list";
import { TaskProposals } from "@/components/task-proposals";
import { ConfirmPanel } from "@/components/confirm-panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { isRedirect, UNREACHABLE } from "@/lib/client-actions";
import type { TaskRecord } from "@/lib/db/tasks";
import { taskProgress, taskProgressLabel } from "@/lib/domain/tasks";


/** Lance une action de tâche sans faire sauter la page si elle lève ; renvoie son état. */
async function safely(task: () => Promise<TaskActionState>): Promise<TaskActionState> {
  try {
    return await task();
  } catch (e) {
    if (isRedirect(e)) throw e;
    return { message: UNREACHABLE };
  }
}

function TaskRow({ task, handle, onDeleted }: { task: TaskRecord; handle: ReactNode; onDeleted: () => void }) {
  const router = useRouter();
  const [mode, setMode] = useState<"view" | "edit" | "delete">("view");
  const [error, setError] = useState("");
  const [fieldError, setFieldError] = useState("");
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useOptimistic(task.done, (_, next: boolean) => next);
  const openedFrom = useRef<"edit" | "delete" | null>(null);
  const editButton = useRef<HTMLButtonElement>(null);
  const deleteButton = useRef<HTMLButtonElement>(null);
  const titleInput = useRef<HTMLInputElement>(null);
  const inputId = useId();

  // Le focus suit le mode : champ à l'édition, bouton d'origine au retour (« Annuler » reçoit le focus à la confirmation : ConfirmPanel).
  useEffect(() => {
    if (mode === "edit") titleInput.current?.focus();
    if (mode === "view" && openedFrom.current) (openedFrom.current === "edit" ? editButton : deleteButton).current?.focus();
    openedFrom.current = mode === "view" ? null : mode;
  }, [mode]);

  const report = (result: TaskActionState) => {
    if (result.message) {
      setError(result.message);
      if (result.gone) router.refresh();
      return false;
    }
    return true;
  };

  if (mode === "edit") {
    return (
      <form
        className="flex flex-col gap-1 py-1"
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.preventDefault();
            e.stopPropagation(); // la touche ferme l'édition, pas le panneau de l'assistant
            setMode("view");
          }
        }}
        onSubmit={(e) => {
          e.preventDefault();
          if (pending) return;
          const title = String(new FormData(e.currentTarget).get("title") ?? "");
          startTransition(async () => {
            setError("");
            setFieldError("");
            const result = await safely(() => updateTask(task.id, title));
            if (result.error) setFieldError(result.error);
            else if (report(result)) setMode("view");
          });
        }}
      >
        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor={inputId} className="sr-only">
            Titre de la tâche
          </label>
          <Input
            id={inputId}
            ref={titleInput}
            name="title"
            defaultValue={task.title}
            maxLength={200}
            aria-invalid={fieldError ? true : undefined}
            aria-describedby={fieldError ? `${inputId}-error` : undefined}
            className="min-w-0 flex-1"
          />
          <Button type="submit" size="sm" aria-disabled={pending}>
            {pending ? "Enregistrement…" : "Enregistrer"}
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => setMode("view")}>
            Annuler
          </Button>
        </div>
        {fieldError && (
          <p id={`${inputId}-error`} role="alert" className="text-sm text-destructive">
            {fieldError}
          </p>
        )}
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
      </form>
    );
  }

  if (mode === "delete") {
    return (
      <ConfirmPanel
        label={`Supprimer la tâche ${task.title}`}
        question="Supprimer cette tâche ? C'est définitif."
        size="compact"
        stopEscape
        pending={pending}
        error={error}
        onCancel={() => setMode("view")}
        onConfirm={() =>
          startTransition(async () => {
            setError("");
            // `onDeleted` dès la réponse : la revalidation retire cette ligne avant qu'un effet ne s'exécute.
            const result = await safely(() => deleteTask(task.id));
            if (report(result)) onDeleted();
          })
        }
      />
    );
  }

  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-1">
        {handle}
        <label className="flex min-h-9 min-w-0 flex-1 cursor-pointer items-center gap-2 max-md:min-h-11">
          <input
            type="checkbox"
            checked={done}
            aria-busy={pending}
            onChange={(e) => {
              if (pending) return;
              const next = e.target.checked;
              startTransition(async () => {
                setError("");
                setDone(next);
                report(await safely(() => setTaskDone(task.id, next)));
              });
            }}
            className="size-5 shrink-0 accent-[hsl(var(--primary))]"
          />
          <span className={`min-w-0 break-words text-sm ${done ? "text-muted-foreground line-through" : ""}`}>{task.title}</span>
        </label>
        <Button ref={editButton} type="button" variant="ghost" size="icon" className="max-md:size-11" onClick={() => setMode("edit")} aria-label={`Modifier la tâche ${task.title}`} title="Modifier">
          <Pencil size={16} aria-hidden="true" />
        </Button>
        <Button ref={deleteButton} type="button" variant="ghost" size="icon" className="text-destructive max-md:size-11" onClick={() => setMode("delete")} aria-label={`Supprimer la tâche ${task.title}`} title="Supprimer">
          <Trash2 size={16} aria-hidden="true" />
        </Button>
      </div>
      {error && (
        <p role="alert" className="pl-10 text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

/** Tâches d'une user story : liste réordonnable, case à cocher, modification et suppression sur place, ajout en bas. L'avancement ne change jamais le statut de la story. */
/** `showProgress` : faux pour une story terminée (voir `showTaskProgress`). */
export function Tasks({ storyId, storyTitle, tasks, showProgress }: { storyId: string; storyTitle: string; tasks: TaskRecord[]; showProgress: boolean }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [error, setError] = useState("");
  const [fieldError, setFieldError] = useState("");
  const [announce, setAnnounceState] = useState({ text: "", n: 0 });
  const [pending, startTransition] = useTransition();
  const input = useRef<HTMLInputElement>(null);
  const inputId = useId();
  const progress = taskProgressLabel(taskProgress(tasks));
  const say = (text: string) => setAnnounceState((a) => ({ text, n: a.n + 1 }));

  return (
    <section aria-label={`Tâches de la user story ${storyTitle}`} className="flex flex-col gap-2">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold">Tâches</h3>
        <p role="status" className="text-xs text-muted-foreground">
          {showProgress ? progress : ""}
        </p>
      </div>
      <p key={announce.n} className="sr-only" role="status" aria-live="polite">
        {announce.text}
      </p>
      {tasks.length > 0 && (
        <SortableList
          items={tasks}
          noun="la tâche"
          name={(t) => t.title}
          onReorder={(ids) => reorderTasks(storyId, ids)}
          className="flex flex-col gap-1"
        >
          {(task, handle) => (
            <TaskRow
              task={task}
              handle={handle}
              onDeleted={() => {
                say("Tâche supprimée.");
                input.current?.focus();
              }}
            />
          )}
        </SortableList>
      )}
      <form
        className="flex flex-col gap-1"
        onSubmit={(e) => {
          e.preventDefault();
          if (pending) return;
          startTransition(async () => {
            setError("");
            setFieldError("");
            const result = await safely(() => addTask(storyId, title));
            if (result.error) return setFieldError(result.error);
            if (result.message) {
              setError(result.message);
              if (result.gone) router.refresh();
              return;
            }
            setTitle("");
            say("Tâche ajoutée.");
            input.current?.focus();
          });
        }}
      >
        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor={inputId} className="sr-only">
            Nouvelle tâche
          </label>
          <Input
            id={inputId}
            ref={input}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Nouvelle tâche"
            maxLength={200}
            aria-invalid={fieldError ? true : undefined}
            aria-describedby={fieldError ? `${inputId}-error` : undefined}
            className="min-w-0 flex-1"
          />
          <Button type="submit" size="sm" variant="outline" aria-disabled={pending}>
            {pending ? "Ajout…" : "Ajouter"}
            <span className="sr-only"> la tâche</span>
          </Button>
        </div>
        {fieldError && (
          <p id={`${inputId}-error`} role="alert" className="text-sm text-destructive">
            {fieldError}
          </p>
        )}
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
      </form>
      <TaskProposals storyId={storyId} />
    </section>
  );
}
