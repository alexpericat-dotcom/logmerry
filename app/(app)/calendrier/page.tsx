import { Suspense } from "react";

import { CALENDAR_DESCRIPTION, DeadlinesPanel } from "@/components/deadlines-panel";
import { PageBanner } from "@/components/page-banner";
import { completeDeadlineSeries, listDeadlines } from "@/lib/db/deadlines";
import { listInvoices } from "@/lib/db/invoices";
import { getProfile } from "@/lib/db/profile";
import { calendarInvoiceInputs } from "@/lib/domain/calendar-panel";
import { parseDisplay } from "@/lib/domain/deadline-boards";
import { invoiceLines, parseDeadlineView, toConfirmLines } from "@/lib/domain/deadlines";
import { todayParis } from "@/lib/format";

export const metadata = { title: "Calendrier · LogMerry" };

type SearchParams = Promise<{ vue?: string | string[]; affichage?: string | string[] }>;

async function Deadlines({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const view = parseDeadlineView(params.vue);
  const display = parseDisplay(params.affichage);
  const [first, invoices, profile] = await Promise.all([listDeadlines(), listInvoices(), getProfile()]);
  const today = todayParis(); // après les données dynamiques : Next.js refuse de lire l'horloge avant (prérendu)
  // Les séries se complètent à la lecture (12 mois) ; on relit seulement si des lignes viennent d'être créées.
  const deadlines = (await completeDeadlineSeries(first, today)) > 0 ? await listDeadlines() : first;
  const lines = [
    ...invoiceLines(calendarInvoiceInputs(invoices), today),
    ...toConfirmLines(profile, deadlines),
  ];
  return <DeadlinesPanel deadlines={deadlines} lines={lines} view={view} display={display} today={today} />;
}

export default function CalendrierPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <div className="flex flex-col gap-6">
      <Suspense fallback={<PageBanner title="Calendrier" className="self-stretch" description={CALENDAR_DESCRIPTION} />}>
        <Deadlines searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
