"use client";

import { PageBanner } from "@/components/page-banner";
import { Button } from "@/components/ui/button";

export default function CalendrierError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex flex-col items-start gap-4">
      <PageBanner title="Calendrier" className="self-stretch" />
      <p role="alert" className="text-destructive">
        Impossible de charger ton calendrier pour le moment.
      </p>
      <Button onClick={reset}>Réessayer</Button>
    </div>
  );
}
