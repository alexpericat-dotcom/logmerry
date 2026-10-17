"use client";

import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MeasuringStrategy,
  PointerSensor,
  closestCenter,
  getFirstCollision,
  pointerWithin,
  rectIntersection,
  useSensor,
  useSensors,
  type Announcements,
  type CollisionDetection,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { GripVertical } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useOptimistic, useRef, useState, useTransition } from "react";

import { addStory, moveStory, reorderStories } from "@/app/(app)/missions/story-actions";
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
import { isRedirect, UNREACHABLE } from "@/lib/client-actions";
import { nextSprintName } from "@/lib/domain/sprints";
import { BACKLOG, findList, moveToList, type Lists } from "@/lib/domain/story-board";
import { progressLabel, storyProgress } from "@/lib/domain/user-stories";

/**
 * Les sprints d'une mission (en cours, planifiés, clos) puis son backlog (les user stories hors sprint) : stories compactes (le détail et les tâches se déplient),
 * réordonnables par glisser-déposer dans leur liste et d'une liste à l'autre (sprint non clos ou backlog ; le menu « Sprint » de la story reste pour le clavier), avec ajout, modification, statut, sprint et suppression sur place.
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

  // Glisser-déposer entre listes : un seul contexte pour le backlog et les sprints non clos (un sprint clos n'est ni source ni cible).
  const router = useRouter();
  const [dndError, setDndError] = useState("");
  const [, startTransition] = useTransition();
  const baseLists: Lists = { [BACKLOG]: storiesOf(null).map((s) => s.id) };
  for (const sp of sprints) if (sp.status !== "closed") baseLists[sp.id] = storiesOf(sp.id).map((s) => s.id);
  const [optimistic, setOptimistic] = useOptimistic<Lists, Lists>(baseLists, (_, next) => next);
  // Pendant le glisser, les listes suivent le pointeur (la story change de liste à l'écran) ; `start` sert à savoir ce qui a changé au dépôt.
  const [drag, setDrag] = useState<{
    id: string;
    lists: Lists;
    start: Lists;
  } | null>(null);
  // Miroir synchrone de `drag` : deux événements de survol rapprochés arrivent avant le rendu et ne doivent pas s'écraser.
  const dragRef = useRef(drag);
  const updateDrag = (next: typeof drag) => {
    dragRef.current = next;
    setDrag(next);
  };
  // Une story ou un sprint arrivé pendant l'action (ajout dans un autre onglet) n'est pas dans l'état optimiste : on l'ajoute à sa liste plutôt que de le masquer.
  const shownLists: Lists = { ...optimistic };
  if (!drag) {
    const known = new Set(Object.values(optimistic).flat());
    for (const [key, ids] of Object.entries(baseLists)) {
      const missing = ids.filter((id) => !known.has(id));
      if (missing.length) shownLists[key] = [...(shownLists[key] ?? []), ...missing];
    }
  }
  const lists = drag?.lists ?? shownLists;
  const byId = new Map(stories.map((s) => [s.id, s]));
  const storiesIn = (key: string) =>
    (lists[key] ?? []).flatMap((id) => {
      const story = byId.get(id);
      return story ? [{ ...story, sprint_id: key === BACKLOG ? null : key }] : [];
    });
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
  const focusAfterDrop = useRef<string | null>(null);
  useEffect(() => {
    if (!focusAfterDrop.current) return;
    document.getElementById(`drag-${focusAfterDrop.current}`)?.focus(); // la ligne a changé de liste : son ancien élément a disparu avec le focus
    focusAfterDrop.current = null;
  });

  // Collision à plusieurs listes : sous le pointeur d'abord ; une liste touchée cède la place à sa story la plus proche (une liste vide reste la cible).
  const collisionDetection: CollisionDetection = (args) => {
    const hits = pointerWithin(args);
    const found = hits.length > 0 ? hits : rectIntersection(args);
    let overId = getFirstCollision(found, "id");
    if (overId === null || overId === undefined) return [];
    const items = lists[String(overId)];
    if (items && items.length > 0) {
      const nearest = closestCenter({
        ...args,
        droppableContainers: args.droppableContainers.filter((c) => items.includes(String(c.id))),
      });
      overId = nearest[0]?.id ?? overId;
    }
    return [{ id: overId }];
  };

  const listName = (key: string) => (key === BACKLOG ? "le backlog" : `le sprint « ${sprints.find((sp) => sp.id === key)?.name ?? "?"} »`);
  const titleOf = (id: string | number) => byId.get(String(id))?.title ?? "";
  // Où se trouve (ou se trouvera) la story sur laquelle on passe : sa liste et sa place ; une liste visée directement = sa dernière place.
  const placeOf = (overId: string | number) => {
    const key = findList(lists, String(overId));
    if (!key) return "";
    if (key === String(overId)) return `${listName(key)}, dernière place`;
    return `${listName(key)}, position ${lists[key].indexOf(String(overId)) + 1} sur ${lists[key].length}`;
  };
  const announcements: Announcements = {
    onDragStart: ({ active: a }) => `« ${titleOf(a.id)} » saisi dans ${placeOf(a.id)}.`,
    onDragOver: ({ active: a, over }) => (over ? `« ${titleOf(a.id)} » : ${placeOf(over.id)}.` : undefined),
    onDragEnd: ({ active: a, over }) => (over ? `« ${titleOf(a.id)} » déposé dans ${placeOf(over.id)}.` : `« ${titleOf(a.id)} » déposé.`),
    onDragCancel: ({ active: a }) => `Déplacement annulé : « ${titleOf(a.id)} » reste dans ${drag ? listName(findList(drag.start, String(a.id)) ?? BACKLOG) : "sa liste"}.`,
  };

  const onDragStart = ({ active: a }: DragStartEvent) => updateDrag({ id: String(a.id), lists: shownLists, start: shownLists });
  const onDragOver = ({ active: a, over }: DragOverEvent) => {
    const drag = dragRef.current;
    if (!drag || !over) return;
    const below = !!a.rect.current.translated && a.rect.current.translated.top > over.rect.top + over.rect.height;
    const next = moveToList(drag.lists, String(a.id), String(over.id), below);
    if (next !== drag.lists) updateDrag({ ...drag, lists: next });
  };
  const onDragEnd = ({ active: a, over, activatorEvent }: DragEndEvent) => {
    const drag = dragRef.current;
    if (!drag) return;
    // Relâché hors de toute zone : c'est une annulation, la story reste où elle était.
    if (!over) return updateDrag(null);
    const id = String(a.id);
    let final = drag.lists;
    const key = findList(final, id);
    // Même liste que la story survolée : elle prend sa place (le passage d'une liste à l'autre a déjà été fait au survol).
    if (over && key && key === findList(final, String(over.id)) && !(String(over.id) in final) && over.id !== a.id) {
      final = {
        ...final,
        [key]: arrayMove(final[key], final[key].indexOf(id), final[key].indexOf(String(over.id))),
      };
    }
    const from = findList(drag.start, id);
    updateDrag(null);
    if (!key || !from) return;
    if (activatorEvent instanceof KeyboardEvent) focusAfterDrop.current = id;
    const sprintId = key === BACKLOG ? null : key;
    let call: Promise<{ message?: string; gone?: boolean }>;
    if (key !== from) call = moveStory(missionId, id, sprintId, final[key]);
    else if (final[key].some((x, i) => x !== drag.start[key][i])) call = reorderStories(missionId, final[key], sprintId);
    else return;
    startTransition(async () => {
      setDndError("");
      setOptimistic(final);
      try {
        const result = await call;
        if (result.message) {
          setDndError(result.message);
          if (result.gone) router.refresh();
        }
      } catch (e) {
        if (isRedirect(e)) throw e;
        setDndError(UNREACHABLE);
      }
    });
  };
  const dragged = drag ? byId.get(drag.id) : undefined;

  const block = (sprint: SprintRecord) => (
    <SprintBlock
      key={sprint.id}
      sprint={sprint}
      stories={sprint.status === "closed" ? storiesOf(sprint.id) : storiesIn(sprint.id)}
      tasksByStory={tasksByStory}
      sprints={sprints}
      today={today}
      onChanged={sprintEvent}
      onDeleted={() => sprintEvent("Sprint supprimé.")}
      onMoved={storyEvent}
    />
  );

  return (
    <DndContext
      id={useId()} // identifiant stable : évite un écart serveur/navigateur sur les attributs d'accessibilité
      sensors={sensors}
      collisionDetection={collisionDetection}
      // Les listes changent de taille et de place pendant le glisser (la story quitte sa liste) : les zones sont re-mesurées à chaque passage.
      measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      onDragCancel={() => updateDrag(null)}
      accessibility={{
        announcements,
        screenReaderInstructions: {
          draggable:
            "Pour déplacer : Espace pour saisir, flèches haut et bas pour choisir la place (d'une liste à l'autre aussi), Espace pour déposer, Échap pour annuler. Le menu Sprint de chaque user story fait la même chose.",
        },
      }}
    >
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
              <summary className="cursor-pointer text-sm underline-offset-4 hover:underline max-md:inline-flex max-md:min-h-11 max-md:items-center">Sprints clos ({closed.length})</summary>
              <div className="mt-3 flex flex-col gap-3">{closed.map(block)}</div>
            </details>
          )}
          {addingSprint ? (
            <SprintForm idPrefix="new-sprint" action={createSprint.bind(null, missionId)} suggestedName={nextSprintName(sprints.map((sp) => sp.name))} submitLabel="Créer le sprint" onDone={doneSprint} onCancel={doneSprint} />
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
          <StoryList
            listId={BACKLOG}
            stories={storiesIn(BACKLOG)}
            emptyHint={stories.length > 0}
            tasksByStory={tasksByStory}
            sprints={sprints}
            onDeleted={() => storyEvent("User story supprimée.")}
            onMoved={storyEvent}
          />
          {/* Toujours monté, seulement masqué pendant l'ajout à la main : brief, notes cochées et propositions ne sont pas perdus. */}
          <div className={adding ? "hidden" : "contents"}>
            <StoryProposals missionId={missionId} notes={notes} />
          </div>
          {dndError && (
            <p role="alert" className="text-sm text-destructive">
              {dndError}
            </p>
          )}
          {adding ? (
            <StoryForm idPrefix="new-story" action={addStory.bind(null, missionId)} submitLabel="Ajouter la user story" onDone={done} onCancel={done} />
          ) : (
            <Button ref={addButton} type="button" className="self-start" onClick={() => setAdding(true)}>
              Ajouter une user story
            </Button>
          )}
        </section>
      </div>
      <DragOverlay>
        {dragged && (
          <div className="flex items-center gap-2 rounded-md border bg-card p-2 font-semibold shadow-lg">
            <GripVertical size={16} aria-hidden="true" className="shrink-0 text-muted-foreground" />
            <span className="line-clamp-2 min-w-0 break-words">{dragged.title}</span>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
