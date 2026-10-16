"use client";

import { ArrowDown, ArrowUp } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useCallback, useEffect, useOptimistic, useRef, useState, useTransition } from "react";

import {
  addStory,
  deleteStory,
  moveStory,
  setStoryStatus,
  updateStory,
  type StoryActionState,
} from "@/app/(app)/missions/story-actions";
import Link from "next/link";

import { StoryForm, selectClass } from "@/components/story-form";
import { StoryProposals, type LinkedNote } from "@/components/story-proposals";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

function DeleteStory({ story, onCancel, onDeleted }: { story: StoryRecord; onCancel: () => void; onDeleted: () => void }) {
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
  onDeleted,
}: {
  story: StoryRecord;
  rank: number;
  count: number;
  onAnnounce: (message: string) => void;
  onDeleted: () => void;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<"view" | "edit" | "delete">("view");
  const close = useCallback(() => setMode("view"), []);
  const editButton = useRef<HTMLButtonElement>(null);
  const deleteButton = useRef<HTMLButtonElement>(null);
  const openedFrom = useRef<"edit" | "delete" | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [status, setOptimisticStatus] = useOptimistic<StoryStatus, StoryStatus>(story.status, (_, next) => next);

  // Le focus revient sur le bouton qui avait ouvert le formulaire ou la confirmation (« Modifier » ou « Supprimer ») quand on la ferme sans supprimer.
  useEffect(() => {
    if (mode === "view" && openedFrom.current) (openedFrom.current === "edit" ? editButton : deleteButton).current?.focus();
    openedFrom.current = mode === "view" ? null : mode;
  }, [mode]);

  // Les boutons restent actifs pendant la requête (un bouton désactivé perd le focus clavier) : on ignore simplement les clics en cours.
  const run = (task: () => Promise<StoryActionState>, onOk?: () => void) => {
    if (pending) return;
    startTransition(async () => {
      setError("");
      try {
        const result = await task();
        if (result.message) {
          setError(result.message);
          if (result.gone) router.refresh();
        } else onOk?.();
      } catch (e) {
        if (isRedirect(e)) throw e;
        setError(UNREACHABLE);
      }
    });
  };

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
      {story.source_note_id && story.source_note && (
        <p className="text-xs text-muted-foreground">
          Source :{" "}
          <Link href={`/notes/${story.source_note_id}`} className="text-primary underline underline-offset-4 max-md:inline-flex max-md:min-h-11 max-md:items-center">
            {story.source_note.title}
          </Link>
        </p>
      )}
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
            aria-disabled={rank === 0}
            className="aria-disabled:pointer-events-none aria-disabled:opacity-50"
            onClick={() => {
              if (rank === 0) return;
              run(() => moveStory(story.id, "up"), () => onAnnounce(`« ${story.title} » est maintenant en position ${rank} sur ${count}.`));
            }}
            aria-label={`Monter la user story ${story.title}`}
            title="Monter"
          >
            <ArrowUp size={16} aria-hidden="true" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-disabled={rank === count - 1}
            className="aria-disabled:pointer-events-none aria-disabled:opacity-50"
            onClick={() => {
              if (rank === count - 1) return;
              run(() => moveStory(story.id, "down"), () => onAnnounce(`« ${story.title} » est maintenant en position ${rank + 2} sur ${count}.`));
            }}
            aria-label={`Descendre la user story ${story.title}`}
            title="Descendre"
          >
            <ArrowDown size={16} aria-hidden="true" />
          </Button>
          <Button ref={editButton} type="button" variant="outline" size="sm" onClick={() => setMode("edit")}>
            Modifier<span className="sr-only"> la user story {story.title}</span>
          </Button>
          <Button ref={deleteButton} type="button" variant="outline" size="sm" className="text-destructive" onClick={() => setMode("delete")}>
            Supprimer<span className="sr-only"> la user story {story.title}</span>
          </Button>
        </div>
      )}
      {mode === "delete" && <DeleteStory story={story} onCancel={close} onDeleted={onDeleted} />}
    </li>
  );
}

/** Backlog d'une mission : les user stories dans l'ordre de priorité, avec ajout, modification, statut, déplacement et suppression sur place. */
export function Backlog({ missionId, stories, notes }: { missionId: string; stories: StoryRecord[]; notes: LinkedNote[] }) {
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
        <ol className="flex flex-col gap-2">
          {stories.map((story, i) => (
            <StoryItem key={story.id} story={story} rank={i} count={stories.length} onAnnounce={setAnnounce} onDeleted={deleted} />
          ))}
        </ol>
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
