"use client";

import Link from "next/link";
import { useActionState } from "react";

import { searchBySense, type SenseState } from "@/app/(app)/notes/sense-actions";
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

  return (
    <section aria-labelledby="sense-title" className="flex max-w-2xl flex-col gap-3 rounded-md border bg-card p-4">
      <h2 id="sense-title" className="text-lg font-semibold">
        Chercher par sens
      </h2>
      <p className="text-sm text-muted-foreground">
        Pose une question : tu vois les passages de tes notes que l&apos;assistant retrouverait. Seules les notes indexées sont cherchées. Ta question est
        envoyée à Mistral AI : n&apos;y mets pas de données réelles de clients.
      </p>
      <form action={action} className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <div className="grid flex-1 gap-2">
          <Label htmlFor="question">Ta question</Label>
          <Input id="question" name="question" required maxLength={SENSE_QUERY_MAX} autoComplete="off" defaultValue={state.question ?? ""} />
        </div>
        <Button type="submit" disabled={pending}>
          {pending ? "Recherche…" : "Chercher"}
        </Button>
      </form>
      <div role="status" aria-live="polite">
        {state.message && <p className="text-sm text-destructive">{state.message}</p>}
        {state.searched && !state.message && state.results.length === 0 && (
          <p className="text-sm">Aucun passage trouvé.</p>
        )}
        {state.results.length > 0 && (
          <p className="text-sm">
            {state.results.length} passage{state.results.length === 1 ? " trouvé" : "s trouvés"}.
          </p>
        )}
      </div>
      {state.results.length > 0 && (
        <ul className="flex flex-col gap-3">
          {state.results.map((r) => (
            <li key={r.chunkId} className="rounded-md border p-3">
              <div className="flex items-start justify-between gap-3">
                <Link href={`/notes/${r.noteId}`} className="min-w-0 break-words font-semibold underline-offset-4 hover:underline">
                  {r.title}
                </Link>
                <span className="shrink-0 text-sm tabular-nums text-muted-foreground">score {formatScore(r.score)}</span>
              </div>
              <p className="mt-1 break-words text-sm text-muted-foreground">{excerpt(r.content, 300)}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
