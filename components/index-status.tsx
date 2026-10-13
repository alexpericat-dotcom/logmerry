import { Badge } from "@/components/ui/badge";

const LABELS = {
  indexed: "Indexée",
  pending: "En attente d'indexation",
  failed: "Échec d'indexation",
} as const;

/** Pastille de l'état d'indexation d'une note (le texte porte l'information, pas seulement la couleur). */
export function IndexStatus({ status }: { status: keyof typeof LABELS }) {
  return <Badge variant={status === "failed" ? "destructive" : "outline"}>{LABELS[status]}</Badge>;
}
