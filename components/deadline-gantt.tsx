import Link from "next/link";

import { UrgencyBadge } from "@/components/urgency-badge";
import type { DeadlineRecord } from "@/lib/db/deadlines";
import { URGENCY_LABELS, URGENCY_STYLES, assignLanes, ganttScale, monthTicks, urgency, type Urgency } from "@/lib/domain/deadline-boards";
import { DEADLINE_CATEGORY_LABELS, type CalendarLine } from "@/lib/domain/deadlines";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

const AXIS_PX = 960; // largeur de l'axe, fixe : les niveaux des jalons sont calculés dessus ; le diagramme défile horizontalement au-delà de l'écran
const LABEL_PX = 220; // place d'un losange et de son intitulé avant le jalon suivant d'une même ligne
const CATEGORY_PX = 144; // colonne des catégories
const LANE_PX = 26;

type Mark = { key: string; title: string; due_on: string; level: Urgency; href?: string };
type Row = { label: string; marks: (Mark & { left: number; lane: number })[]; lanes: number };

const px = (percent: number) => (percent / 100) * AXIS_PX;

/**
 * Gantt du calendrier : un jalon (losange) à la date limite sur un axe du temps, une ligne par catégorie. Une échéance n'a qu'une date : aucune barre n'est inventée.
 * Seules les échéances à faire y figurent (une échéance faite n'a plus d'urgence : elle est dans la liste et le kanban). Chaque jalon écrit son intitulé, sa date et son urgence
 * (liste lue par les lecteurs d'écran) ; deux jalons proches se placent sur deux niveaux, sans se recouvrir.
 */
export function DeadlineGantt({ deadlines, lines, today }: { deadlines: DeadlineRecord[]; lines: CalendarLine[]; today: string }) {
  const groups = new Map<string, Mark[]>();
  const add = (row: string, m: Mark) => groups.set(row, [...(groups.get(row) ?? []), m]);
  for (const d of deadlines.filter((x) => x.done_at === null)) add(DEADLINE_CATEGORY_LABELS[d.category], { key: d.id, title: d.title, due_on: d.due_on, level: urgency(d.due_on, d.done_at !== null, today) });
  for (const l of lines) if (l.due_on) add("Factures", { key: l.key, title: l.title, due_on: l.due_on, level: urgency(l.due_on, false, today), href: l.href });

  const all = [...groups.values()].flat();
  if (all.length === 0) return <p className="text-sm text-muted-foreground">Rien à afficher sur l&apos;axe du temps.</p>;
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
                    return (
                      <li key={m.key} className={cls} style={style} title={`${m.title} · ${formatDate(m.due_on)} · ${URGENCY_LABELS[m.level]}`}>
                        {m.href ? (
                          <Link href={m.href} className="flex min-h-6 items-center gap-1.5 underline-offset-4 hover:underline">
                            {text}
                          </Link>
                        ) : (
                          text
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
      <p className="text-xs text-muted-foreground">Le trait gris marque aujourd&apos;hui. Pour modifier, cocher ou supprimer une échéance, passe en Liste ou en Kanban.</p>
    </div>
  );
}
