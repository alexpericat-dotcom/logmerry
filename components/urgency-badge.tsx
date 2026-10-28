import { CalendarCheck, CalendarClock, CircleDashed, TriangleAlert, Timer } from "lucide-react";

import { URGENCY_LABELS, URGENCY_STYLES, type Urgency } from "@/lib/domain/deadline-boards";
import { cn } from "@/lib/utils";

const ICONS = { overdue: TriangleAlert, urgent: Timer, week: CalendarClock, later: CircleDashed, done: CalendarCheck } as const;

/** Pastille d'urgence : couleur du niveau (jetons) ET son libellé écrit ; la couleur ne porte jamais seule l'information. */
export function UrgencyBadge({ level, className }: { level: Urgency; className?: string }) {
  const Icon = ICONS[level];
  return (
    <span className={cn("inline-flex items-center gap-1 whitespace-nowrap rounded-sm px-2 text-[11px] font-semibold leading-5 dark:rounded-full", URGENCY_STYLES[level].pill, className)}>
      <Icon size={11} aria-hidden="true" />
      {URGENCY_LABELS[level]}
    </span>
  );
}
