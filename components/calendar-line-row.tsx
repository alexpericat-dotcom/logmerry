import { BellRing, CircleHelp, FileText } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import type { CalendarLine } from "@/lib/domain/deadlines";
import { formatDate } from "@/lib/format";

const KIND = {
  invoice_issue: { label: "Facture à émettre", Icon: FileText, link: "Ouvrir les factures" },
  invoice_chase: { label: "Facture à relancer", Icon: BellRing, link: "Ouvrir les factures" },
  to_confirm: { label: "À confirmer", Icon: CircleHelp, link: "Ouvrir" },
} as const;

/** Ligne calculée du calendrier (lecture seule : ni échéance stockée, ni case à cocher). Sans date pour « À confirmer » : jamais estimée. */
export function CalendarLineRow({ line }: { line: CalendarLine }) {
  const { label, Icon, link } = KIND[line.kind];
  return (
    <li className="flex flex-col gap-2 rounded-md border border-dashed bg-card p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-semibold">{line.title}</span>
        <Badge variant={line.kind === "to_confirm" ? "warning" : "outline"}>
          <Icon size={11} aria-hidden="true" />
          {label}
        </Badge>
      </div>
      <p className="text-sm text-muted-foreground">
        {line.due_on ? (
          <>
            Échéance le <span className="font-mono tabular-nums">{formatDate(line.due_on)}</span> · <strong className="text-foreground">{line.detail}</strong>
          </>
        ) : (
          <>
            <strong className="text-foreground">Sans date.</strong> {line.detail}
          </>
        )}
      </p>
      {line.href !== "/calendrier" && (
        <Link href={line.href} className="inline-flex items-center self-start text-sm underline underline-offset-4 max-md:min-h-11">
          {link}
          <span className="sr-only"> : {line.title}</span>
        </Link>
      )}
    </li>
  );
}
