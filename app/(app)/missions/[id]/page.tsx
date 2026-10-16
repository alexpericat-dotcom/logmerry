import { Briefcase } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { Backlog } from "@/components/backlog";
import { MissionStatusBadge } from "@/components/mission-status";
import { PageBanner } from "@/components/page-banner";
import { Unset } from "@/components/unset";
import { Button } from "@/components/ui/button";
import { getMission } from "@/lib/db/missions";
import { listNotesForClient } from "@/lib/db/notes";
import { listTasks } from "@/lib/db/tasks";
import { listStories } from "@/lib/db/user-stories";
import { isUuid } from "@/lib/domain/notes";
import { formatDate, formatDateTime } from "@/lib/format";

export const metadata = { title: "Mission · LogMerry" };

const dash = <Unset />;

async function MissionView({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const mission = await getMission(id);
  if (!mission) notFound();
  const [stories, notes] = await Promise.all([listStories(id), listNotesForClient(mission.client_id)]);
  const tasks = await listTasks(stories.map((s) => s.id));

  return (
    <div className="flex flex-col gap-6">
      <PageBanner title="Mission" />
      <section aria-labelledby="mission-title" className="flex flex-col gap-4 rounded-lg border bg-gradient-subtle p-5 shadow-hard max-md:p-4 dark:border-2 dark:border-filet dark:shadow-none">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-accent text-foreground md:size-14" aria-hidden="true">
              <Briefcase className="size-5 md:size-7" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Mission</p>
              <h2 id="mission-title" className="break-words text-xl font-bold md:text-2xl">
                {mission.title}
              </h2>
            </div>
          </div>
          <Button asChild variant="outline" size="sm" className="max-md:w-full">
            <Link href={`/missions/${id}/modifier`}>
              Modifier<span className="sr-only"> la mission {mission.title}</span>
            </Link>
          </Button>
        </div>
        <dl className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm max-md:gap-x-4 lg:grid-cols-4">
          <div className="flex flex-col gap-1">
            <dt className="text-xs text-muted-foreground">Client</dt>
            <dd className="font-medium">
              {mission.client ? (
                <Link href={`/clients/${mission.client_id}`} className="text-primary underline underline-offset-4 max-md:inline-flex max-md:min-h-11 max-md:items-center">
                  {mission.client.name}
                </Link>
              ) : (
                dash
              )}
            </dd>
          </div>
          <div className="flex flex-col gap-1">
            <dt className="text-xs text-muted-foreground">Statut</dt>
            <dd>
              <MissionStatusBadge status={mission.status} />
            </dd>
          </div>
          <div className="flex flex-col gap-1">
            <dt className="text-xs text-muted-foreground">Début</dt>
            <dd className="font-mono text-xs tabular-nums">{mission.start_date ? formatDate(mission.start_date) : dash}</dd>
          </div>
          <div className="flex flex-col gap-1">
            <dt className="text-xs text-muted-foreground">Fin</dt>
            <dd className="font-mono text-xs tabular-nums">{mission.end_date ? formatDate(mission.end_date) : dash}</dd>
          </div>
          <div className="flex flex-col gap-1">
            <dt className="text-xs text-muted-foreground">Créée le</dt>
            <dd className="font-mono text-xs tabular-nums">{formatDateTime(mission.created_at)}</dd>
          </div>
        </dl>
      </section>
      <Backlog missionId={id} stories={stories} tasks={tasks} notes={notes.filter((n) => n.status === "active").map((n) => ({ id: n.id, title: n.title, created_at: n.created_at }))} />
    </div>
  );
}

export default function MissionPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<p className="text-muted-foreground">Chargement…</p>}>
      <MissionView params={params} />
    </Suspense>
  );
}
