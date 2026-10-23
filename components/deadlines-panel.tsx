"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { createDeadline, type DeadlineFormState } from "@/app/(app)/calendrier/actions";
import { CalendarLineRow } from "@/components/calendar-line-row";
import { DeadlineForm } from "@/components/deadline-form";
import { DeadlineRow } from "@/components/deadline-row";
import { FilterChips } from "@/components/filter-chips";
import { Button } from "@/components/ui/button";
import type { DeadlineRecord } from "@/lib/db/deadlines";
import { DEADLINE_VIEWS, DEADLINE_VIEW_LABELS, groupDeadlines, inView, type CalendarLine, type DeadlineView } from "@/lib/domain/deadlines";

const empty = { title: "", due_on: "", category: "", source: "", note: "", priority: "normal", recurrence: "" };

type Entry = { key: string; date: string; node: React.ReactNode };
const byDate = (a: Entry, b: Entry) => a.date.localeCompare(b.date) || a.key.localeCompare(b.key);

/** Formulaire « Nouvelle échéance » et trois sections : En retard, À venir, Faites (décision 4 de la spec 5.1a). */
export function DeadlinesPanel({ deadlines, lines, view, today }: { deadlines: DeadlineRecord[]; lines: CalendarLine[]; view: DeadlineView; today: string }) {
  const [creating, setCreating] = useState(false);
  const [announce, setAnnounce] = useState("");
  const newRef = useRef<HTMLButtonElement>(null);
  const wasCreating = useRef(false);
  const done = useCallback(() => setCreating(false), []);
  // Le formulaire se ferme (créé ou annulé) : le focus revient sur « Nouvelle échéance » (le bouton cliqué avait disparu), sans défilement.
  useEffect(() => {
    if (!creating && wasCreating.current) newRef.current?.focus({ preventScroll: true });
    wasCreating.current = creating;
  }, [creating]);
  const create = useCallback(async (prev: DeadlineFormState, formData: FormData) => {
    const result = await createDeadline(prev, formData);
    if (result.saved) setAnnounce(`Échéance ${String(formData.get("title") ?? "").trim()} créée.`);
    return result;
  }, []);
  // Une ligne marquée faite, rouverte, déplacée ou supprimée disparaît de sa section : on annonce, puis on met le focus sur le titre de cette
  // section, SANS défilement (la page ne bouge pas, on enchaîne sur la ligne suivante). Les titres sont toujours présents, même sections vides.
  const changed = useCallback((message: string, sectionId: string) => {
    setAnnounce(message);
    document.getElementById(sectionId)?.focus({ preventScroll: true });
  }, []);
  // Story 5.1b : la vue filtre les échéances stockées et les lignes datées ; « À confirmer » (sans date) n'est que dans « Toutes ».
  const visible = deadlines.filter((d) => inView(view, { due_on: d.due_on, done: d.done_at !== null }, today));
  const datedLines = lines.filter((l) => l.due_on !== null && inView(view, { due_on: l.due_on, done: false }, today));
  const undatedLines = view === "toutes" ? lines.filter((l) => l.due_on === null) : [];
  const { overdue, upcoming, done: finished } = groupDeadlines(visible, today);
  const overdueCount = groupDeadlines(deadlines, today).overdue.length + lines.filter((l) => l.due_on !== null && l.due_on < today).length;

  const section = (id: string, title: string, rows: DeadlineRecord[], extra: CalendarLine[], emptyText: string) => {
    const list: Entry[] = [
      ...rows.map((d) => ({ key: d.id, date: d.due_on, node: <DeadlineRow key={d.id} deadline={d} today={today} sectionId={id} onChanged={changed} /> })),
      ...extra.map((l) => ({ key: l.key, date: l.due_on as string, node: <CalendarLineRow key={l.key} line={l} /> })),
    ];
    // Le tri par date ne sert qu'à intercaler les lignes calculées ; sans elles, l'ordre de `groupDeadlines` (dont « Faites », par date de réalisation) reste.
    if (extra.length) list.sort(byDate);
    return (
      <section aria-labelledby={id} className="flex flex-col gap-2">
        <h2 id={id} tabIndex={-1} className="text-lg font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring">
          {title} <span className="text-sm font-normal text-muted-foreground">({list.length})</span>
        </h2>
        {list.length === 0 ? (
          <p className="text-sm text-muted-foreground">{emptyText}</p>
        ) : (
          <ul className="flex flex-col gap-2">{list.map((e) => e.node)}</ul>
        )}
      </section>
    );
  };
  const chips = DEADLINE_VIEWS.map((v) => ({ label: DEADLINE_VIEW_LABELS[v], href: v === "toutes" ? "/calendrier" : `/calendrier?vue=${v}`, active: v === view }));

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <p className="text-sm font-semibold">
        {overdueCount === 0 ? "Rien en retard." : `${overdueCount} élément${overdueCount > 1 ? "s" : ""} en retard (échéances et factures).`}
      </p>
      <p role="status" className="sr-only">
        {announce}
      </p>
      <FilterChips label="Choisir une vue du calendrier" items={chips} />
      {creating ? (
        <DeadlineForm idPrefix="new" action={create} initial={empty} submitLabel="Créer l'échéance" onDone={done} onCancel={done} canRecur />
      ) : (
        <Button ref={newRef} type="button" size="sm" className="self-start" onClick={() => setCreating(true)}>
          Nouvelle échéance
        </Button>
      )}
      {(view === "toutes" || view === "retard") && section("deadlines-overdue", "En retard", overdue, datedLines.filter((l) => (l.due_on as string) < today), "Rien en retard.")}
      {view !== "retard" && section("deadlines-upcoming", "À venir", upcoming, datedLines.filter((l) => (l.due_on as string) >= today), deadlines.length === 0 && lines.length === 0 ? "Aucune échéance pour l'instant." : "Rien à venir.")}
      {view === "toutes" && section("deadlines-done", "Faites", finished, [], "Aucune échéance faite.")}
      {view === "toutes" && undatedLines.length > 0 && (
        <section aria-labelledby="deadlines-confirm" className="flex flex-col gap-2">
          <h2 id="deadlines-confirm" className="text-lg font-semibold">
            À confirmer <span className="text-sm font-normal text-muted-foreground">({undatedLines.length})</span>
          </h2>
          <p className="text-sm text-muted-foreground">Obligations attendues d&apos;après ton profil, sans date : rien n&apos;est estimé. Saisis l&apos;échéance avec sa source officielle.</p>
          <ul className="flex flex-col gap-2">
            {undatedLines.map((l) => (
              <CalendarLineRow key={l.key} line={l} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
