import Link from "next/link";
import { Suspense } from "react";

import { ClientStatusBadge } from "@/components/client-status";
import { DataTable, type Column } from "@/components/data-table";
import { FilterChips } from "@/components/filter-chips";
import { PageBanner } from "@/components/page-banner";
import { Button } from "@/components/ui/button";
import { listAllClients, type ClientRecord } from "@/lib/db/clients";
import {
  CLIENT_ORIGINS,
  CLIENT_ORIGIN_LABELS,
  CLIENT_STATUSES,
  CLIENT_STATUS_FILTER_LABELS,
  clientsHref,
  countLabel,
  nextDir,
  parseClientView,
  viewClients,
  type ClientSortKey,
} from "@/lib/domain/clients";
import { formatDateTime } from "@/lib/format";

export const metadata = { title: "Clients · LogMerry" };

type SearchParams = Promise<{ statut?: string | string[]; origine?: string | string[]; tri?: string | string[]; ordre?: string | string[] }>;

async function ClientsList({ searchParams }: { searchParams: SearchParams }) {
  const view = parseClientView(await searchParams);
  const { rows, total } = viewClients(await listAllClients(), view);

  const createButton = (
    <Button asChild size="sm" className="shrink-0">
      <Link href="/clients/nouvelle">Créer une fiche</Link>
    </Button>
  );

  if (total === 0) {
    return (
      <>
        <PageBanner
          title="Clients"
          className="self-stretch"
          description="Tu n'as pas encore de fiche. Une fiche, c'est un prospect ou un client : un nom et d'où il vient, pour savoir à qui tu as affaire."
        />
        {createButton}
      </>
    );
  }

  const sortHref = (key: ClientSortKey) => clientsHref({ ...view, tri: key, ordre: nextDir(view, key) });
  const columns: Column<ClientRecord>[] = [
    {
      key: "nom",
      label: "Nom",
      sortHref: sortHref("nom"),
      render: (c) => (
        <Link href={`/clients/${c.id}`} className="font-semibold underline-offset-4 after:absolute after:inset-0 hover:underline">
          {c.name}
        </Link>
      ),
    },
    { key: "statut", label: "Statut", sortHref: sortHref("statut"), render: (c) => <ClientStatusBadge status={c.status} /> },
    { key: "origine", label: "Origine", sortHref: sortHref("origine"), render: (c) => CLIENT_ORIGIN_LABELS[c.origin] },
    { key: "creee", label: "Créée le", sortHref: sortHref("creee"), align: "right", render: (c) => formatDateTime(c.created_at) },
  ];

  return (
    <>
      <PageBanner title="Clients" className="self-stretch" />
      <div className="flex w-full flex-wrap items-start justify-between gap-x-3 gap-y-2">
        <div className="flex flex-col gap-2">
          <FilterChips
            label="Filtrer par statut"
            items={[
              { label: "Tous", href: clientsHref({ ...view, statut: null }), active: view.statut === null },
              ...CLIENT_STATUSES.map((s) => ({ label: CLIENT_STATUS_FILTER_LABELS[s], href: clientsHref({ ...view, statut: s }), active: view.statut === s })),
            ]}
          />
          <FilterChips
            label="Filtrer par origine"
            items={[
              { label: "Toutes origines", href: clientsHref({ ...view, origine: null }), active: view.origine === null },
              ...CLIENT_ORIGINS.map((o) => ({ label: CLIENT_ORIGIN_LABELS[o], href: clientsHref({ ...view, origine: o }), active: view.origine === o })),
            ]}
          />
        </div>
        {createButton}
      </div>
      <p role="status" className="text-sm text-muted-foreground">
        {countLabel(rows.length, total)}
      </p>
      {rows.length === 0 ? (
        <p className="text-muted-foreground">Aucune fiche ne correspond à ces filtres.</p>
      ) : (
        <DataTable caption="Mes prospects et clients" columns={columns} rows={rows} rowKey={(c) => c.id} sorted={{ key: view.tri, dir: view.ordre }} />
      )}
    </>
  );
}

export default function ClientsPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <div className="flex flex-col items-start gap-6">
      <Suspense
        fallback={
          <>
            <PageBanner title="Clients" className="self-stretch" />
            <p className="text-muted-foreground">Chargement…</p>
          </>
        }
      >
        <ClientsList searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
