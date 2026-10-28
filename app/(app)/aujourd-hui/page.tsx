import { Suspense } from "react";

import { PageBanner } from "@/components/page-banner";
import { MissingParameters, TodayTasks } from "@/components/today-tasks";
import { listDeadlines } from "@/lib/db/deadlines";
import { listInvoices } from "@/lib/db/invoices";
import { listPaymentsForCeilings } from "@/lib/db/payments";
import { getProfile } from "@/lib/db/profile";
import { listRules } from "@/lib/db/rules";
import { listTaskChecks } from "@/lib/db/task-checks";
import { todayMissing, todayTasks } from "@/lib/domain/cockpit/today";
import { computeCeilings } from "@/lib/domain/finance/ceilings";
import { invoiceBalance } from "@/lib/domain/payments";
import { todayParis } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Aujourd'hui · LogMerry" };

const EMPTY = "Rien à faire pour aujourd'hui. Tes tâches apparaîtront ici dès que tu auras saisi tes échéances, tes factures et tes devis.";

async function Tasks() {
  const [deadlines, invoices, rules, profile, payments] = await Promise.all([listDeadlines(), listInvoices(), listRules(), getProfile(), listPaymentsForCeilings()]);
  const today = todayParis(); // après les données dynamiques : Next.js refuse de lire l'horloge avant (prérendu)
  const checked = await listTaskChecks(await createClient(), today);
  const ceilings = computeCeilings(rules, profile, payments, today);
  const tasks = todayTasks(
    deadlines,
    invoices.map((i) => ({ id: i.id, reference: i.reference, due_on: i.due_on, status: invoiceBalance(i, i.payments).status, mission: i.mission })),
    checked,
    ceilings,
    rules,
    profile,
    today,
  );
  const missing = todayMissing(ceilings, rules, profile, today);
  return (
    <>
      <PageBanner hero title="Aujourd'hui" description={tasks.length ? "Ce qui demande ton attention, dans l'ordre." : EMPTY} />
      {tasks.length > 0 && <TodayTasks tasks={tasks} />}
      <MissingParameters lines={missing} />
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
