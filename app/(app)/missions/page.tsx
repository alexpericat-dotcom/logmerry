import Link from "next/link";
import { Suspense } from "react";

import { DataTable, type Column } from "@/components/data-table";
import { FilterChips } from "@/components/filter-chips";
import { MissionStatusBadge } from "@/components/mission-status";
import { PageBanner } from "@/components/page-banner";
import { Unset } from "@/components/unset";
import { Button } from "@/components/ui/button";
import { listAllMissions, type MissionRecord } from "@/lib/db/missions";
import {
  MISSION_STATUSES,
  MISSION_STATUS_FILTER_LABELS,
  countLabel,
  missionsHref,
  nextDir,
  parseMissionView,
  viewMissions,
  type MissionSortKey,
} from "@/lib/domain/missions";
import { formatDate } from "@/lib/format";

export const metadata = { title: "Missions · LogMerry" };

type SearchParams = Promise<{ statut?: string | string[]; tri?: string | string[]; ordre?: string | string[] }>;

const dash = <Unset />;

async function MissionsList({ searchParams }: { searchParams: SearchParams }) {
  const view = parseMissionView(await searchParams);
  const { rows, total } = viewMissions(await listAllMissions(), view);

  const createButton = (
    <Button asChild size="lg" className="shrink-0">
      <Link href="/missions/nouvelle">Créer une mission</Link>
    </Button>
  );

  if (total === 0) {
    return (
      <PageBanner
        title="Missions"
        className="self-stretch"
        actions={createButton}
        description="Tu n'as pas encore de mission. Une mission, c'est un travail que tu fais pour un client : un titre, un statut et des dates."
      />
    );
  }

  const sortHref = (key: MissionSortKey) => missionsHref({ ...view, tri: key, ordre: nextDir(view, key) });
  const columns: Column<MissionRecord>[] = [
    {
      key: "titre",
      label: "Mission",
      sortHref: sortHref("titre"),
      render: (m) => (
        <Link href={`/missions/${m.id}`} className="font-semibold underline-offset-4 after:absolute after:inset-0 hover:underline">
          {m.title}
        </Link>
      ),
    },
    { key: "client", label: "Client", sortHref: sortHref("client"), render: (m) => m.client?.name ?? dash },
    { key: "statut", label: "Statut", sortHref: sortHref("statut"), render: (m) => <MissionStatusBadge status={m.status} /> },
    { key: "debut", label: "Début", sortHref: sortHref("debut"), align: "right", hideOnMobile: true, render: (m) => (m.start_date ? formatDate(m.start_date) : dash) },
    { key: "fin", label: "Fin", sortHref: sortHref("fin"), align: "right", hideOnMobile: true, render: (m) => (m.end_date ? formatDate(m.end_date) : dash) },
  ];

  return (
    <>
      <PageBanner title="Missions" className="self-stretch" actions={createButton}>
        <FilterChips
          label="Filtrer par statut"
          items={[
            { label: "Toutes", href: missionsHref({ ...view, statut: null }), active: view.statut === null },
            ...MISSION_STATUSES.map((s) => ({ label: MISSION_STATUS_FILTER_LABELS[s], href: missionsHref({ ...view, statut: s }), active: view.statut === s })),
          ]}
        />
      </PageBanner>
      <p role="status" className="text-sm text-muted-foreground">
        {countLabel(rows.length, total)}
      </p>
      {rows.length === 0 ? (
        <p className="text-muted-foreground">Aucune mission ne correspond à ce filtre.</p>
      ) : (
        <DataTable caption="Mes missions" columns={columns} rows={rows} rowKey={(m) => m.id} sorted={{ key: view.tri, dir: view.ordre }} />
      )}
    </>
  );
}

export default function MissionsPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <div className="flex flex-col items-start gap-6">
      <Suspense
        fallback={
          <>
            <PageBanner title="Missions" className="self-stretch" />
            <p className="text-muted-foreground">Chargement…</p>
          </>
        }
      >
        <MissionsList searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
