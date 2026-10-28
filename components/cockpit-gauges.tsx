import { CEILING_NOTES, CeilingGaugeCard } from "@/components/ceiling-gauge";
import type { CeilingResult } from "@/lib/domain/finance/ceilings";
import { formatCents } from "@/lib/domain/quotes";
import { formatDate } from "@/lib/format";

/**
 * CA encaissé et jauges de plafond du cockpit : les mêmes cartes et les mêmes chiffres que la page Plafonds (un seul calcul, `computeCeilings`).
 * Ce ne sont pas des tâches : la section reste à part de la liste du jour. Un plafond « paramètre manquant » n'a pas de carte ici : sa ligne (raison et lien) figure déjà sous les tâches.
 */
export function CockpitGauges({ ceilings, revenue, activeThresholds }: { ceilings: CeilingResult[]; revenue: { cents: number; from: string; to: string }; activeThresholds: number }) {
  return (
    <section aria-labelledby="cockpit-gauges" className="flex max-w-4xl flex-col gap-3">
      <h2 id="cockpit-gauges" className="text-lg font-semibold">Plafonds et CA</h2>
      <p className="flex flex-col gap-1 rounded-md border bg-card p-3">
        <span className="text-sm text-muted-foreground">CA encaissé (hors taxe, année en cours)</span>
        <span className="text-2xl font-semibold">{formatCents(revenue.cents)}</span>
        <span className="text-sm text-muted-foreground">D&apos;après tes encaissements saisis, du {formatDate(revenue.from)} au {formatDate(revenue.to)}.</span>
      </p>
      <ul className="flex flex-col gap-3" aria-label="Jauges de plafond">
        {ceilings.map((r) => r.status === "ok" && <CeilingGaugeCard key={r.key} gauge={r} activeThresholds={activeThresholds} note={CEILING_NOTES[r.key]} heading="h3" />)}
      </ul>
    </section>
  );
}
