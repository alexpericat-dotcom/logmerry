import Link from "next/link";
import { Suspense } from "react";

import { PageBanner } from "@/components/page-banner";
import { Badge } from "@/components/ui/badge";
import { listNotes } from "@/lib/db/notes";
import { NOTE_TYPE_LABELS, excerpt } from "@/lib/domain/notes";
import { formatDateTime } from "@/lib/format";

export const metadata = { title: "À faire · LogMerry" };

const DESCRIPTION = "Les notes que tu as laissées en brouillon, à rédiger quand tu auras le temps.";

async function Drafts() {
  const notes = await listNotes(null, "draft");
  if (notes.length === 0) {
    return <p className="max-w-2xl text-muted-foreground">Aucun brouillon à rédiger. Les notes laissées à documenter plus tard apparaissent ici.</p>;
  }
  return (
    <ul className="flex w-full flex-col gap-2" aria-label="Notes en brouillon">
      {notes.map((note) => (
        <li key={note.id} className="rounded-md border bg-card">
          <Link href={`/notes/${note.id}`} className="flex min-h-11 flex-col gap-1 rounded-md p-3 hover:bg-accent/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring">
            <span className="flex flex-wrap items-baseline justify-between gap-x-3">
              <span className="min-w-0 break-words font-semibold">{note.title}</span>
              <time dateTime={note.created_at} className="font-mono text-xs tabular-nums text-muted-foreground">{formatDateTime(note.created_at)}</time>
            </span>
            <span className="flex flex-wrap gap-1">
              <Badge variant="secondary">{NOTE_TYPE_LABELS[note.type]}</Badge>
              {note.client && <Badge variant="outline">{note.client.name}</Badge>}
            </span>
            {note.body.trim() && <span className="break-words text-sm text-muted-foreground">{excerpt(note.body)}</span>}
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default function ToDoPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageBanner title="À faire" description={DESCRIPTION} />
      <Suspense fallback={<p className="text-muted-foreground">Chargement…</p>}>
        <Drafts />
      </Suspense>
    </div>
  );
}
