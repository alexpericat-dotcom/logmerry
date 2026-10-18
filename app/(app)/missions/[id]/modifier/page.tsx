import { notFound } from "next/navigation";
import { Suspense } from "react";

import { updateMission } from "@/app/(app)/missions/actions";
import { DeleteMission } from "@/components/delete-mission";
import { MissionForm } from "@/components/mission-form";
import { PageBanner } from "@/components/page-banner";
import { getMission } from "@/lib/db/missions";
import { countQuotesForMission } from "@/lib/db/quotes";
import { storyProgressByMission } from "@/lib/db/user-stories";
import { isUuid } from "@/lib/domain/notes";
import { MISSION_QUOTE_REFUSAL } from "@/lib/domain/quotes";

export const metadata = { title: "Modifier la mission · LogMerry" };

async function EditMission({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const mission = await getMission(id);
  if (!mission) notFound();
  const [progress, quoteCount] = await Promise.all([storyProgressByMission([id]), countQuotesForMission(id)]);
  const storyCount = progress[id]?.total ?? 0;

  return (
    <div className="flex flex-col gap-6">
      <PageBanner title="Modifier la mission" />
      <MissionForm
        key={`${mission.updated_at}`}
        action={updateMission.bind(null, id)}
        initial={{ client_id: mission.client_id, title: mission.title, status: mission.status, start_date: mission.start_date ?? "", end_date: mission.end_date ?? "" }}
        fixedClient={{ id: mission.client_id, name: mission.client?.name ?? "" }}
        submitLabel="Enregistrer les modifications"
        cancelHref={`/missions/${id}`}
      />
      {quoteCount > 0 ? (
        <p role="note" className="max-w-2xl rounded-md border p-3 text-sm text-muted-foreground">
          {MISSION_QUOTE_REFUSAL}
        </p>
      ) : (
        <DeleteMission id={id} storyCount={storyCount} />
      )}
    </div>
  );
}

export default function EditMissionPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<p className="text-muted-foreground">Chargement…</p>}>
      <EditMission params={params} />
    </Suspense>
  );
}
