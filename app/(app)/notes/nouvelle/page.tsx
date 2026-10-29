import { Suspense } from "react";

import { createNote } from "@/app/(app)/notes/actions";
import { PageBanner } from "@/components/page-banner";
import { NoteForm } from "@/components/note-form";
import { listAllClients } from "@/lib/db/clients";
import { parseListFilter } from "@/lib/domain/notes";

export const metadata = { title: "Nouvelle note · LogMerry" };

type SearchParams = Promise<{ type?: string | string[]; statut?: string | string[] }>;

async function NewNote({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const clients = await listAllClients();
  return <NoteForm action={createNote} clients={clients} submitLabel="Enregistrer la note" listFilter={parseListFilter(params.type, params.statut)} />;
}

export default function NouvelleNotePage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <div className="flex flex-col gap-6">
      <PageBanner title="Nouvelle note" />
      <Suspense fallback={<p className="text-muted-foreground">Chargement…</p>}>
        <NewNote searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
