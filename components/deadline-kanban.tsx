"use client";

import { CalendarLineRow } from "@/components/calendar-line-row";
import { DeadlineRow } from "@/components/deadline-row";
import type { DeadlineRecord } from "@/lib/db/deadlines";
import { KANBAN_COLUMNS, KANBAN_LABELS, kanbanColumns, type KanbanColumn, type Urgency, URGENCY_STYLES } from "@/lib/domain/deadline-boards";
import type { CalendarLine } from "@/lib/domain/deadlines";
import { cn } from "@/lib/utils";

type Card = { key: string; due_on: string; done: boolean; deadline?: DeadlineRecord; line?: CalendarLine };

/** Couleur de la barre d'une colonne : le niveau d'urgence qu'elle regroupe (le titre de la colonne l'écrit aussi). */
const COLUMN_LEVEL: Record<KanbanColumn, Urgency> = { overdue: "overdue", week: "urgent", month: "week", later: "later", done: "done" };

/**
 * Kanban du calendrier : une colonne par échéance dans le temps (En retard, Cette semaine, Ce mois-ci, Plus tard, Faites). Pas de glisser-déposer :
 * on déplace une carte en la cochant « faite » (mêmes actions que la liste). Les lignes calculées sont en lecture seule.
 */
export function DeadlineKanban({ deadlines, lines, today, onChanged }: { deadlines: DeadlineRecord[]; lines: CalendarLine[]; today: string; onChanged: (message: string, sectionId: string) => void }) {
  const cards: Card[] = [
    ...deadlines.map((d) => ({ key: d.id, due_on: d.due_on, done: d.done_at !== null, deadline: d })),
    ...lines.flatMap((l) => (l.due_on ? [{ key: l.key, due_on: l.due_on, done: false, line: l }] : [])),
  ];
  const columns = kanbanColumns(cards, today);
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-start md:overflow-x-auto md:pb-2">
      {KANBAN_COLUMNS.map((col) => {
        const id = `kanban-${col}`;
        return (
          <section key={col} aria-labelledby={id} className={cn("flex min-w-0 flex-col gap-2 rounded-lg border border-t-4 bg-muted/30 p-2 md:w-80 md:shrink-0", URGENCY_STYLES[COLUMN_LEVEL[col]].top)}>
            <h2 id={id} tabIndex={-1} className="text-base font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring">
              {KANBAN_LABELS[col]} <span className="text-sm font-normal text-muted-foreground">({columns[col].length})</span>
            </h2>
            {columns[col].length === 0 ? (
              <p className="text-sm text-muted-foreground">Rien ici.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {columns[col].map((c) => (c.deadline ? <DeadlineRow key={c.key} deadline={c.deadline} today={today} sectionId={id} onChanged={onChanged} /> : c.line ? <CalendarLineRow key={c.key} line={c.line} today={today} /> : null))}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}
