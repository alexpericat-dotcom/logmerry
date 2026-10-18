import { CircleCheck, CircleDashed, FlaskConical, TriangleAlert } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { RULE_STATUS_LABELS, type RuleDisplayState } from "@/lib/domain/finance/rules";

const BADGE = {
  a_verifier: { icon: CircleDashed, variant: "outline" },
  verifiee: { icon: CircleCheck, variant: "success" },
  perimee: { icon: TriangleAlert, variant: "warning" },
  essai: { icon: FlaskConical, variant: "secondary" },
} as const;

/** Statut d'une règle : une icône et un mot (jamais la couleur seule) ; « DEMO, non officielle » pour une règle d'essai. */
export function RuleStatusBadge({ state }: { state: RuleDisplayState }) {
  const { icon: Icon, variant } = BADGE[state];
  return (
    <Badge variant={variant}>
      <Icon size={11} aria-hidden="true" />
      {RULE_STATUS_LABELS[state]}
    </Badge>
  );
}
