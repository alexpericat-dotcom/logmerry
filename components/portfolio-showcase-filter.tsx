"use client";

import { useState } from "react";

import { PortfolioShowcase } from "@/components/portfolio-showcase";
import type { PublicCard } from "@/lib/domain/portfolio";
import { REALISATION_STATUSES, REALISATION_STATUS_LABELS, type RealisationStatus } from "@/lib/domain/realisations";
import { SHOWCASE } from "@/lib/portfolio-content";

/** Les réalisations, avec un filtre par statut : des boutons à bascule (un seul actif), le compte de chaque statut, un statut vide désactivé. Sans JavaScript, tout est affiché. */
export function PortfolioShowcaseFilter({ cards, supabaseUrl }: { cards: PublicCard[]; supabaseUrl: string }) {
  const [status, setStatus] = useState<RealisationStatus | "all">("all");
  const count = (s: RealisationStatus) => cards.filter((c) => c.status === s).length;
  const shown = status === "all" ? cards : cards.filter((c) => c.status === status);
  const chip = (active: boolean) =>
    `inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-phi-n1 transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${active ? "border-foreground bg-foreground text-background" : "hover:bg-accent"}`;
  return (
    <div className="flex flex-col gap-phi-2">
      {cards.length > 0 && (
        <div role="group" aria-label={SHOWCASE.filter.label} className="flex flex-wrap gap-2">
          <button type="button" aria-pressed={status === "all"} onClick={() => setStatus("all")} className={chip(status === "all")}>
            {SHOWCASE.filter.all} <span aria-hidden="true">({cards.length})</span>
            <span className="sr-only"> : {cards.length}</span>
          </button>
          {REALISATION_STATUSES.map((s) => (
            <button key={s} type="button" aria-pressed={status === s} disabled={count(s) === 0} onClick={() => setStatus(s)} className={chip(status === s)}>
              {REALISATION_STATUS_LABELS[s]} <span aria-hidden="true">({count(s)})</span>
              <span className="sr-only"> : {count(s)}</span>
            </button>
          ))}
        </div>
      )}
      <div aria-live="polite">{shown.length === 0 && cards.length > 0 ? <p className="text-phi-1 text-muted-foreground">{SHOWCASE.filter.empty}</p> : <PortfolioShowcase cards={shown} supabaseUrl={supabaseUrl} />}</div>
    </div>
  );
}
