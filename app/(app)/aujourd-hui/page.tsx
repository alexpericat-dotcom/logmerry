import { Briefcase, CalendarClock, FileText, Receipt, Target, Users } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

import { CockpitGauges } from "@/components/cockpit-gauges";
import { KpiTile, MiniCalendar, Panel, RevenueChart, SegmentedRing, UpcomingDeadlines } from "@/components/dashboard-widgets";
import { PageBanner } from "@/components/page-banner";
import { MissingParameters, TodayTasks } from "@/components/today-tasks";
import { listAllClients } from "@/lib/db/clients";
import { listDeadlines } from "@/lib/db/deadlines";
import { listInvoices } from "@/lib/db/invoices";
import { listAllMissions } from "@/lib/db/missions";
import { listPaymentsForCeilings } from "@/lib/db/payments";
import { getProfile } from "@/lib/db/profile";
import { listActiveSprintWork } from "@/lib/db/sprint-work";
import { listSentQuotes } from "@/lib/db/quotes";
import { listRules } from "@/lib/db/rules";
import { listTaskChecks } from "@/lib/db/task-checks";
import { cockpitKpis, deadlineDaysOfMonth, upcomingDeadlines } from "@/lib/domain/cockpit/overview";
import { sprintOverflow, todayMissing, todayTasks, type SprintWork } from "@/lib/domain/cockpit/today";
import { computeCeilings } from "@/lib/domain/finance/ceilings";
import { collectedRevenue, monthlyRevenue } from "@/lib/domain/finance/revenue";
import { isOverdue } from "@/lib/domain/invoices";
import { invoiceBalance } from "@/lib/domain/payments";
import { formatCents } from "@/lib/domain/quotes";
import { todayParis } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Aujourd'hui · LogMerry" };

const EMPTY = "Rien à faire pour aujourd'hui. Tes tâches apparaîtront ici dès que tu auras saisi tes échéances, tes factures et tes devis.";

