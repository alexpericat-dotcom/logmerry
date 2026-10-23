import { Suspense } from "react";

import { DeadlinesPanel } from "@/components/deadlines-panel";
import { PageBanner } from "@/components/page-banner";
import { listDeadlines } from "@/lib/db/deadlines";
import { todayParis } from "@/lib/format";

export const metadata = { title: "Calendrier · LogMerry" };

async function Deadlines() {
  const deadlines = await listDeadlines();
  const today = todayParis(); // après les données dynamiques : Next.js refuse de lire l'horloge avant (prérendu)
  return <DeadlinesPanel deadlines={deadlines} today={today} />;
}

export default function CalendrierPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageBanner title="Calendrier" description="Tes obligations administratives, chacune avec sa date et son lien officiel. Ce n'est pas un agenda : pas de rendez-vous, seulement ce que tu dois faire avant une date." />
      <Suspense fallback={<p className="text-muted-foreground">Chargement…</p>}>
        <Deadlines />
      </Suspense>
    </div>
  );
}
