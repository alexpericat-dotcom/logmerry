"use client";

import { PageBanner } from "@/components/page-banner";
import { Button } from "@/components/ui/button";

export default function ToDoError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex max-w-2xl flex-col items-start gap-4">
      <PageBanner title="À faire" className="self-stretch" />
      <p role="alert" className="text-destructive">
        Impossible de charger tes brouillons pour le moment.
      </p>
      <Button onClick={reset}>Réessayer</Button>
    </div>
  );
}
