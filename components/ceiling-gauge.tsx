import { CircleCheck, FlaskConical, OctagonAlert, TriangleAlert } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { MISSING_TEXT, type CeilingGauge as Gauge, type CeilingMissing } from "@/lib/domain/finance/ceilings";
import { isOfficialLink } from "@/lib/domain/finance/rules";
import { formatCents } from "@/lib/domain/quotes";
import { formatDate } from "@/lib/format";

/** Notes par plafond, communes à la page Plafonds et au cockpit : la franchise de TVA s'apprécie normalement sur l'année N-1 (décision 6). */
export const CEILING_NOTES: Record<string, string> = {
  ceiling_vat_franchise: "Sans la règle de l'année N-1 : la jauge compte la période de la règle, sans distinguer l'année précédente.",
};

const BASIS_LABEL = { excl_tax: "hors taxe", incl_tax: "taxe comprise" } as const;

/** « Paramètre manquant » : jamais un chiffre ; ce qui manque, et le lien qui le débloque. */
export function MissingCeiling({ result, heading: H = "h2" }: { result: CeilingMissing; heading?: "h2" | "h3" }) {
  return (
    <li className="flex flex-col gap-2 rounded-md border border-dashed bg-card p-3">
      <H className="font-semibold">{result.label}</H>
      <p className="text-sm">
        <span className="font-semibold">Paramètre manquant</span> : {MISSING_TEXT[result.reason]}.
      </p>
      <Link href={result.link} className="self-start text-sm underline underline-offset-4 max-md:inline-flex max-md:min-h-11 max-md:items-center">
        {result.link === "/profil" ? "Aller au Profil" : "Aller aux Règles"}
      </Link>
    </li>
  );
}

function stateLine(g: Gauge, activeThresholds: number): { icon: typeof CircleCheck; text: string; tone: "ok" | "warn" | "alert" } {
  if (g.state === "exceeded") return { icon: OctagonAlert, text: `Plafond dépassé de ${formatCents(g.overCents)}`, tone: "alert" };
  if (g.state === "reached") return { icon: OctagonAlert, text: "Plafond atteint", tone: "alert" };
  if (g.state === "threshold") return { icon: TriangleAlert, text: `Seuil de ${g.alertThreshold} % atteint`, tone: "warn" };
  return { icon: CircleCheck, text: activeThresholds === 0 ? "Aucun seuil d'alerte actif (à régler dans le Profil)" : "Sous les seuils d'alerte", tone: "ok" };
}

const FILL = { ok: "bg-primary", warn: "bg-warning", alert: "bg-destructive" } as const;

/** `heading` : niveau du titre (h3 quand la carte est sous un titre de section, comme sur le cockpit). Une jauge chiffrée : seuil, consommé, pourcentage, restant, période, mise à jour, source, date d'effet, « estimation » (décision 5). */
export function CeilingGaugeCard({ gauge: g, activeThresholds, note, heading: H = "h2" }: { gauge: Gauge; activeThresholds: number; note?: string; heading?: "h2" | "h3" }) {
  const { icon: StateIcon, text, tone } = stateLine(g, activeThresholds);
  const shown = Math.min(g.percent, 100);
  const period = `du ${formatDate(g.period.from)} au ${formatDate(g.period.to)}${g.period.kind === "rolling_12_months" ? " (12 mois glissants)" : " (année civile)"}`;
  return (
    <li className="flex flex-col gap-3 rounded-md border bg-card p-3">
      <div className="flex flex-wrap items-center gap-2">
        <H className="font-semibold">{g.label}</H>
        <Badge variant="outline">Estimation</Badge>
        {g.demo && (
          <Badge variant="secondary">
            <FlaskConical size={11} aria-hidden="true" />
            DEMO, non officielle
          </Badge>
        )}
      </div>
      {g.declaredNotConfirmed && <p className="rounded-md border p-2 text-sm">Calcul basé sur une donnée déclarée, non confirmée : la catégorie d&apos;activité du profil.</p>}
      <div
        role="progressbar"
        aria-label={`${g.label} : ${g.percent} % du plafond`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={shown} // plafonné à 100 ; le texte ci-dessous dit le vrai pourcentage (ex. 112 %) et prime pour les lecteurs d'écran
        aria-valuetext={`${g.percent} % du plafond`}
        className="h-3 w-full overflow-hidden rounded-sm border bg-background"
      >
        <div className={`h-full ${FILL[tone]}`} style={{ width: `${shown}%` }} />
      </div>
      <p className="flex items-center gap-2 text-sm font-semibold">
        <StateIcon size={16} aria-hidden="true" />
        {text}
      </p>
      <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm max-md:grid-cols-1 lg:grid-cols-3">
        <div>
          <dt className="text-xs text-muted-foreground">Plafond</dt>
          <dd className="font-mono tabular-nums">{formatCents(g.ceilingCents)}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">{g.minimum ? "Consommé (minimum)" : "Consommé"}</dt>
          <dd className="font-mono tabular-nums">{formatCents(g.consumedCents)}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">{g.minimum ? "Pourcentage atteint (au moins)" : "Pourcentage atteint"}</dt>
          <dd className="font-mono tabular-nums">{g.percent} %</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">{g.minimum ? "Restant (au plus)" : "Restant"}</dt>
          <dd className="font-mono tabular-nums">{formatCents(g.remainingCents)}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Période de référence</dt>
          <dd>{period}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Dernière mise à jour</dt>
          <dd>{g.lastUpdate ? `encaissement du ${formatDate(g.lastUpdate)}` : "aucun encaissement sur la période"}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Ce qui est compté</dt>
          <dd>
            tous les encaissements, {BASIS_LABEL[g.basis]} ; catégorie de la règle : {g.revenueCategory || "non précisée"}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Source de la règle</dt>
          <dd className="break-all">
            {isOfficialLink(g.source) ? (
              <a href={g.source} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">
                {g.source}
              </a>
            ) : (
              g.source
            )}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Date d&apos;effet</dt>
          <dd>{formatDate(g.effectiveFrom)}</dd>
        </div>
      </dl>
      {g.minimum && (
        <p className="text-sm">
          Minimum : la taxe de {g.paymentsMissingTax} encaissement{g.paymentsMissingTax > 1 ? "s" : ""} est à confirmer, comptée pour zéro en attendant.
        </p>
      )}
      {g.firstYearNotProrated && <p className="text-sm text-muted-foreground">Sans prorata de première année : ton début d&apos;activité tombe dans cette période (la règle de prorata n&apos;est pas encore appliquée).</p>}
      {note && <p className="text-sm text-muted-foreground">{note}</p>}
    </li>
  );
}
