import Link from "next/link";
import { Suspense } from "react";

import { Badge } from "@/components/ui/badge";
import { IndexStatus } from "@/components/index-status";
import { Button } from "@/components/ui/button";
import { listNotes } from "@/lib/db/notes";
import {
  NOTE_FILTER_LABELS,
  NOTE_TYPES,
  NOTE_TYPE_LABELS,
  excerpt,
  parseTypeFilter,
  type NoteType,
} from "@/lib/domain/notes";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

export const metadata = { title: "Notes · LogMerry" };

type SearchParams = Promise<{ type?: string | string[] }>;

function Filters({ current }: { current: NoteType | null }) {
  const items: { label: string; href: string; type: NoteType | null }[] = [
    { label: "Toutes", href: "/notes", type: null },
    ...NOTE_TYPES.map((t) => ({ label: NOTE_FILTER_LABELS[t], href: `/notes?type=${t}`, type: t })),
  ];
  return (
    <nav aria-label="Filtrer par type">
      <ul className="flex flex-wrap gap-2">
        {items.map((item) => {
          const active = item.type === current;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex min-h-8 items-center rounded-full border px-3 text-sm hover:bg-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring",
                  active ? "border-primary bg-accent font-bold" : "border-input",
                )}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

async function NotesList({ searchParams }: { searchParams: SearchParams }) {
  const type = parseTypeFilter((await searchParams).type);
  const notes = await listNotes(type);

  const createButton = (
    <Button asChild>
      <Link href="/notes/nouvelle">Créer une note</Link>
    </Button>
  );

  if (notes.length === 0 && !type) {
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
      <div className="flex w-full max-w-2xl flex-wrap items-center justify-between gap-3">
        <Filters current={type} />
        {createButton}
      </div>
      {notes.length === 0 ? (
        <p className="text-muted-foreground">Aucune note de ce type.</p>
      ) : (
        <ul className="flex w-full max-w-2xl flex-col gap-3">
          {notes.map((note) => (
            <li key={note.id} className="rounded-md border bg-card p-3">
              <div className="flex items-start justify-between gap-3">
                <h2 className="min-w-0 break-words font-semibold">
                  <Link href={`/notes/${note.id}`} className="underline-offset-4 hover:underline">
                    {note.title}
                  </Link>
                </h2>
                <time
                  dateTime={note.created_at}
                  className="shrink-0 text-sm tabular-nums text-muted-foreground"
                >
                  {formatDateTime(note.created_at)}
                </time>
              </div>
              <div className="mt-1 flex flex-wrap gap-2">
                <Badge variant="secondary">{NOTE_TYPE_LABELS[note.type]}</Badge>
                {note.status === "draft" && <Badge variant="outline">Brouillon</Badge>}
                <IndexStatus status={note.index_status} />
              </div>
              {note.body && (
                <p className="mt-1 break-words text-sm text-muted-foreground">
                  {excerpt(note.body)}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function NotesPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-bold">Notes</h1>
      <Suspense fallback={<p className="text-muted-foreground">Chargement…</p>}>
        <NotesList searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
