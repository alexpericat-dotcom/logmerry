"use client";

import { useActionState } from "react";

import { indexAllNotes, type IndexAllState } from "@/app/(app)/parametres/actions";
import { Button } from "@/components/ui/button";

export function IndexAllNotes() {
  const [state, action, pending] = useActionState<IndexAllState>(() => indexAllNotes(), {});
  const done = state.indexed !== undefined;
  return (
    <form action={action} className="flex flex-col items-start gap-3">
      <Button type="submit" disabled={pending}>
        {pending ? "Indexation en cours…" : "Indexer mes notes"}
      </Button>
      <div role="status" aria-live="polite" className="text-sm">
        {state.message && <p className="text-destructive">{state.message}</p>}
        {done && state.indexed === 0 && state.failed === 0 && !state.remaining && (
          <p>Toutes tes notes sont déjà indexées.</p>
        )}
        {done && (state.indexed! > 0 || state.failed! > 0 || !!state.remaining) && (
          <p>
            {state.indexed} indexée{state.indexed === 1 ? "" : "s"}, {state.failed} en échec
            {state.remaining ? `, ${state.remaining} restante${state.remaining === 1 ? "" : "s"} : relance le bouton` : ""}.
          </p>
        )}
      </div>
    </form>
  );
}
