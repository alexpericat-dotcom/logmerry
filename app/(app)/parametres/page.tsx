import { Suspense } from "react";

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
      <p className="tabular-nums">
        {c.indexed} note{c.indexed === 1 ? "" : "s"} indexée{c.indexed === 1 ? "" : "s"} sur {c.total}
        {c.pending > 0 && `, ${c.pending} en attente`}
        {c.failed > 0 && `, ${c.failed} en échec`}.
      </p>
      <IndexAllNotes />
    </section>
  );
}

export default function ParametresPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-bold">Paramètres</h1>
      <Suspense fallback={<p className="text-muted-foreground">Chargement…</p>}>
        <IndexSection />
      </Suspense>
    </div>
  );
}
