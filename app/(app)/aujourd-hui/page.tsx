import { Briefcase, CalendarClock, ChevronRight, FileText, Receipt, Target, Users } from "lucide-react";
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
import { listDraftTypes } from "@/lib/db/notes";
import { listPaymentsForCeilings } from "@/lib/db/payments";
import { getProfile } from "@/lib/db/profile";
import { listActiveSprintWork } from "@/lib/db/sprint-work";
import { listSentQuotes } from "@/lib/db/quotes";
import { listRules } from "@/lib/db/rules";
import { listTaskChecks } from "@/lib/db/task-checks";
import { bannerDescription, invoiceViews, quotesWithParisDay, sprintsWithParisDay, taskProgress, topCeiling } from "@/lib/domain/cockpit/assembly";
import { cockpitKpis, deadlineDaysOfMonth, upcomingDeadlines } from "@/lib/domain/cockpit/overview";
import { draftSummary } from "@/lib/domain/cockpit/summary";
import { sprintOverflow, todayMissing, todayTasks } from "@/lib/domain/cockpit/today";
import { computeCeilings } from "@/lib/domain/finance/ceilings";
import { collectedRevenue, monthlyRevenue } from "@/lib/domain/finance/revenue";
import { formatCents } from "@/lib/domain/quotes";
import { todayParis } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Aujourd'hui · LogMerry" };

const EMPTY = "Rien à faire pour aujourd'hui. Tes tâches apparaîtront ici dès que tu auras saisi tes échéances, tes factures et tes devis.";

