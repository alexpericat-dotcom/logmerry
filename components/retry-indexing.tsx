"use client";

import { useActionState } from "react";

import { retryIndexing, type RetryState } from "@/app/(app)/notes/actions";
import { Button } from "@/components/ui/button";

export function RetryIndexing({ id, failed }: { id: string; failed: boolean }) {
  const [state, action, pending] = useActionState<RetryState>(() => retryIndexing(id), {});
  return (
    <form action={action} className="flex flex-col items-start gap-2">
      <Button type="submit" variant="outline" disabled={pending}>
        {pending ? "Indexation en cours…" : failed ? "Réessayer l'indexation" : "Indexer maintenant"}
      </Button>
      {state.message && (
        <p role="alert" className="text-sm text-destructive">
          {state.message}
        </p>
      )}
    </form>
  );
}
