"use client";

import { useActionState } from "react";

import {
  promoteToClient,
  type PromoteState,
} from "@/app/(app)/clients/actions";
import { Button } from "@/components/ui/button";

/** « Passer en client » : un clic, les contacts restent. Affiché seulement sur une fiche prospect. */
export function PromoteClient({ id }: { id: string }) {
  const [state, action, pending] = useActionState<PromoteState>(
    () => promoteToClient(id),
    {},
  );
  return (
    <form action={action} className="flex flex-col items-end gap-1">
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Changement…" : "Passer en client"}
      </Button>
      {state.message && (
        <p
          role="alert"
          className="rounded-md bg-background/90 px-2 py-1 text-sm text-destructive"
        >
          {state.message}
        </p>
      )}
    </form>
  );
}
