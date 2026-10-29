import { notFound } from "next/navigation";
import { Suspense } from "react";

import { PageBanner } from "@/components/page-banner";
import { updateNote } from "@/app/(app)/notes/actions";
import { DeleteNote } from "@/components/delete-note";
import { IndexStatus } from "@/components/index-status";
import { NoteSummary } from "@/components/note-summary";
import { NoteForm } from "@/components/note-form";
import { RetryIndexing } from "@/components/retry-indexing";
import { listAllClients } from "@/lib/db/clients";
import { getNote } from "@/lib/db/notes";
import { isUuid, parseListFilter } from "@/lib/domain/notes";
import { formatDateTime } from "@/lib/format";

export const metadata = { title: "Modifier la note · LogMerry" };

type SearchParams = Promise<{ type?: string | string[]; statut?: string | string[] }>;

async function EditNote({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: SearchParams }) {
  const { id } = await params;
  const query = await searchParams;
  const listFilter = parseListFilter(query.type, query.statut);
  if (!isUuid(id)) notFound();
  const note = await getNote(id);
  if (!note) notFound();
  const clients = await listAllClients();

  return (
    <div className="flex flex-col gap-6">
      <PageBanner title="Modifier la note" />
      <div>
        <p className="text-sm font-mono tabular-nums text-muted-foreground">
          Dernière modification : {formatDateTime(note.updated_at)}
        </p>
        <div className="mt-2 flex flex-col items-start gap-2">
          <IndexStatus status={note.index_status} />
          {note.index_status !== "indexed" && <RetryIndexing id={id} failed={note.index_status === "failed"} />}
        </div>
      </div>
      <NoteSummary id={id} title={note.title} />
      <NoteForm
        action={updateNote.bind(null, id)}
        initial={{ title: note.title, body: note.body, type: note.type, client_id: note.client_id ?? "", new_name: "", new_origin: "" }}
        clients={clients}
        submitLabel="Enregistrer les modifications"
        listFilter={listFilter}
      />
      <DeleteNote id={id} listFilter={listFilter} />
    </div>
  );
}

export default function NotePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: SearchParams }) {
  return (
    <Suspense fallback={<p className="text-muted-foreground">Chargement…</p>}>
      <EditNote params={params} searchParams={searchParams} />
    </Suspense>
  );
}
