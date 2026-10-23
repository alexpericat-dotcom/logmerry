import { Suspense } from "react";

import { PageBanner } from "@/components/page-banner";
import { TodayTasks } from "@/components/today-tasks";
import { listDeadlines } from "@/lib/db/deadlines";
import { listInvoices } from "@/lib/db/invoices";
import { listInvoiceTaskChecks } from "@/lib/db/task-checks";
import { todayTasks } from "@/lib/domain/cockpit/today";
import { invoiceBalance } from "@/lib/domain/payments";
import { todayParis } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Aujourd'hui · LogMerry" };

const EMPTY = "Rien à faire pour aujourd'hui. Tes tâches apparaîtront ici dès que tu auras saisi tes échéances, tes factures et tes devis.";

async function Tasks() {
  const [deadlines, invoices] = await Promise.all([listDeadlines(), listInvoices()]);
  const today = todayParis(); // après les données dynamiques : Next.js refuse de lire l'horloge avant (prérendu)
  const checked = await listInvoiceTaskChecks(await createClient(), today);
  const tasks = todayTasks(
    deadlines,
    invoices.map((i) => ({ id: i.id, reference: i.reference, due_on: i.due_on, status: invoiceBalance(i, i.payments).status, mission: i.mission })),
    checked,
    today,
  );
  return (
    <>
      <PageBanner hero title="Aujourd'hui" description={tasks.length ? "Ce qui demande ton attention, dans l'ordre." : EMPTY} />
      {tasks.length > 0 && <TodayTasks tasks={tasks} />}
    </>
  );
}

export default function AujourdhuiPage() {
  return (
    <div className="flex flex-col gap-6">
      <Suspense fallback={<PageBanner hero title="Aujourd'hui" />}>
        <Tasks />
      </Suspense>
    </div>
  );
}
