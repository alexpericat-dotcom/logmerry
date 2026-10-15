import { notFound } from "next/navigation";
import { Suspense } from "react";

import { updateClientRecord } from "@/app/(app)/clients/actions";
import { ClientForm } from "@/components/client-form";
import { DeleteClient } from "@/components/delete-client";
import { PageBanner } from "@/components/page-banner";
import { getClientRecord } from "@/lib/db/clients";
import { countMissionsForClient } from "@/lib/db/missions";
import { listNotesForClient } from "@/lib/db/notes";
import { isUuid } from "@/lib/domain/notes";

export const metadata = { title: "Modifier la fiche · LogMerry" };

async function EditClient({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const client = await getClientRecord(id);
  if (!client) notFound();
  const [noteCount, missionCount] = [(await listNotesForClient(id)).length, await countMissionsForClient(id)];

  return (
    <div className="flex flex-col gap-6">
      <PageBanner title="Modifier la fiche" />
      <ClientForm
        key={`${client.status}-${client.updated_at}`}
        action={updateClientRecord.bind(null, id)}
        initial={{ name: client.name, status: client.status, origin: client.origin }}
        submitLabel="Enregistrer les modifications"
        cancelHref={`/clients/${id}`}
      />
      <DeleteClient id={id} noteCount={noteCount} missionCount={missionCount} />
    </div>
  );
}

export default function EditClientPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<p className="text-muted-foreground">Chargement…</p>}>
      <EditClient params={params} />
    </Suspense>
  );
}
