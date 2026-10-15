import { Check, Target } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { CLIENT_STATUS_LABELS, type ClientStatus } from "@/lib/domain/clients";

/** Pastille de statut : une icône et un mot (jamais la couleur seule). « Prospect » prend la signature, « Client » le succès. */
export function ClientStatusBadge({ status }: { status: ClientStatus }) {
  const Icon = status === "client" ? Check : Target;
  return (
    <Badge variant={status === "client" ? "success" : "signature"}>
      <Icon size={11} aria-hidden="true" />
      {CLIENT_STATUS_LABELS[status]}
    </Badge>
  );
}
