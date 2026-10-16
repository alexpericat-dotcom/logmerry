"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { addStory } from "@/app/(app)/missions/story-actions";
import { createSprint } from "@/app/(app)/missions/sprint-actions";
import { SprintBlock } from "@/components/sprint-block";
import { SprintForm } from "@/components/sprint-form";
import { StoryForm } from "@/components/story-form";
import { StoryList } from "@/components/story-list";
import { StoryProposals, type LinkedNote } from "@/components/story-proposals";
import { Button } from "@/components/ui/button";
import type { SprintRecord } from "@/lib/db/sprints";
import type { TaskRecord } from "@/lib/db/tasks";
import type { StoryRecord } from "@/lib/db/user-stories";
import { progressLabel, storyProgress } from "@/lib/domain/user-stories";

/**
 * Les sprints d'une mission (en cours, planifiés, clos) puis son backlog (les user stories hors sprint) : stories compactes (le détail et les tâches se déplient),
 * réordonnables par glisser-déposer dans leur liste, avec ajout, modification, statut, sprint et suppression sur place.
 */
export function Backlog({ missionId, stories, tasks, notes, sprints, today }: { missionId: string; stories: StoryRecord[]; tasks: TaskRecord[]; notes: LinkedNote[]; sprints: SprintRecord[]; today: string }) {
  const tasksByStory = new Map<string, TaskRecord[]>();
  for (const t of tasks) tasksByStory.set(t.story_id, [...(tasksByStory.get(t.story_id) ?? []), t]);
  const storiesOf = (sprintId: string | null) => stories.filter((s) => s.sprint_id === sprintId);
  const active = sprints.find((sp) => sp.status === "active") ?? null;
  const planned = sprints.filter((sp) => sp.status === "planned");
  const closed = sprints.filter((sp) => sp.status === "closed");
  const backlog = storiesOf(null);

  const [adding, setAdding] = useState(false);
  const [addingSprint, setAddingSprint] = useState(false);
  // L'annonce porte un numéro : la même phrase deux fois de suite remonte l'élément et est relue par les lecteurs d'écran.
  const [announce, setAnnounceState] = useState({ text: "", n: 0 });
  const setAnnounce = useCallback((text: string) => setAnnounceState((a) => ({ text, n: a.n + 1 })), []);
  const heading = useRef<HTMLHeadingElement>(null);
  const sprintsHeading = useRef<HTMLHeadingElement>(null);
  // Une story ou un sprint qui disparaît (supprimé, déplacé dans une autre liste) emporte l'élément qui avait le focus : on le rend à un titre et on annonce l'issue.
  const storyEvent = useCallback(
    (message: string) => {
      setAnnounce(message);
      heading.current?.focus();
    },
    [setAnnounce],
  );
  const sprintEvent = useCallback(
    (message: string) => {
      setAnnounce(message);
      sprintsHeading.current?.focus();
    },
    [setAnnounce],
  );
  const addButton = useRef<HTMLButtonElement>(null);
  const addSprintButton = useRef<HTMLButtonElement>(null);
  const wasAdding = useRef(false);
  const wasAddingSprint = useRef(false);
  const done = () => setAdding(false);
  const doneSprint = () => setAddingSprint(false);
  useEffect(() => {
    if (!adding && wasAdding.current) addButton.current?.focus();
    wasAdding.current = adding;
  }, [adding]);
  useEffect(() => {
    if (!addingSprint && wasAddingSprint.current) addSprintButton.current?.focus();
    wasAddingSprint.current = addingSprint;
  }, [addingSprint]);

  const block = (sprint: SprintRecord) => (
    <SprintBlock
      key={sprint.id}
      missionId={missionId}
      sprint={sprint}
      stories={storiesOf(sprint.id)}
      tasksByStory={tasksByStory}
      sprints={sprints}
      today={today}
      onChanged={sprintEvent}
      onDeleted={() => sprintEvent("Sprint supprimé.")}
      onMoved={storyEvent}
    />
  );

  return (
    <div className="flex flex-col gap-6">
      <section aria-labelledby="sprints-title" className="flex flex-col gap-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="sprints-title" ref={sprintsHeading} tabIndex={-1} className="text-lg font-semibold outline-none">
            Sprints
          </h2>
          {active && <p className="text-sm text-muted-foreground">Un sprint est en cours</p>}
        </div>
        {sprints.length === 0 && !addingSprint && (
          <p className="text-sm text-muted-foreground">
            Un sprint est une courte période de livraison avec un objectif : tu y places des stories du backlog et tu livres une version qui marche. Crée ton premier sprint, puis place-y des stories depuis leur détail.
          </p>
        )}
        {active && block(active)}
        {planned.map(block)}
        {closed.length > 0 && (
          <details className="flex flex-col gap-3">
            <summary className="cursor-pointer text-sm underline-offset-4 hover:underline max-md:inline-flex max-md:min-h-11 max-md:items-center">
              Sprints clos ({closed.length})
            </summary>
            <div className="mt-3 flex flex-col gap-3">{closed.map(block)}</div>
          </details>
        )}
        {addingSprint ? (
          <SprintForm idPrefix="new-sprint" action={createSprint.bind(null, missionId)} submitLabel="Créer le sprint" onDone={doneSprint} onCancel={doneSprint} />
        ) : (
          <Button ref={addSprintButton} type="button" variant="outline" className="self-start" onClick={() => setAddingSprint(true)}>
            Ajouter un sprint
          </Button>
        )}
      </section>

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
        {backlog.length === 0 && !adding && (
          <p className="text-sm text-muted-foreground">
            {stories.length === 0
              ? "Le backlog est la liste de ce qu'il reste à faire pour cette mission, de la plus à la moins prioritaire. Ajoute une première user story : ce que tu veux faire, pour qui et pourquoi."
              : "Toutes les user stories sont dans un sprint. Les nouvelles stories arrivent ici."}
          </p>
        )}
        <StoryList missionId={missionId} sprintId={null} stories={backlog} tasksByStory={tasksByStory} sprints={sprints} onDeleted={() => storyEvent("User story supprimée.")} onMoved={storyEvent} />
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
    </div>
  );
}
