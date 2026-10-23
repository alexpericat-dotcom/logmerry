"use client";

import { PageBanner } from "@/components/page-banner";
import { Button } from "@/components/ui/button";

export default function FacturesError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex flex-col items-start gap-4">
      <PageBanner title="Factures" className="self-stretch" />
      <p role="alert" className="text-destructive">
        Impossible de charger tes factures pour le moment.
      </p>
      <Button onClick={reset}>Réessayer</Button>
    </div>
  );
}
