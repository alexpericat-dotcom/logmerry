"use client";

import { ArrowDown, ArrowUp } from "lucide-react";
import { useActionState, useCallback, useEffect, useOptimistic, useRef, useState, useTransition } from "react";

import {
  addStory,
  deleteStory,
  moveStory,
  setStoryStatus,
  updateStory,
  type StoryActionState,
  type StoryFormState,
} from "@/app/(app)/missions/story-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { StoryRecord } from "@/lib/db/user-stories";
import {
  STORY_POINTS,
  STORY_STATUSES,
  STORY_STATUS_LABELS,
  progressLabel,
  storyProgress,
  storySentence,
  type StoryStatus,
} from "@/lib/domain/user-stories";

const selectClass =
  "flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-base shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring max-md:h-11 md:text-sm";

type Values = { title: string; role: string; benefit: string; acceptance_criteria: string; points: string; status: string };
const EMPTY: Values = { title: "", role: "", benefit: "", acceptance_criteria: "", points: "", status: "todo" };

function StoryForm({
  idPrefix,
  action,
  initial,
  submitLabel,
  onDone,
  onCancel,
}: {
  idPrefix: string;
  action: (state: StoryFormState, formData: FormData) => Promise<StoryFormState>;
  initial?: Values;
  submitLabel: string;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [state, formAction, pending] = useActionState<StoryFormState, FormData>(action, {});
  // Après une erreur, les valeurs renvoyées par l'action l'emportent sur les valeurs initiales.
  const values = state.values ?? initial ?? EMPTY;
  const errors = state.errors ?? {};
  const title = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (state.ok) onDone();
  }, [state.ok, onDone]);
  useEffect(() => title.current?.focus(), []);

  const field = (key: keyof Values) => {
    const id = `${idPrefix}-${key}`;
    return { id, name: key, defaultValue: values[key], "aria-invalid": errors[key] ? (true as const) : undefined, "aria-describedby": errors[key] ? `${id}-error` : undefined };
  };
  const errorLine = (key: keyof Values) =>
    errors[key] && (
      <p id={`${idPrefix}-${key}-error`} role="alert" className="text-sm text-destructive">
        {errors[key]}
      </p>
    );

  return (
    <form action={formAction} noValidate className="flex max-w-2xl flex-col gap-4 rounded-md border border-primary/30 bg-primary/10 p-4">
      <div className="grid gap-2">
        <Label htmlFor={`${idPrefix}-title`}>Je veux… (obligatoire)</Label>
        <Input {...field("title")} ref={title} aria-required="true" autoComplete="off" placeholder="voir où en est chaque inscription" />
        {errorLine("title")}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor={`${idPrefix}-role`}>En tant que…</Label>
          <Input {...field("role")} autoComplete="off" placeholder="responsable des ateliers" />
          {errorLine("role")}
        </div>
        <div className="grid gap-2">
          <Label htmlFor={`${idPrefix}-benefit`}>Afin de…</Label>
          <Input {...field("benefit")} autoComplete="off" placeholder="relancer à temps les familles" />
          {errorLine("benefit")}
        </div>
      </div>
      <div className="grid gap-2">
        <Label htmlFor={`${idPrefix}-acceptance_criteria`}>Critères d&apos;acceptation</Label>
        <Textarea {...field("acceptance_criteria")} rows={4} />
        {errorLine("acceptance_criteria")}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor={`${idPrefix}-points`}>Points</Label>
          <select {...field("points")} className={selectClass}>
            <option value="">Sans points</option>
            {STORY_POINTS.map((p) => (
              <option key={p} value={String(p)}>
                {p}
              </option>
            ))}
          </select>
          {errorLine("points")}
        </div>
        <div className="grid gap-2">
          <Label htmlFor={`${idPrefix}-status`}>Statut</Label>
          <select {...field("status")} className={selectClass}>
            {STORY_STATUSES.map((s) => (
              <option key={s} value={s}>
                {STORY_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
          {errorLine("status")}
        </div>
      </div>
      {state.message && (
        <p role="alert" className="text-sm text-destructive">
          {state.message}
        </p>
      )}
      <div className="flex items-center gap-4">
        <Button type="submit" disabled={pending}>
          {pending ? "Enregistrement…" : submitLabel}
        </Button>
        <button type="button" onClick={onCancel} className="text-sm underline underline-offset-4 max-md:inline-flex max-md:min-h-11 max-md:items-center">
          Annuler
        </button>
      </div>
    </form>
  );
}

function DeleteStory({ story, onCancel }: { story: StoryRecord; onCancel: () => void }) {
  const [state, action, pending] = useActionState<StoryActionState>(() => deleteStory(story.id), {});
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
      <p className="text-sm font-semibold">Supprimer cette user story ? C&apos;est définitif.</p>
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

function StoryItem({
  story,
  rank,
  count,
  onAnnounce,
}: {
  story: StoryRecord;
  rank: number;
  count: number;
  onAnnounce: (message: string) => void;
}) {
  const [mode, setMode] = useState<"view" | "edit" | "delete">("view");
  const close = useCallback(() => setMode("view"), []);
  const editButton = useRef<HTMLButtonElement>(null);
  const wasOpen = useRef(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [status, setOptimisticStatus] = useOptimistic<StoryStatus, StoryStatus>(story.status, (_, next) => next);

  // Le focus revient sur « Modifier » quand le formulaire ou la confirmation se ferme sans supprimer.
  useEffect(() => {
    if (mode === "view" && wasOpen.current) editButton.current?.focus();
    wasOpen.current = mode !== "view";
  }, [mode]);

  const run = (task: () => Promise<StoryActionState>, onOk?: () => void) =>
    startTransition(async () => {
      setError("");
      const result = await task();
      if (result.message) setError(result.message);
      else onOk?.();
    });

  if (mode === "edit") {
    return (
      <li>
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
      </li>
    );
  }

  return (
    <li className="flex flex-col gap-3 rounded-md border bg-card p-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="min-w-0 break-words font-semibold">{storySentence(story)}</p>
        <div className="flex shrink-0 items-center gap-2">
          {story.points !== null && <Badge variant="secondary">{story.points} pts</Badge>}
          <select
            aria-label={`Statut de la user story ${story.title}`}
            value={status}
            disabled={pending}
            onChange={(e) => {
              const next = e.target.value as StoryStatus;
              startTransition(async () => {
                setError("");
                setOptimisticStatus(next);
                const result = await setStoryStatus(story.id, next);
                if (result.message) setError(result.message);
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
      {story.acceptance_criteria && (
        <details className="text-sm">
          <summary className="cursor-pointer underline-offset-4 hover:underline max-md:inline-flex max-md:min-h-11 max-md:items-center">Critères d&apos;acceptation</summary>
          <p className="mt-1 whitespace-pre-line break-words text-muted-foreground">{story.acceptance_criteria}</p>
        </details>
      )}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      {mode === "view" && (
        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-filet pt-3">
          <Button
            type="button"
            variant="outline"
            size="icon"
            disabled={pending || rank === 0}
            onClick={() => run(() => moveStory(story.id, "up"), () => onAnnounce(`« ${story.title} » est maintenant en position ${rank} sur ${count}.`))}
            aria-label={`Monter la user story ${story.title}`}
            title="Monter"
          >
            <ArrowUp size={16} aria-hidden="true" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            disabled={pending || rank === count - 1}
            onClick={() => run(() => moveStory(story.id, "down"), () => onAnnounce(`« ${story.title} » est maintenant en position ${rank + 2} sur ${count}.`))}
            aria-label={`Descendre la user story ${story.title}`}
            title="Descendre"
          >
            <ArrowDown size={16} aria-hidden="true" />
          </Button>
          <Button ref={editButton} type="button" variant="outline" size="sm" onClick={() => setMode("edit")}>
            Modifier<span className="sr-only"> la user story {story.title}</span>
          </Button>
          <Button type="button" variant="outline" size="sm" className="text-destructive" onClick={() => setMode("delete")}>
            Supprimer<span className="sr-only"> la user story {story.title}</span>
          </Button>
        </div>
      )}
      {mode === "delete" && <DeleteStory story={story} onCancel={close} />}
    </li>
  );
}

/** Backlog d'une mission : les user stories dans l'ordre de priorité, avec ajout, modification, statut, déplacement et suppression sur place. */
export function Backlog({ missionId, stories }: { missionId: string; stories: StoryRecord[] }) {
  const [adding, setAdding] = useState(false);
  const [announce, setAnnounce] = useState("");
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
        <h2 id="backlog-title" className="text-lg font-semibold">
          Backlog
        </h2>
        <p role="status" className="text-sm text-muted-foreground">
          {progressLabel(storyProgress(stories))}
        </p>
      </div>
      <p className="sr-only" role="status" aria-live="polite">
        {announce}
      </p>
      {stories.length === 0 && !adding && (
        <p className="text-sm text-muted-foreground">
          Le backlog est la liste de ce qu&apos;il reste à faire pour cette mission, de la plus à la moins prioritaire. Ajoute une première user story : ce que tu veux faire, pour qui et pourquoi.
        </p>
      )}
      {stories.length > 0 && (
        <ol className="flex flex-col gap-2">
          {stories.map((story, i) => (
            <StoryItem key={story.id} story={story} rank={i} count={stories.length} onAnnounce={setAnnounce} />
          ))}
        </ol>
      )}
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
