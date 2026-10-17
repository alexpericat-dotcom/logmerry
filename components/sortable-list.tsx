"use client";

import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useOptimistic, useState, useTransition, type ReactNode } from "react";

import { isRedirect, UNREACHABLE } from "@/lib/client-actions";

export type ReorderResult = { message?: string; gone?: boolean };


/** Une ligne triable avec sa poignée. `ghost` : l'élément saisi reste en place, estompé, pendant qu'un aperçu (`DragOverlay`) suit le pointeur. */
export function Row<T extends { id: string }>({ item, itemName, noun, ghost = false, children }: { item: T; itemName: string; noun: string; ghost?: boolean; children: (item: T, handle: ReactNode) => ReactNode }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  const handle = (
    <button
      type="button"
      ref={setActivatorNodeRef}
      id={`drag-${item.id}`}
      {...attributes}
      {...listeners}
      aria-label={`Déplacer ${noun} ${itemName}`}
      title="Glisser pour déplacer (ou Espace puis flèches au clavier)"
      className="inline-flex size-9 shrink-0 cursor-grab touch-none items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring active:cursor-grabbing max-md:size-11"
    >
      <GripVertical size={16} aria-hidden="true" />
    </button>
  );
  return (
    <li
      ref={setNodeRef}
      // Déplacement vertical seulement : le glisser ne suit pas la souris en largeur.
      style={{ transform: CSS.Transform.toString(transform && { ...transform, x: 0, scaleX: 1, scaleY: 1 }), transition }}
      className={isDragging ? (ghost ? "opacity-40" : "relative z-10 opacity-90 shadow-lg") : undefined}
    >
      {children(item, handle)}
    </li>
  );
}

/**
 * Liste réordonnable par glisser-déposer (souris, toucher par la poignée, clavier : Espace, flèches, Espace ; Échap annule), avec annonces en français.
 * L'ordre change tout de suite à l'écran puis `onReorder` l'enregistre ; en cas d'échec l'ordre d'origine revient et le message s'affiche.
 */
export function SortableList<T extends { id: string }>({
  items,
  noun,
  name,
  onReorder,
  className,
  children,
}: {
  items: T[];
  /** Ce que la liste contient, au singulier avec son article : « la user story », « la tâche ». */
  noun: string;
  name: (item: T) => string;
  onReorder: (ids: string[]) => Promise<ReorderResult>;
  className?: string;
  children: (item: T, handle: ReactNode) => ReactNode;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [, startTransition] = useTransition();
  const [shown, setShown] = useOptimistic<T[], string[]>(items, (current, ids) => ids.map((id) => current.find((i) => i.id === id)).filter((i): i is T => !!i));
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  const ids = shown.map((i) => i.id);
  const nameOf = (id: string | number) => {
    const item = shown.find((i) => i.id === id);
    return item ? name(item) : "";
  };
  const at = (id: string | number | undefined) => `${ids.indexOf(String(id)) + 1} sur ${ids.length}`;

  const announcements: Announcements = {
    onDragStart: ({ active }) => `« ${nameOf(active.id)} » saisi, position ${at(active.id)}.`,
    onDragOver: ({ active, over }) => (over ? `« ${nameOf(active.id)} » passe en position ${at(over.id)}.` : undefined),
    onDragEnd: ({ active, over }) => (over ? `« ${nameOf(active.id)} » déposé en position ${at(over.id)}.` : `« ${nameOf(active.id)} » déposé.`),
    onDragCancel: ({ active }) => `Déplacement annulé : « ${nameOf(active.id)} » reste en position ${at(active.id)}.`,
  };

  function onDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return;
    const next = arrayMove(ids, ids.indexOf(String(active.id)), ids.indexOf(String(over.id)));
    startTransition(async () => {
      setError("");
      setShown(next);
      try {
        const result = await onReorder(next);
        if (result.message) {
          setError(result.message);
          if (result.gone) router.refresh();
        }
      } catch (e) {
        if (isRedirect(e)) throw e;
        setError(UNREACHABLE);
      }
    });
  }

  return (
    <>
      <DndContext
        id={useId()} // identifiant stable : évite un écart serveur/navigateur sur les attributs d'accessibilité
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={onDragEnd}
        accessibility={{
          announcements,
          screenReaderInstructions: { draggable: "Pour déplacer : Espace pour saisir, flèches haut et bas pour choisir la place, Espace pour déposer, Échap pour annuler." },
        }}
      >
        <SortableContext items={ids} strategy={verticalListSortingStrategy}>
          <ol className={className}>
            {shown.map((item) => (
              <Row key={item.id} item={item} itemName={name(item)} noun={noun}>
                {children}
              </Row>
            ))}
          </ol>
        </SortableContext>
      </DndContext>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </>
  );
}
