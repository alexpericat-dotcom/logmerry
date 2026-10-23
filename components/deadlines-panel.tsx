"use client";

import { useCallback, useRef, useState } from "react";

import { createDeadline } from "@/app/(app)/calendrier/actions";
import { DeadlineForm } from "@/components/deadline-form";
import { DeadlineRow } from "@/components/deadline-row";
import { Button } from "@/components/ui/button";
import type { DeadlineRecord } from "@/lib/db/deadlines";
import { groupDeadlines } from "@/lib/domain/deadlines";

const empty = { title: "", due_on: "", category: "", source: "", note: "" };

/** Formulaire « Nouvelle échéance » et trois sections : En retard, À venir, Faites (décision 4 de la spec 5.1a). */
export function DeadlinesPanel({ deadlines, today }: { deadlines: DeadlineRecord[]; today: string }) {
  const [creating, setCreating] = useState(false);
  const [announce, setAnnounce] = useState("");
  const newRef = useRef<HTMLButtonElement>(null);
  const done = useCallback(() => setCreating(false), []);
  const changed = useCallback((message: string) => {
    setAnnounce(message);
    // Sans défilement automatique : le navigateur alignerait le bouton tout en haut, sous l'en-tête fixe, où il ne reçoit plus les clics.
    newRef.current?.focus({ preventScroll: true });
    newRef.current?.scrollIntoView({ block: "center" });
  }, []);
  const { overdue, upcoming, done: finished } = groupDeadlines(deadlines, today);

  const section = (id: string, title: string, rows: DeadlineRecord[], emptyText: string) => (
    <section aria-labelledby={id} className="flex flex-col gap-2">
      <h2 id={id} className="text-lg font-semibold">
        {title} <span className="text-sm font-normal text-muted-foreground">({rows.length})</span>
      </h2>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">{emptyText}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {rows.map((d) => (
            <DeadlineRow key={d.id} deadline={d} today={today} onChanged={changed} />
          ))}
        </ul>
      )}
    </section>
  );

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <p role="status" className="text-sm font-semibold">
        {overdue.length === 0 ? "Aucune échéance en retard." : `${overdue.length} échéance${overdue.length > 1 ? "s" : ""} en retard.`}
      </p>
      <p role="status" className="sr-only">
        {announce}
      </p>
      {creating ? (
        <DeadlineForm idPrefix="new" action={createDeadline} initial={empty} submitLabel="Créer l'échéance" onDone={done} onCancel={done} />
      ) : (
        <Button ref={newRef} type="button" size="sm" className="self-start" onClick={() => setCreating(true)}>
          Nouvelle échéance
        </Button>
      )}
      {section("deadlines-overdue", "En retard", overdue, "Rien en retard.")}
      {section("deadlines-upcoming", "À venir", upcoming, deadlines.length === 0 ? "Aucune échéance pour l'instant." : "Rien à venir.")}
      {section("deadlines-done", "Faites", finished, "Aucune échéance faite.")}
    </div>
  );
}
