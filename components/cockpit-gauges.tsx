import { FlaskConical, OctagonAlert, TriangleAlert } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import type { CeilingGauge, CeilingResult } from "@/lib/domain/finance/ceilings";
import { formatCents } from "@/lib/domain/quotes";

const FILL = { below: "bg-primary", threshold: "bg-warning", reached: "bg-destructive", exceeded: "bg-destructive" } as const;

function GaugeRow({ g }: { g: CeilingGauge }) {
  const shown = Math.min(g.percent, 100);
  const state = g.state === "exceeded" ? { icon: OctagonAlert, text: "dépassé" } : g.state === "reached" ? { icon: OctagonAlert, text: "atteint" } : g.state === "threshold" ? { icon: TriangleAlert, text: `seuil ${g.alertThreshold} %` } : null;
  return (
    <li className="flex flex-col gap-1.5 rounded-md border bg-card p-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3">
        <h3 className="font-semibold">{g.label}</h3>
        <span className="flex items-center gap-2 text-sm">
          {state && (
            <span className="flex items-center gap-1 font-semibold">
              <state.icon size={14} aria-hidden="true" />
              {state.text}
            </span>
          )}
          <span className="font-mono tabular-nums">{g.percent} %</span>
        </span>
      </div>
      <div
        role="progressbar"
        aria-label={`${g.label} : ${g.percent} % du plafond`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={shown}
        aria-valuetext={`${g.percent} % du plafond`}
        className="h-2 w-full overflow-hidden rounded-sm border bg-background"
      >
        <div className={`h-full ${FILL[g.state]}`} style={{ width: `${shown}%` }} />
      </div>
      <p className="font-mono text-xs tabular-nums text-muted-foreground">
        {formatCents(g.consumedCents)} sur {formatCents(g.ceilingCents)}
      </p>
    </li>
  );
}

/**
 * CA encaissé et jauges de plafond du cockpit, en version compacte : les mêmes chiffres que la page Plafonds (un seul calcul, `computeCeilings`),
 * le détail (période, source, base) restant sur cette page. Les étiquettes communes (estimation, démo, à confirmer) sont dites une fois.
 * Ce ne sont pas des tâches. Un plafond « paramètre manquant » n'a pas de ligne ici : il figure déjà dans « paramètres manquants ».
 */
export function CockpitGauges({ ceilings, revenue }: { ceilings: CeilingResult[]; revenue: { cents: number; from: string; to: string } }) {
  const gauges = ceilings.filter((r): r is CeilingGauge => r.status === "ok");
  return (
    <section aria-labelledby="cockpit-gauges" className="flex max-w-4xl flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="cockpit-gauges" className="text-lg font-semibold">Plafonds et CA</h2>
        <span className="flex flex-wrap items-center gap-2">
          {gauges.length > 0 && <Badge variant="outline">Estimation</Badge>}
          {gauges.some((g) => g.demo) && (
            <Badge variant="secondary">
              <FlaskConical size={11} aria-hidden="true" />
              DEMO<span className="sr-only">, non officielle</span>
            </Badge>
          )}
          {gauges.some((g) => g.declaredNotConfirmed) && (
            <Badge variant="warning">
              <TriangleAlert size={11} aria-hidden="true" />
              À confirmer<span className="sr-only"> : calcul basé sur une donnée déclarée, non confirmée (catégorie d&apos;activité du profil)</span>
            </Badge>
          )}
          <Link href="/plafonds" className="flex min-h-11 items-center text-sm underline underline-offset-4">Détails</Link>
        </span>
      </div>
      <p className="flex flex-wrap items-baseline justify-between gap-x-3 rounded-md border bg-card p-3">
        <span className="text-sm">CA encaissé <span className="text-muted-foreground">(hors taxe, année en cours)</span></span>
        <span className="font-mono text-lg font-semibold tabular-nums">{formatCents(revenue.cents)}</span>
      </p>
      {gauges.length > 0 && (
        <ul className="flex flex-col gap-2" aria-label="Jauges de plafond">
          {gauges.map((g) => <GaugeRow key={g.key} g={g} />)}
        </ul>
      )}
    </section>
  );
}
