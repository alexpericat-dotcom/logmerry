"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { DeadlineRow } from "@/components/deadline-row";
import { Button } from "@/components/ui/button";
import { UrgencyBadge } from "@/components/urgency-badge";
import type { DeadlineRecord } from "@/lib/db/deadlines";
import { URGENCY_LABELS, URGENCY_STYLES, assignLanes, ganttMarks, ganttScale, monthTicks, type GanttMark } from "@/lib/domain/deadline-boards";
import type { CalendarLine } from "@/lib/domain/deadlines";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

const AXIS_PX = 960; // largeur de l'axe, fixe : les niveaux des jalons sont calculés dessus ; le diagramme défile horizontalement au-delà de l'écran
const LABEL_PX = 220; // place d'un losange et de son intitulé avant le jalon suivant d'une même ligne
const CATEGORY_PX = 144; // colonne des catégories
const LANE_PX = 26;

type Row = { label: string; marks: (GanttMark & { left: number; lane: number })[]; lanes: number };

const px = (percent: number) => (percent / 100) * AXIS_PX;

/**
 * Gantt du calendrier : un jalon (losange) à la date limite sur un axe du temps, une ligne par catégorie. Une échéance n'a qu'une date : aucune barre n'est inventée.
 * Les échéances à faire y figurent, et les faites des 30 derniers jours (grises, barrées, « Faite » ; règle dans `ganttMarks`). Chaque jalon écrit son intitulé, sa date et son
 * état (liste lue par les lecteurs d'écran) ; deux jalons proches se placent sur deux niveaux, sans se recouvrir. Le jalon d'une échéance est un bouton qui ouvre sa fiche
 * (`DeadlineRow`) sous le diagramme ; celui d'une facture est un lien vers les factures.
 */
