import { CalendarClock, Check, CircleDot, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { MISSION_STATUS_LABELS, type MissionStatus } from "@/lib/domain/missions";

const STATUS_STYLE = {
  planned: { icon: CalendarClock, variant: "outline" },
  in_progress: { icon: CircleDot, variant: "secondary" },
  done: { icon: Check, variant: "success" },
  cancelled: { icon: X, variant: "outline" },
} as const;

/** Pastille de statut : une icône et un mot (jamais la couleur seule). « En cours » reste neutre : la signature est réservée au prospect. */
export function MissionStatusBadge({ status }: { status: MissionStatus }) {
  const { icon: Icon, variant } = STATUS_STYLE[status];
  return (
    <Badge variant={variant}>
      <Icon size={11} aria-hidden="true" />
      {MISSION_STATUS_LABELS[status]}
    </Badge>
  );
}
