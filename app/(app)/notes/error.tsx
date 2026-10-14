"use client";

import { PageBanner } from "@/components/page-banner";
import { Button } from "@/components/ui/button";

export default function NotesError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex max-w-2xl flex-col items-start gap-4">
      <PageBanner title="Notes" className="self-stretch" />
      <p role="alert" className="text-destructive">
        Impossible de charger tes notes pour le moment.
      </p>
      <Button onClick={reset}>Réessayer</Button>
    </div>
  );
}
