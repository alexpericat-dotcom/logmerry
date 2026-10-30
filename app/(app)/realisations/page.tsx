import Link from "next/link";
import { Suspense } from "react";

import { PageBanner } from "@/components/page-banner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { listRealisations } from "@/lib/db/realisations";
import { REALISATION_ORIGIN_LABELS } from "@/lib/domain/realisations";

export const metadata = { title: "Réalisations · LogMerry" };

async function RealisationsList() {
  const items = await listRealisations();
  const createButton = (
    <Button asChild size="lg" className="shrink-0">
      <Link href="/realisations/nouvelle">Créer une réalisation</Link>
    </Button>
  );

  if (items.length === 0) {
    return (
      <PageBanner
        title="Réalisations"
        className="self-stretch"
        actions={createButton}
        description="Tu n'as pas encore de réalisation. Une réalisation, c'est un projet que tu pourras montrer dans ton portfolio, une fois publié avec l'accord du client."
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageBanner title="Réalisations" actions={createButton} />
      <ul className="grid gap-4 md:grid-cols-2">
        {items.map((r) => (
          <li key={r.id} className="relative flex flex-col gap-2 rounded-lg border bg-card p-4 shadow-hard">
            <h2 className="break-words font-semibold">
              <Link href={`/realisations/${r.id}/modifier`} className="underline-offset-4 after:absolute after:inset-0 hover:underline">
                {r.title}
              </Link>
            </h2>
            <p className="line-clamp-3 break-words text-sm text-muted-foreground">{r.description}</p>
            <div className="mt-auto flex flex-wrap gap-1.5">
              <Badge variant="outline">{REALISATION_ORIGIN_LABELS[r.origin]}</Badge>
              <Badge variant="outline">{r.published ? "Publiée" : "Non publiée"}</Badge>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function RealisationsPage() {
  return (
    <Suspense fallback={<p className="text-muted-foreground">Chargement…</p>}>
      <RealisationsList />
    </Suspense>
  );
}
