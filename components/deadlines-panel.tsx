"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { createDeadline, type DeadlineFormState } from "@/app/(app)/calendrier/actions";
import { CalendarLineRow } from "@/components/calendar-line-row";
import { DeadlineForm } from "@/components/deadline-form";
import { DeadlineGantt } from "@/components/deadline-gantt";
import { DeadlineKanban } from "@/components/deadline-kanban";
import { DeadlineRow } from "@/components/deadline-row";
import { FilterChips } from "@/components/filter-chips";
import { PageBanner } from "@/components/page-banner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { DeadlineRecord } from "@/lib/db/deadlines";
import { DISPLAYS, DISPLAY_LABELS, calendarHref, type Display } from "@/lib/domain/deadline-boards";
import { calendarSections, overdueText, viewChangeAnnouncement } from "@/lib/domain/calendar-panel";
import { DEADLINE_VIEWS, DEADLINE_VIEW_LABELS, type CalendarLine, type DeadlineView } from "@/lib/domain/deadlines";

export const CALENDAR_DESCRIPTION = "Tes obligations administratives, chacune avec sa date et son lien officiel. Ce n'est pas un agenda : pas de rendez-vous, seulement ce que tu dois faire avant une date.";

const empty = { title: "", due_on: "", category: "", source: "", note: "", priority: "normal", recurrence: "" };

type Entry = { key: string; date: string; node: React.ReactNode };
const byDate = (a: Entry, b: Entry) => a.date.localeCompare(b.date) || a.key.localeCompare(b.key);

/** Formulaire « Nouvelle échéance » et trois sections : En retard, À venir, Faites (décision 4 de la spec 5.1a). */
export function DeadlinesPanel({ deadlines, lines, view, display, today }: { deadlines: DeadlineRecord[]; lines: CalendarLine[]; view: DeadlineView; display: Display; today: string }) {
  const [creating, setCreating] = useState(false);
  const [announce, setAnnounce] = useState("");
  // Changer d'affichage ou de période est une navigation : rien ne le dit à un lecteur d'écran. Ajustement pendant le rendu (jamais d'effet) : la page ne
  // s'annonce pas à son premier rendu, puisque `seen` part de la vue courante.
  const [seen, setSeen] = useState({ view, display });
  if (seen.view !== view || seen.display !== display) {
    setSeen({ view, display });
    setAnnounce(viewChangeAnnouncement(seen, { view, display }) ?? "");
  }
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
  const { visible, datedLines, undatedLines, overdue, upcoming, finished, overdueLines, upcomingLines, overdueCount, show, upcomingEmpty } = calendarSections(deadlines, lines, view, today);

  const section = (id: string, title: string, rows: DeadlineRecord[], extra: CalendarLine[], emptyText: string) => {
    const list: Entry[] = [
      ...rows.map((d) => ({ key: d.id, date: d.due_on, node: <DeadlineRow key={d.id} deadline={d} today={today} sectionId={id} onChanged={changed} /> })),
      ...extra.map((l) => ({ key: l.key, date: l.due_on as string, node: <CalendarLineRow key={l.key} line={l} today={today} /> })),
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
  // L'adresse garde les deux choix : la période (`vue`) et l'affichage (`affichage`).
  const href = calendarHref;
  const chips = DEADLINE_VIEWS.map((v) => ({ label: DEADLINE_VIEW_LABELS[v], href: href(v, display), active: v === view }));
  const displayChips = DISPLAYS.map((d) => ({ label: DISPLAY_LABELS[d], href: href(view, d), active: d === display }));

  return (
    <>
      <PageBanner
        title="Calendrier"
        className="self-stretch"
        description={CALENDAR_DESCRIPTION}
        actions={
          <Button ref={newRef} type="button" size="lg" className="shrink-0" onClick={() => setCreating(true)}>
            Nouvelle échéance
          </Button>
        }
      >
        <FilterChips label="Choisir un affichage du calendrier" items={displayChips} />
        <FilterChips label="Choisir une période du calendrier" items={chips} />
      </PageBanner>
      <div className={cn("flex flex-col gap-6", display === "liste" && "max-w-3xl")}>
        <p className="text-sm font-semibold">
          {overdueText(overdueCount)}
        </p>
        <p role="status" className="sr-only">
          {announce}
        </p>
        {creating && <DeadlineForm idPrefix="new" action={create} initial={empty} submitLabel="Créer l'échéance" onDone={done} onCancel={done} canRecur />}
        {display === "kanban" && <DeadlineKanban deadlines={visible} lines={datedLines} today={today} onChanged={changed} />}
        {display === "gantt" && <DeadlineGantt deadlines={visible} lines={datedLines} today={today} onChanged={changed} />}
        {display === "liste" && (
          <>
          {show.overdue && section("deadlines-overdue", "En retard", overdue, overdueLines, "Rien en retard.")}
          {show.upcoming && section("deadlines-upcoming", "À venir", upcoming, upcomingLines, upcomingEmpty)}
          {show.done && section("deadlines-done", "Faites", finished, [], "Aucune échéance faite.")}
          </>
        )}
        {view === "toutes" && undatedLines.length > 0 && (
          <section aria-labelledby="deadlines-confirm" className="flex flex-col gap-2">
            <h2 id="deadlines-confirm" className="text-lg font-semibold">
              À confirmer <span className="text-sm font-normal text-muted-foreground">({undatedLines.length})</span>
            </h2>
            <p className="text-sm text-muted-foreground">Obligations attendues d&apos;après ton profil, sans date : rien n&apos;est estimé. Saisis l&apos;échéance avec sa source officielle.</p>
            <ul className="flex flex-col gap-2">
              {undatedLines.map((l) => (
                <CalendarLineRow key={l.key} line={l} today={today} />
              ))}
            </ul>
          </section>
        )}
      </div>
    </>
  );
}
