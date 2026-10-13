import { notFound } from "next/navigation";
import { Suspense } from "react";

import { updateNote } from "@/app/(app)/notes/actions";
import { DeleteNote } from "@/components/delete-note";
import { NoteForm } from "@/components/note-form";
import { getNote } from "@/lib/db/notes";
import { isUuid } from "@/lib/domain/notes";
import { formatDateTime } from "@/lib/format";

export const metadata = { title: "Modifier la note · LogMerry" };

async function EditNote({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const note = await getNote(id);
  if (!note) notFound();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold break-words">Modifier la note</h1>
        <p className="mt-1 text-sm tabular-nums text-muted-foreground">
          Dernière modification : {formatDateTime(note.updated_at)}
        </p>
      </div>
      <NoteForm
        action={updateNote.bind(null, id)}
        initial={{ title: note.title, body: note.body, type: note.type }}
        submitLabel="Enregistrer les modifications"
      />
      <DeleteNote id={id} />
    </div>
  );
}

export default function NotePage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<p className="text-muted-foreground">Chargement…</p>}>
      <EditNote params={params} />
    </Suspense>
  );
}