export function DeadlineGantt({ deadlines, lines, today, onChanged }: { deadlines: DeadlineRecord[]; lines: CalendarLine[]; today: string; onChanged: (message: string, sectionId: string) => void }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const buttons = useRef(new Map<string, HTMLButtonElement>());
  const all = ganttMarks(deadlines, lines, today);
  const groups = new Map<string, GanttMark[]>();
  for (const m of all) groups.set(m.row, [...(groups.get(m.row) ?? []), m]);
  // La fiche suit l'échéance dans `deadlines` (déjà filtrée par la vue) : marquée faite en vue « Toutes », elle reste (« Rouvrir ») même si son jalon sort de la fenêtre des
  // 30 jours ; supprimée, ou sortie de la vue, elle disparaît (le focus va au titre : voir `DeadlineRow`). L'identifiant d'une fiche disparue est oublié.
  const selected = openId ? deadlines.find((d) => d.id === openId) : undefined;
  if (openId && !selected) setOpenId(null);
  const selectedId = selected?.id;
  // À l'ouverture, le focus va au titre de la fiche (sous un diagramme large : sur téléphone, le défilement suit le focus) ; « Fermer » le rend au jalon.
  useEffect(() => {
    if (selectedId) document.getElementById("gantt-record-title")?.focus();
  }, [selectedId]);
  const title = (
    <h2 id="gantt-title" tabIndex={-1} className="text-lg font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring">
      Axe du temps
    </h2>
  );
  if (all.length === 0) {
    return (
      <div className="flex flex-col gap-3">
        {title}
        <p className="text-sm text-muted-foreground">Rien à afficher sur l&apos;axe du temps.</p>
      </div>
    );
  }
  const close = () => {
    const id = openId;
    setOpenId(null);
    if (id) requestAnimationFrame(() => (buttons.current.get(id) ?? document.getElementById("gantt-title"))?.focus());
  };
  const scale = ganttScale(all.map((m) => m.due_on), today);
  const ticks = monthTicks(scale);
  const todayLeft = px(scale.position(today));
  const every = Math.max(1, Math.ceil(ticks.length / 10)); // axe très long : une graduation sur `every`

  const rows: Row[] = [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b, "fr"))
    .map(([label, marks]) => {
      const sorted = [...marks].sort((a, b) => a.due_on.localeCompare(b.due_on) || a.key.localeCompare(b.key));
      const lefts = sorted.map((m) => px(scale.position(m.due_on)));
      const { lanes, count } = assignLanes(lefts, LABEL_PX);
      const placed = sorted.map((m, i) => ({ ...m, left: lefts[i], lane: lanes[i] }));
      return { label, marks: placed, lanes: count };
    });

  return (
    <div className="flex flex-col gap-3">
      {title}
      <p className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        Urgence :
        {(["overdue", "urgent", "week", "later", "done"] as const).map((l) => (
          <UrgencyBadge key={l} level={l} />
        ))}
      </p>
      <div className="overflow-x-auto rounded-lg border bg-card">
        <div className="flex flex-col" style={{ width: CATEGORY_PX + AXIS_PX + LABEL_PX }}>
          <div className="flex border-b">
            <div className="shrink-0 p-2 text-xs font-semibold text-muted-foreground" style={{ width: CATEGORY_PX }}>
              Catégorie
            </div>
            <div className="relative h-8 shrink-0" style={{ width: AXIS_PX + LABEL_PX }} aria-hidden="true">
              {ticks.filter((_, i) => i % every === 0).map((t) => (
                <span key={t.day} className="absolute top-2 -translate-x-1/2 text-xs text-muted-foreground" style={{ left: px(scale.position(t.day)) }}>
                  {t.label}
                </span>
              ))}
            </div>
          </div>
          <ul className="flex flex-col">
            {rows.map((row) => (
              <li key={row.label} className="flex border-b last:border-b-0">
                <div className="shrink-0 p-2 text-sm font-semibold" style={{ width: CATEGORY_PX }}>
                  {row.label}
                </div>
                <div className="relative shrink-0" style={{ width: AXIS_PX + LABEL_PX, height: row.lanes * LANE_PX + 12 }}>
                  <span aria-hidden="true" className="absolute inset-y-0 w-px bg-foreground/60" style={{ left: todayLeft }} />
                  <ul aria-label={`Échéances : ${row.label}`}>
                  {row.marks.map((m) => {
                    const text = (
                      <>
                        <span aria-hidden="true" className={cn("inline-block size-3 shrink-0 rotate-45 rounded-[2px]", URGENCY_STYLES[m.level].fill)} />
                        <span className={cn("truncate text-xs", m.level === "done" && "text-muted-foreground line-through")}>{m.title}</span>
                        <span className="sr-only">
                          , {formatDate(m.due_on)}, {URGENCY_LABELS[m.level]}
                        </span>
                      </>
                    );
                    const cls = "absolute flex items-center gap-1.5";
                    const style = { left: m.left, top: m.lane * LANE_PX + 6, maxWidth: LABEL_PX - 12 };
                    const open = m.kind === "deadline" && m.key === selectedId;
                    return (
                      <li key={m.key} className={cls} style={style} title={`${m.title} · ${formatDate(m.due_on)} · ${URGENCY_LABELS[m.level]}`}>
                        {m.href ? (
                          <Link href={m.href} className="flex min-h-6 items-center gap-1.5 underline-offset-4 hover:underline">
                            {text}
                          </Link>
                        ) : (
                          <button
                            type="button"
                            ref={(el) => {
                              if (el) buttons.current.set(m.key, el);
                              else buttons.current.delete(m.key);
                            }}
                            aria-expanded={open}
                            aria-controls={open ? "gantt-record" : undefined}
                            onClick={() => setOpenId(open ? null : m.key)}
                            className="flex min-h-6 items-center gap-1.5 underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
                          >
                            {text}
                          </button>
                        )}
                      </li>
                    );
                  })}
                  </ul>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">Le trait gris marque aujourd&apos;hui. Clique sur un jalon d&apos;échéance pour ouvrir sa fiche : modifier, cocher ou supprimer.</p>
      {selected && (
        <section id="gantt-record" aria-labelledby="gantt-record-title" className="flex max-w-3xl flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <h3 id="gantt-record-title" tabIndex={-1} className="text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring">
              Fiche de l&apos;échéance
            </h3>
            <Button type="button" size="sm" variant="outline" onClick={close}>
              Fermer<span className="sr-only"> la fiche de l&apos;échéance {selected.title}</span>
            </Button>
          </div>
          <ul className="flex flex-col gap-2">
            <DeadlineRow key={selected.id} deadline={selected} today={today} sectionId="gantt-title" onChanged={onChanged} />
          </ul>
        </section>
      )}
    </div>
  );
}
