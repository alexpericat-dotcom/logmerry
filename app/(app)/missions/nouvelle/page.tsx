import { Suspense } from "react";

import { createMission } from "@/app/(app)/missions/actions";
import { MissionForm } from "@/components/mission-form";
import { PageBanner } from "@/components/page-banner";
import { listAllClients } from "@/lib/db/clients";
import { isUuid } from "@/lib/domain/notes";

export const metadata = { title: "Nouvelle mission · LogMerry" };

type SearchParams = Promise<{ client?: string | string[] }>;

async function NewMission({ searchParams }: { searchParams: SearchParams }) {
  const clients = await listAllClients();
  const raw = (await searchParams).client;
  const wanted = Array.isArray(raw) ? raw[0] : raw;
  // Depuis une fiche, le client est déjà choisi ; un identifiant inconnu est ignoré.
  const client_id = wanted && isUuid(wanted) && clients.some((c) => c.id === wanted) ? wanted : "";
  return (
    <MissionForm
      action={createMission}
      clients={clients}
      initial={{ client_id, title: "", status: "in_progress", start_date: "", end_date: "" }}
      submitLabel="Enregistrer la mission"
      cancelHref={client_id ? `/clients/${client_id}` : "/missions"}
    />
  );
}

export default function NouvelleMissionPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <div className="flex flex-col gap-6">
      <PageBanner title="Nouvelle mission" />
      <Suspense fallback={<p className="text-muted-foreground">Chargement…</p>}>
        <NewMission searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
