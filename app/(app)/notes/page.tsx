import Link from "next/link";
import { Suspense } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { excerpt } from "@/lib/domain/notes";
import { listNotes } from "@/lib/db/notes";

export const metadata = { title: "Notes · LogMerry" };

const dateFormat = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "medium",
  timeZone: "Europe/Paris",
});

async function NotesList() {
  const notes = await listNotes();

  const createButton = (
    <Button asChild>
      <Link href="/notes/nouvelle">Créer une note</Link>
    </Button>
  );

  if (notes.length === 0) {
    return (
      <div className="flex max-w-2xl flex-col items-start gap-4">
        <p className="text-muted-foreground">
          Tu n&apos;as pas encore de note. Une note, c&apos;est un compte rendu
          de rendez-vous, une procédure ou un modèle que tu voudras retrouver
          plus tard.
        </p>
        {createButton}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-start gap-6">
      {createButton}
      <ul className="flex w-full max-w-2xl flex-col gap-3">
        {notes.map((note) => (
          <li key={note.id} className="rounded-md border bg-card p-3">
            <div className="flex items-start justify-between gap-3">
              <h2 className="min-w-0 break-words font-semibold">{note.title}</h2>
              <time
                dateTime={note.created_at}
                className="shrink-0 text-sm tabular-nums text-muted-foreground"
              >
                {dateFormat.format(new Date(note.created_at))}
              </time>
            </div>
            {note.status === "draft" && (
              <Badge variant="outline" className="mt-1">
                Brouillon
              </Badge>
            )}
            {note.body && (
              <p className="mt-1 break-words text-sm text-muted-foreground">
                {excerpt(note.body)}
              </p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function NotesPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-bold">Notes</h1>
      <Suspense fallback={<p className="text-muted-foreground">Chargement…</p>}>
        <NotesList />
      </Suspense>
    </div>
  );
}
