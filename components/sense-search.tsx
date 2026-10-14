"use client";

import Link from "next/link";
import { Info } from "lucide-react";
import { useActionState, useState } from "react";

import {
  searchBySense,
  type SenseState,
} from "@/app/(app)/notes/sense-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SENSE_QUERY_MAX, formatScore } from "@/lib/domain/matching";
import { excerpt } from "@/lib/domain/notes";

export function SenseSearch() {
  const [state, action, pending] = useActionState<SenseState, FormData>(
    (_prev, formData) => searchBySense(String(formData.get("question") ?? "")),
    { results: [] },
  );

  const [helpOpen, setHelpOpen] = useState(false);

  return (
    <section
      aria-labelledby="sense-title"
      className="flex w-full flex-col gap-1 rounded-md border border-primary/30 bg-primary/10 px-6 py-3"
    >
      {/* Détail masqué : il apparaît au survol, au focus clavier ou au toucher du bouton ; il reste lu par les lecteurs d'écran (aria-describedby). */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <div className="group/help relative flex shrink-0 items-center gap-2">
          <h2 id="sense-title" className="text-base font-semibold">
            Chercher par sens
          </h2>
          <button
            type="button"
            aria-label="Comment ça marche ?"
            aria-expanded={helpOpen}
            aria-controls="sense-help"
            onClick={() => setHelpOpen((v) => !v)}
            className="inline-flex size-6 items-center justify-center rounded-full text-muted-foreground hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
          >
            <Info className="size-4" aria-hidden="true" />
          </button>
          <p
            id="sense-help"
            className={`absolute left-0 top-full z-10 mt-1 max-w-xl rounded-md border bg-popover p-3 text-sm text-popover-foreground shadow-md group-focus-within/help:block group-hover/help:block ${helpOpen ? "block" : "hidden"}`}
          >
            Pose une question : tu vois les passages de tes notes que
            l&apos;assistant retrouverait, par sens (avec un score) et par
            mots-clés. Seules les notes indexées sont cherchées. Ta question est
            envoyée à Mistral AI : n&apos;y mets pas de données réelles de clients.
          </p>
        </div>
        <form action={action} className="flex min-w-64 flex-1 gap-2">
          <Label htmlFor="question" className="sr-only">
            Ta question
          </Label>
          <Input
            id="question"
            name="question"
            required
            maxLength={SENSE_QUERY_MAX}
            autoComplete="off"
            placeholder="Ta question…"
            aria-describedby="sense-help"
            defaultValue={state.question ?? ""}
          />
          <Button type="submit" disabled={pending}>
            {pending ? "Recherche…" : "Chercher"}
          </Button>
        </form>
      </div>

      <div role="status" aria-live="polite" className="empty:sr-only">
        {state.message && (
          <p className="text-sm text-destructive">{state.message}</p>
        )}
        {state.searched && !state.message && state.results.length === 0 && (
          <p className="text-sm">Aucun passage trouvé.</p>
        )}
        {state.results.length > 0 && (
          <p className="text-sm">
            {state.results.length} passage
            {state.results.length === 1 ? " trouvé" : "s trouvés"}.
          </p>
        )}
      </div>
      {state.results.length > 0 && (
        <ul className="flex flex-col gap-3">
          {state.results.map((r) => (
            <li key={r.chunkId} className="rounded-md border p-3">
              <div className="flex items-start justify-between gap-3">
                <Link
                  href={`/notes/${r.noteId}`}
                  className="min-w-0 break-words font-semibold underline-offset-4 hover:underline"
                >
                  {r.title}
                </Link>
                <span className="shrink-0 text-sm font-mono tabular-nums text-muted-foreground">
                  {r.score === null
                    ? "mot-clé"
                    : `score ${formatScore(r.score)}`}
                </span>
              </div>
              <p className="mt-1 break-words text-sm text-muted-foreground">
                {excerpt(r.content, 300)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
