import { notFound } from "next/navigation";
import { Suspense } from "react";

import { ClientCard } from "@/components/client-card";
import { ContactsSection } from "@/components/contacts-section";
import { PageBanner } from "@/components/page-banner";
import { PromoteClient } from "@/components/promote-client";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { MissionStatusBadge } from "@/components/mission-status";
import { Button } from "@/components/ui/button";
import { listMissionsForClient } from "@/lib/db/missions";
import { storyProgressByMission } from "@/lib/db/user-stories";
import { progressLabel } from "@/lib/domain/user-stories";
import { listNotesForClient } from "@/lib/db/notes";
import { NOTE_TYPE_LABELS } from "@/lib/domain/notes";
import { formatDate, formatDateTime } from "@/lib/format";
import { getClientRecord } from "@/lib/db/clients";
import { listContacts } from "@/lib/db/contacts";
import { isUuid } from "@/lib/domain/notes";

export const metadata = { title: "Fiche · LogMerry" };

async function ClientView({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const client = await getClientRecord(id);
  if (!client) notFound();
  const [contacts, notes, missions] = await Promise.all([listContacts(id), listNotesForClient(id), listMissionsForClient(id)]);
  const progress = await storyProgressByMission(missions.map((m) => m.id)); // seulement les missions de cette fiche

  return (
    <div className="flex flex-col gap-6">
      <PageBanner title={client.status === "client" ? "Fiche client" : "Fiche prospect"} actions={client.status === "prospect" ? <PromoteClient id={id} /> : undefined} />
      <ClientCard client={client} />
      <ContactsSection clientId={id} clientName={client.name} contacts={contacts} />
      <section aria-labelledby="missions-title" className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="missions-title" className="text-lg font-semibold">
            Missions
          </h2>
          <Button asChild variant="outline" size="sm">
            <Link href={`/missions/nouvelle?client=${id}`}>Créer une mission</Link>
          </Button>
        </div>
        {missions.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune mission pour cette fiche. Une mission, c&apos;est un travail que tu fais pour elle.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {missions.map((m) => (
              <li key={m.id} className="flex flex-wrap items-center gap-2 rounded-md border bg-card p-3">
                <Link href={`/missions/${m.id}`} className="min-w-0 break-words font-semibold underline-offset-4 hover:underline max-md:inline-block max-md:min-h-11 max-md:py-2.5">
                  {m.title}
                </Link>
                <MissionStatusBadge status={m.status} />
                <span className="text-xs text-muted-foreground">{progressLabel(progress[m.id] ?? { done: 0, total: 0 })}</span>
                {(m.start_date || m.end_date) && (
                  <span className="ml-auto font-mono text-xs tabular-nums text-muted-foreground">
                    {m.start_date ? formatDate(m.start_date) : "…"} → {m.end_date ? formatDate(m.end_date) : "…"}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
      <section aria-labelledby="notes-title" className="flex flex-col gap-3">
        <h2 id="notes-title" className="text-lg font-semibold">
          Notes
        </h2>
        {notes.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Aucune note liée. Lie une note à cette fiche depuis son éditeur (champ « Lié à »).
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {notes.map((n) => (
              <li key={n.id} className="flex flex-wrap items-center gap-2 rounded-md border bg-card p-3">
                <Link href={`/notes/${n.id}`} className="min-w-0 break-words font-semibold underline-offset-4 hover:underline">
                  {n.title}
                </Link>
                <Badge variant="secondary">{NOTE_TYPE_LABELS[n.type]}</Badge>
                {n.status === "draft" && <Badge variant="outline">Brouillon</Badge>}
                <time dateTime={n.created_at} className="ml-auto text-xs font-mono tabular-nums text-muted-foreground">
                  {formatDateTime(n.created_at)}
                </time>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

export default function ClientPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<p className="text-muted-foreground">Chargement…</p>}>
      <ClientView params={params} />
    </Suspense>
  );
}
