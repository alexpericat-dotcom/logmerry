"use client";

import { useCallback, useState } from "react";

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
  const done = useCallback(() => setCreating(false), []);
  // Une ligne marquée faite, rouverte, déplacée ou supprimée disparaît de sa section : on annonce, puis on met le focus sur le titre de cette
  // section, SANS défilement (la page ne bouge pas, on enchaîne sur la ligne suivante). Les titres sont toujours présents, même sections vides.
  const changed = useCallback((message: string, sectionId: string) => {
    setAnnounce(message);
    document.getElementById(sectionId)?.focus({ preventScroll: true });
  }, []);
  const { overdue, upcoming, done: finished } = groupDeadlines(deadlines, today);

  const section = (id: string, title: string, rows: DeadlineRecord[], emptyText: string) => (
    <section aria-labelledby={id} className="flex flex-col gap-2">
      <h2 id={id} tabIndex={-1} className="text-lg font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring">
        {title} <span className="text-sm font-normal text-muted-foreground">({rows.length})</span>
      </h2>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">{emptyText}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {rows.map((d) => (
            <DeadlineRow key={d.id} deadline={d} today={today} sectionId={id} onChanged={changed} />
          ))}
        </ul>
      )}
    </section>
  );

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <p className="text-sm font-semibold">
        {overdue.length === 0 ? "Aucune échéance en retard." : `${overdue.length} échéance${overdue.length > 1 ? "s" : ""} en retard.`}
      </p>
      <p role="status" className="sr-only">
        {announce}
      </p>
      {creating ? (
        <DeadlineForm idPrefix="new" action={createDeadline} initial={empty} submitLabel="Créer l'échéance" onDone={done} onCancel={done} />
      ) : (
        <Button type="button" size="sm" className="self-start" onClick={() => setCreating(true)}>
          Nouvelle échéance
        </Button>
      )}
      {section("deadlines-overdue", "En retard", overdue, "Rien en retard.")}
      {section("deadlines-upcoming", "À venir", upcoming, deadlines.length === 0 ? "Aucune échéance pour l'instant." : "Rien à venir.")}
      {section("deadlines-done", "Faites", finished, "Aucune échéance faite.")}
    </div>
  );
}
