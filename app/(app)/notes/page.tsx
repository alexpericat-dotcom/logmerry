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

/** Couleur de la barre du haut d'une carte, par type : l'information se voit sans lire (le type reste écrit dans la pastille). */
const TYPE_TONE: Record<NoteType, string> = {
  note: "border-t-tone-violet",
  procedure: "border-t-tone-teal",
  template: "border-t-tone-orange",
  faq: "border-t-tone-pink",
};

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
                  "inline-flex min-h-8 max-md:min-h-11 items-center rounded-sm border px-2.5 text-sm hover:bg-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring",
                  active
                    ? "neon font-bold dark:bg-accent"
                    : "border-input bg-card",
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
              "inline-flex min-h-8 max-md:min-h-11 items-center rounded-sm border px-2.5 text-sm hover:bg-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring",
              draftOnly ? "neon font-bold dark:bg-accent" : "border-input bg-card",
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
    <Button asChild size="lg" className="shrink-0">
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
        <li key={note.id} className={cn("rounded-md border border-t-[6px] bg-card p-3 shadow-hard", TYPE_TONE[note.type])}>
          <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
            <h2 className="min-w-0 break-words font-semibold">
              <Link
                href={`/notes/${note.id}`}
                className="underline-offset-4 hover:underline max-md:inline-block max-md:min-h-11 max-md:py-2.5"
              >
                {note.title}
              </Link>
            </h2>
            <time
              dateTime={note.created_at}
              className="shrink-0 pt-0.5 text-xs font-mono tabular-nums text-muted-foreground max-sm:order-first"
            >
              {formatDateTime(note.created_at)}
            </time>
          </div>
          <div className="mt-1.5 flex flex-wrap gap-1">
            <Badge variant="secondary">{NOTE_TYPE_LABELS[note.type]}</Badge>
            {note.status === "draft" && (
              <Badge variant="outline">Brouillon</Badge>
            )}
            {note.client && note.client_id && (
              <Link href={`/clients/${note.client_id}`} className="rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring max-md:-my-2.5 max-md:py-2.5">
                <Badge variant="outline">{note.client.name}</Badge>
              </Link>
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