async function Tasks() {
  const [deadlines, invoices, rules, profile, payments, quotes, missions, sprintRows, clients] = await Promise.all([listDeadlines(), listInvoices(), listRules(), getProfile(), listPaymentsForCeilings(), listSentQuotes(), listAllMissions(), createClient().then(listActiveSprintWork), listAllClients()]);
  const today = todayParis(); // après les données dynamiques : Next.js refuse de lire l'horloge avant (prérendu)
  const checked = await listTaskChecks(await createClient(), today);
  const sprints: SprintWork[] = sprintRows.map((sp) => ({
    ...sp,
    stories: sp.stories.map((st) => ({ ...st, tasks: st.tasks.map((t) => ({ ...t, done_on: todayParis(new Date(t.updated_at)) })) })), // jour de Paris de la dernière modification
  }));
  const ceilings = computeCeilings(rules, profile, payments, today);
  const tasks = todayTasks(
    deadlines,
    invoices.map((i) => ({ id: i.id, reference: i.reference, due_on: i.due_on, status: invoiceBalance(i, i.payments).status, mission: i.mission })),
    checked,
    ceilings,
    rules,
    profile,
    quotes.map((q) => ({ ...q, updated_on: todayParis(new Date(q.updated_at)) })), // jour de Paris de la dernière modification
    missions,
    sprints,
    today,
  );
  const overflow = sprintOverflow(sprints, today);
  const missing = todayMissing(ceilings, rules, profile, today);
  const done = tasks.filter((t) => t.done).length;
  const taskPercent = tasks.length ? Math.round((done * 100) / tasks.length) : 0;
  const invoiceRows = invoices.map((i) => {
    const status = invoiceBalance(i, i.payments).status;
    return { status, overdue: isOverdue(i.due_on, today, status) };
  });
  const kpis = cockpitKpis({ clients, missions, quotes, invoices: invoiceRows, deadlines }, today);
  const upcoming = upcomingDeadlines(deadlines, today, 5);
  const deadlineDays = deadlineDaysOfMonth(deadlines, today);
  const revenue = collectedRevenue(payments, today);
  const months = monthlyRevenue(payments, today);
  const top = ceilings.flatMap((c) => (c.status === "ok" ? [c] : [])).sort((a, b) => b.percent - a.percent)[0];
  const plural = (n: number, one: string, many: string) => `${n} ${n > 1 ? many : one}`;
  const description = tasks.length ? `${plural(tasks.length - done, "tâche à faire", "tâches à faire")} aujourd'hui, ${done} déjà faite${done > 1 ? "s" : ""}.` : "Rien à faire pour aujourd'hui.";
  return (
    <>
      <PageBanner hero title="Aujourd'hui" description={description} />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <KpiTile href="/clients?statut=client" icon={Users} tone="teal" label="Clients" value={kpis.clients} hint="fiches clients" />
        <KpiTile href="/clients?statut=prospect" icon={Target} tone="violet" label="Prospects" value={kpis.prospects} hint="à convaincre" />
        <KpiTile href="/missions?statut=en-cours" icon={Briefcase} tone="orange" label="Missions en cours" value={kpis.missionsInProgress} hint={`${kpis.missionsPlanned} à planifier`} />
        <KpiTile href="/clients" icon={FileText} tone="pink" label="Devis envoyés" value={kpis.quotesSent} hint="en attente de réponse" />
        <KpiTile href="/factures" icon={Receipt} tone="yellow" label="Factures à encaisser" value={kpis.invoicesToCollect} hint={kpis.invoicesOverdue ? `dont ${kpis.invoicesOverdue} échue${kpis.invoicesOverdue > 1 ? "s" : ""}` : "aucune échue"} />
        <KpiTile href="/calendrier" icon={CalendarClock} tone="teal" label="Échéances (7 jours)" value={kpis.deadlinesThisWeek} hint="à venir" />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="CA encaissé" className="lg:col-span-2" action={<Link href="/plafonds" className="flex min-h-11 items-center text-sm underline underline-offset-4">Plafonds</Link>}>
          <p className="flex flex-wrap items-baseline gap-x-3">
            <span className="font-mono text-3xl font-semibold tabular-nums">{formatCents(revenue.cents)}</span>
            <span className="text-sm text-muted-foreground">hors taxe, année en cours · d&apos;après tes encaissements saisis</span>
          </p>
          <RevenueChart months={months} currentMonth={Number(today.slice(5, 7))} year={Number(today.slice(0, 4))} />
        </Panel>
        <Panel title="Où tu en es">
          <div className="flex flex-wrap items-center justify-around gap-4">
            <div className="flex flex-col items-center gap-1">
              {tasks.length > 0 ? (
                <SegmentedRing percent={taskPercent} label="Tâches du jour faites" caption={`${done}/${tasks.length} faites`} size={124} />
              ) : (
                <p className="flex size-[124px] items-center justify-center rounded-full border border-dashed p-3 text-center text-xs text-muted-foreground">Journée libre</p>
              )}
              <span className="text-sm font-semibold">Tâches du jour</span>
            </div>
            {top && (
              <div className="flex flex-col items-center gap-1">
                <SegmentedRing percent={top.percent} label={`${top.label} (estimation)`} caption={top.state === "exceeded" ? "dépassé" : top.state === "reached" ? "atteint" : undefined} size={124} />
                <span className="max-w-32 text-center text-sm font-semibold">{top.label}</span>
                <span className="text-xs text-muted-foreground">estimation{top.demo ? " · DEMO" : ""}</span>
              </div>
            )}
          </div>
        </Panel>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="flex flex-col gap-3 lg:col-span-2">
          <h2 className="text-base font-semibold">À faire aujourd&apos;hui</h2>
          {tasks.length > 0 ? <TodayTasks tasks={tasks} overflow={overflow} /> : <p className="rounded-md border bg-card p-3 text-sm text-muted-foreground">{EMPTY}</p>}
          <MissingParameters lines={missing} />
        </div>
        <Panel title="Calendrier" action={<Link href="/calendrier" className="flex min-h-11 items-center text-sm underline underline-offset-4">Tout voir</Link>}>
          <MiniCalendar asOf={today} deadlineDays={deadlineDays} />
          <h3 className="text-sm font-semibold">Prochaines échéances</h3>
          <UpcomingDeadlines items={upcoming} />
        </Panel>
      </div>
      <CockpitGauges ceilings={ceilings} />
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
