import { Suspense } from "react";

import { CEILING_NOTES, CeilingGaugeCard, MissingCeiling } from "@/components/ceiling-gauge";
import { PageBanner } from "@/components/page-banner";
import { listPaymentsForCeilings } from "@/lib/db/payments";
import { getProfile } from "@/lib/db/profile";
import { listRules } from "@/lib/db/rules";
import { computeCeilings } from "@/lib/domain/finance/ceilings";
import { todayParis } from "@/lib/format";

export const metadata = { title: "Plafonds · LogMerry" };

async function Ceilings() {
  // Lecture seule : cette page n'écrit rien (ni profil créé, ni règle, ni encaissement).
  const [rules, profile, payments] = await Promise.all([listRules(), getProfile(), listPaymentsForCeilings()]);
  const asOf = todayParis(); // après les données dynamiques : Next.js refuse de lire l'horloge avant (prérendu)
  const results = computeCeilings(rules, profile, payments, asOf);
  const active = profile?.alert_thresholds ?? [];
  return (
    <ul className="flex max-w-4xl flex-col gap-3" aria-label="Jauges de plafond">
      {results.map((r) => (r.status === "ok" ? <CeilingGaugeCard key={r.key} gauge={r} activeThresholds={active.length} note={CEILING_NOTES[r.key]} /> : <MissingCeiling key={r.key} result={r} />))}
    </ul>
  );
}

export default function PlafondsPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageBanner title="Plafonds" description="Où tu en es de chaque plafond, calculé sur tes encaissements avec la règle de ce plafond. C'est une estimation, pas un calcul officiel : une règle absente, à vérifier ou périmée n'affiche jamais de chiffre." />
      <Suspense fallback={<p className="text-muted-foreground">Chargement…</p>}>
        <Ceilings />
      </Suspense>
    </div>
  );
}
