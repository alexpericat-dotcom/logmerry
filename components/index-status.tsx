import { AlertTriangle, Check, Clock, type LucideIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";

const STATES = {
  indexed: { label: "Indexée", Icon: Check, variant: "success" },
  pending: { label: "En attente d'indexation", Icon: Clock, variant: "warning" },
  failed: { label: "Échec d'indexation", Icon: AlertTriangle, variant: "destructive" },
} as const satisfies Record<string, { label: string; Icon: LucideIcon; variant: "success" | "warning" | "destructive" }>;

/** Pastille de l'état d'indexation d'une note : une icône et un texte (jamais la couleur seule, DESIGN.md). */
export function IndexStatus({ status }: { status: keyof typeof STATES }) {
  const { label, Icon, variant } = STATES[status];
  return (
    <Badge variant={variant}>
      <Icon size={11} aria-hidden="true" />
      {label}
    </Badge>
  );
}
