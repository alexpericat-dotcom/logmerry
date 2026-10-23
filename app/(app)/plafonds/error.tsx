"use client";

import { PageBanner } from "@/components/page-banner";
import { Button } from "@/components/ui/button";

export default function PlafondsError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex flex-col items-start gap-4">
      <PageBanner title="Plafonds" className="self-stretch" />
      <p role="alert" className="text-destructive">
        Impossible de charger tes plafonds pour le moment.
      </p>
      <Button onClick={reset}>Réessayer</Button>
    </div>
  );
}
