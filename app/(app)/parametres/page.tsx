import { Suspense } from "react";

import { PageBanner } from "@/components/page-banner";
import { IndexAllNotes } from "@/components/index-all-notes";
import { countIndexStatuses } from "@/lib/db/notes";

export const metadata = { title: "Paramètres · LogMerry" };

async function IndexSection() {
  const c = await countIndexStatuses();
  return (
    <section aria-labelledby="index-title" className="flex max-w-2xl flex-col gap-3">
      <h2 id="index-title" className="text-xl font-semibold">
        Assistant : indexation des notes
      </h2>
      <p className="text-muted-foreground">
        L&apos;assistant ne retrouve que les notes indexées. Les textes sont envoyés à Mistral AI pour être
        vectorisés : n&apos;y mets pas de données réelles de clients.
      </p>
      <p>
        <span className="font-mono tabular-nums">{c.indexed}</span> note{c.indexed > 1 ? "s" : ""} indexée{c.indexed > 1 ? "s" : ""} sur{" "}
        <span className="font-mono tabular-nums">{c.total}</span>
        {c.pending > 0 && (
          <>
            , <span className="font-mono tabular-nums">{c.pending}</span> en attente
          </>
        )}
        {c.failed > 0 && (
          <>
            , <span className="font-mono tabular-nums">{c.failed}</span> en échec
          </>
        )}
        .
      </p>
      <IndexAllNotes />
    </section>
  );
}

export default function ParametresPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageBanner title="Paramètres" />
      <Suspense fallback={<p className="text-muted-foreground">Chargement…</p>}>
        <IndexSection />
      </Suspense>
    </div>
  );
}
