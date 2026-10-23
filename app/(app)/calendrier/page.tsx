import { Suspense } from "react";

import { DeadlinesPanel } from "@/components/deadlines-panel";
import { PageBanner } from "@/components/page-banner";
import { completeDeadlineSeries, listDeadlines } from "@/lib/db/deadlines";
import { listInvoices } from "@/lib/db/invoices";
import { getProfile } from "@/lib/db/profile";
import { invoiceLines, parseDeadlineView, toConfirmLines } from "@/lib/domain/deadlines";
import { invoiceBalance } from "@/lib/domain/payments";
import { todayParis } from "@/lib/format";

export const metadata = { title: "Calendrier · LogMerry" };

type SearchParams = Promise<{ vue?: string | string[] }>;

async function Deadlines({ searchParams }: { searchParams: SearchParams }) {
  const view = parseDeadlineView((await searchParams).vue);
  const [first, invoices, profile] = await Promise.all([listDeadlines(), listInvoices(), getProfile()]);
  const today = todayParis(); // après les données dynamiques : Next.js refuse de lire l'horloge avant (prérendu)
  // Les séries se complètent à la lecture (12 mois) ; on relit seulement si des lignes viennent d'être créées.
  const deadlines = (await completeDeadlineSeries(first, today)) > 0 ? await listDeadlines() : first;
  const lines = [
    ...invoiceLines(
      invoices.map((i) => ({ id: i.id, reference: i.reference, issued_on: i.issued_on, due_on: i.due_on, status: invoiceBalance(i, i.payments).status, mission: i.mission })),
      today,
    ),
    ...toConfirmLines(profile, deadlines),
  ];
  return <DeadlinesPanel deadlines={deadlines} lines={lines} view={view} today={today} />;
}

export default function CalendrierPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <div className="flex flex-col gap-6">
      <PageBanner title="Calendrier" description="Tes obligations administratives, chacune avec sa date et son lien officiel. Ce n'est pas un agenda : pas de rendez-vous, seulement ce que tu dois faire avant une date." />
      <Suspense fallback={<p className="text-muted-foreground">Chargement…</p>}>
        <Deadlines searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
