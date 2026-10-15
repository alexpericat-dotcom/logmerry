import { Suspense } from "react";

import { createNote } from "@/app/(app)/notes/actions";
import { PageBanner } from "@/components/page-banner";
import { NoteForm } from "@/components/note-form";
import { listAllClients } from "@/lib/db/clients";

export const metadata = { title: "Nouvelle note · LogMerry" };

async function NewNote() {
  const clients = await listAllClients();
  return <NoteForm action={createNote} clients={clients} submitLabel="Enregistrer la note" />;
}

export default function NouvelleNotePage() {
  return (
    <div className="flex flex-col gap-6">
      <PageBanner title="Nouvelle note" />
      <Suspense fallback={<p className="text-muted-foreground">Chargement…</p>}>
        <NewNote />
      </Suspense>
    </div>
  );
}
