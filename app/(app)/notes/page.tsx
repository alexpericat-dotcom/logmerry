import Link from "next/link";
import { Suspense } from "react";

import { PageBanner } from "@/components/page-banner";
import { Badge } from "@/components/ui/badge";
import { IndexStatus } from "@/components/index-status";
import { SenseSearch } from "@/components/sense-search";
import { Button } from "@/components/ui/button";
import { listNotes } from "@/lib/db/notes";
import {
  NOTE_FILTER_LABELS,
  NOTE_TYPES,
  NOTE_TYPE_LABELS,
  excerpt,
  parseStatusFilter,
  parseTypeFilter,
  type NoteType,
} from "@/lib/domain/notes";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

export const metadata = { title: "Notes · LogMerry" };

type SearchParams = Promise<{
  type?: string | string[];
  statut?: string | string[];
}>;

function Filters({
  current,
  draftOnly,
}: {
  current: NoteType | null;
  draftOnly: boolean;
}) {
  const items: { label: string; href: string; type: NoteType | null }[] = [
    { label: "Toutes", href: "/notes", type: null },
    ...NOTE_TYPES.map((t) => ({
      label: NOTE_FILTER_LABELS[t],
      href: `/notes?type=${t}`,
      type: t,
    })),
  ];
  const drafts = { label: "Brouillons", href: "/notes?statut=brouillon" };
  return (
    <nav aria-label="Filtrer les notes">
      <ul className="flex flex-wrap gap-1.5">
        {items.map((item) => {
          const active = !draftOnly && item.type === current;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex min-h-8 items-center rounded-full border px-2.5 text-sm hover:bg-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring",
                  active
                    ? "border-primary bg-accent font-bold"
                    : "border-input",
                )}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
        <li>
          <Link
            href={drafts.href}
            aria-current={draftOnly ? "page" : undefined}
            className={cn(
              "inline-flex min-h-8 items-center rounded-full border px-2.5 text-sm hover:bg-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring",
              draftOnly ? "border-primary bg-accent font-bold" : "border-input",
            )}
          >
            {drafts.label}
          </Link>
        </li>
      </ul>
    </nav>
  );
}

function CreateNoteButton() {
  return (
    <Button asChild size="sm" className="shrink-0">
      <Link href="/notes/nouvelle">Créer une note</Link>
    </Button>
  );
}

/** Bandeau de la page : titre, bouton de création et filtres (l'état des filtres vit dans l'adresse). */
async function NotesBanner({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const draftOnly = parseStatusFilter(params.statut) === "draft";
  const type = draftOnly ? null : parseTypeFilter(params.type);
  return (
    <PageBanner title="Notes" actions={<CreateNoteButton />}>
      <Filters current={type} draftOnly={draftOnly} />
    </PageBanner>
  );
}

async function NotesList({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const draftOnly = parseStatusFilter(params.statut) === "draft";
  const type = draftOnly ? null : parseTypeFilter(params.type);
  const notes = await listNotes(type, draftOnly ? "draft" : null);

  if (notes.length === 0 && !type && !draftOnly) {
    return (
      <p className="max-w-2xl text-muted-foreground">
        Tu n&apos;as pas encore de note. Une note, c&apos;est un compte rendu de
        rendez-vous, une procédure ou un modèle que tu voudras retrouver plus
        tard.
      </p>
    );
  }

  return notes.length === 0 ? (
    <p className="text-muted-foreground">
      {draftOnly
        ? "Aucun brouillon. Les notes à documenter plus tard apparaissent ici."
        : "Aucune note de ce type."}
    </p>
  ) : (
    <ul className="flex w-full flex-col gap-3">
      {notes.map((note) => (
        <li key={note.id} className="rounded-md border bg-card p-3">
          <div className="flex items-start justify-between gap-3">
            <h2 className="min-w-0 break-words font-semibold">
              <Link
                href={`/notes/${note.id}`}
                className="underline-offset-4 hover:underline"
              >
                {note.title}
              </Link>
            </h2>
            <time
              dateTime={note.created_at}
              className="shrink-0 pt-0.5 text-xs font-mono tabular-nums text-muted-foreground"
            >
              {formatDateTime(note.created_at)}
            </time>
          </div>
          <div className="mt-1.5 flex flex-wrap gap-1">
            <Badge variant="secondary">{NOTE_TYPE_LABELS[note.type]}</Badge>
            {note.status === "draft" && (
              <Badge variant="outline">Brouillon</Badge>
            )}
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
  );
}

export default function NotesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  return (
    <div className="flex flex-col gap-6">
      <Suspense fallback={<PageBanner title="Notes" />}>
        <NotesBanner searchParams={searchParams} />
      </Suspense>
      <SenseSearch />
      <Suspense fallback={<p className="text-muted-foreground">Chargement…</p>}>
        <NotesList searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