async function Tasks() {
  const [deadlines, invoices, rules, profile, payments, quotes, missions, sprintRows, clients, drafts] = await Promise.all([listDeadlines(), listInvoices(), listRules(), getProfile(), listPaymentsForCeilings(), listSentQuotes(), listAllMissions(), createClient().then(listActiveSprintWork), listAllClients(), listDraftTypes().catch(() => [])]); // la ligne de synthèse est secondaire : sa lecture en échec ne bloque pas le cockpit
  const today = todayParis(); // après les données dynamiques : Next.js refuse de lire l'horloge avant (prérendu)
  const checked = await listTaskChecks(await createClient(), today);
  const sprints = sprintsWithParisDay(sprintRows);
  const invoiceView = invoiceViews(invoices, today);
  const ceilings = computeCeilings(rules, profile, payments, today);
  const tasks = todayTasks(
    deadlines,
    invoiceView.forTasks,
    checked,
    ceilings,
    rules,
    profile,
    quotesWithParisDay(quotes),
    missions,
    sprints,
    today,
  );
  const overflow = sprintOverflow(sprints, today);
  const missing = todayMissing(ceilings, rules, profile, today);
  const { done, percent: taskPercent } = taskProgress(tasks);
  const kpis = cockpitKpis({ clients, missions, quotes, invoices: invoiceView.rows, deadlines }, today);
  const upcoming = upcomingDeadlines(deadlines, today, 5);
  const deadlineDays = deadlineDaysOfMonth(deadlines, today);
  const revenue = collectedRevenue(payments, today);
  const months = monthlyRevenue(payments, today);
  const top = topCeiling(ceilings);
  const draftLine = draftSummary(drafts);
  const description = bannerDescription(tasks.length, done);
  return (
    <>
      <PageBanner
        hero
        title="Aujourd'hui"
        description={description}
        tiles={
          <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
            <KpiTile href="/clients?statut=client" icon={Users} tone="teal" label="Clients" value={kpis.clients} hint="fiches clients" />
            <KpiTile href="/clients?statut=prospect" icon={Target} tone="violet" label="Prospects" value={kpis.prospects} hint="à convaincre" />
            <KpiTile href="/missions?statut=en-cours" icon={Briefcase} tone="orange" label="Missions" value={kpis.missionsInProgress} hint={`missions en cours, ${kpis.missionsPlanned} à planifier`} />
            <KpiTile href="/clients" icon={FileText} tone="pink" label="Devis" value={kpis.quotesSent} hint="devis envoyés, en attente de réponse" />
            <KpiTile href="/factures" icon={Receipt} tone="yellow" label="Factures" value={kpis.invoicesToCollect} hint={kpis.invoicesOverdue ? `à encaisser, dont ${kpis.invoicesOverdue} échue${kpis.invoicesOverdue > 1 ? "s" : ""}` : "à encaisser, aucune échue"} alert={kpis.invoicesOverdue ? `${kpis.invoicesOverdue} échue${kpis.invoicesOverdue > 1 ? "s" : ""}` : undefined} />
            <KpiTile href="/calendrier" icon={CalendarClock} tone="teal" label="Échéances" value={kpis.deadlinesThisWeek} hint="échéances des 7 prochains jours" />
          </div>
        }
      />
      <div className="grid gap-3 lg:grid-cols-12">
        <Panel title="CA encaissé" className="lg:col-span-4" action={<Link href="/plafonds" className="flex min-h-11 items-center text-sm underline underline-offset-4">Plafonds</Link>}>
          <p className="flex flex-wrap items-baseline gap-x-3">
            <span className="font-mono text-2xl font-semibold tabular-nums">{formatCents(revenue.cents)}</span>
            <span className="text-xs text-muted-foreground">hors taxe, année en cours, d&apos;après tes encaissements</span>
          </p>
          <RevenueChart months={months} currentMonth={Number(today.slice(5, 7))} year={Number(today.slice(0, 4))} />
        </Panel>
        <Panel title="Où tu en es" className="lg:col-span-3">
          <div className="flex flex-wrap items-center justify-around gap-2">
            <div className="flex flex-col items-center gap-1">
              {tasks.length > 0 ? (
                <SegmentedRing percent={taskPercent} label="Tâches du jour faites" size={88} />
              ) : (
                <p className="flex size-[88px] items-center justify-center rounded-full border border-dashed p-3 text-center text-xs text-muted-foreground">Journée libre</p>
              )}
              <span className="text-center text-xs font-semibold leading-tight">Tâches du jour{tasks.length > 0 && <><br />{done}/{tasks.length} faites</>}</span>
            </div>
            {top && (
              <div className="flex flex-col items-center gap-1">
                <SegmentedRing percent={top.percent} label={`${top.label} (estimation)`} size={88} />
                <span className="max-w-24 text-center text-xs font-semibold leading-tight">{top.label}</span>
                <span className="text-xs text-muted-foreground">{top.state === "exceeded" ? "dépassé, " : top.state === "reached" ? "atteint, " : ""}estimation{top.demo ? " · DEMO" : ""}</span>
              </div>
            )}
          </div>
        </Panel>
        <Panel title="Calendrier" className="lg:col-span-5" action={<Link href="/calendrier" className="flex min-h-11 items-center text-sm underline underline-offset-4">Tout voir</Link>}>
          <div className="flex flex-wrap gap-3">
            <div className="w-48 shrink-0">
              <MiniCalendar asOf={today} deadlineDays={deadlineDays} />
            </div>
            <div className="flex min-w-36 flex-1 flex-col gap-1">
              <h3 className="text-xs font-semibold">Prochaines échéances</h3>
              <UpcomingDeadlines items={upcoming.slice(0, 3)} />
            </div>
          </div>
        </Panel>
      </div>
      <div className="grid gap-3 lg:grid-cols-12">
        <Panel title="À faire aujourd'hui" className="lg:col-span-7">
          {tasks.length > 0 ? <TodayTasks tasks={tasks} overflow={overflow} /> : <p className="text-sm text-muted-foreground">{EMPTY}</p>}
          <MissingParameters lines={missing} />
          {draftLine && (
            <Link href="/a-faire" className="flex min-h-11 items-center justify-between gap-2 rounded-md border bg-card px-3 text-sm hover:bg-accent/40">
              <span>{draftLine}</span>
              <ChevronRight size={16} aria-hidden="true" />
            </Link>
          )}
        </Panel>
        <CockpitGauges ceilings={ceilings} />
      </div>
    </>
  );
}

export default function AujourdhuiPage() {
  return (
    <div className="flex flex-col gap-3">
      <Suspense fallback={<PageBanner hero title="Aujourd'hui" />}>
        <Tasks />
      </Suspense>
    </div>
  );
}
