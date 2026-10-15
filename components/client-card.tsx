import { Building2 } from "lucide-react";
import Link from "next/link";

import { ClientStatusBadge } from "@/components/client-status";
import { Button } from "@/components/ui/button";
import type { ClientRecord } from "@/lib/db/clients";
import { CLIENT_ORIGIN_LABELS } from "@/lib/domain/clients";
import { formatDateTime } from "@/lib/format";

/**
 * Carte « fiche » : l'entreprise ou la personne suivie, en grand, avec une tuile d'icône et le dégradé discret.
 * Les contacts qui la suivent sont des cartes plus petites, à avatar rond : on voit tout de suite qui est la fiche et qui sont ses contacts.
 */
export function ClientCard({ client }: { client: ClientRecord }) {
  return (
    <section
      aria-labelledby="fiche-title"
      className="flex flex-col gap-4 rounded-lg border-2 border-filet bg-gradient-subtle p-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-4">
          <div
            className="flex size-14 shrink-0 items-center justify-center rounded-lg bg-accent text-foreground"
            aria-hidden="true"
          >
            <Building2 className="size-7" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Fiche
            </p>
            <h2 id="fiche-title" className="break-words text-2xl font-bold">
              {client.name}
            </h2>
          </div>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href={`/clients/${client.id}/modifier`}>
            Modifier<span className="sr-only"> la fiche {client.name}</span>
          </Link>
        </Button>
      </div>
      <dl className="grid gap-x-8 gap-y-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex flex-col gap-1">
          <dt className="text-xs text-muted-foreground">Statut</dt>
          <dd>
            <ClientStatusBadge status={client.status} />
          </dd>
        </div>
        <div className="flex flex-col gap-1">
          <dt className="text-xs text-muted-foreground">Origine</dt>
          <dd className="font-medium">{CLIENT_ORIGIN_LABELS[client.origin]}</dd>
        </div>
        <div className="flex flex-col gap-1">
          <dt className="text-xs text-muted-foreground">Créée le</dt>
          <dd className="font-mono text-xs tabular-nums">
            {formatDateTime(client.created_at)}
          </dd>
        </div>
        <div className="flex flex-col gap-1">
          <dt className="text-xs text-muted-foreground">
            Dernière modification
          </dt>
          <dd className="font-mono text-xs tabular-nums">
            {formatDateTime(client.updated_at)}
          </dd>
        </div>
      </dl>
    </section>
  );
}
