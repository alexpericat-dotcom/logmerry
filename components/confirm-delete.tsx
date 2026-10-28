"use client";

import { useActionState, useEffect, useRef, useState, type ReactNode } from "react";

import { ConfirmPanel } from "@/components/confirm-panel";
import { Button } from "@/components/ui/button";

/**
 * Bouton « Supprimer … » d'une page de détail qui ouvre sa confirmation : le focus passe à « Annuler » à l'ouverture et revient au bouton à la fermeture.
 * `run` appelle la Server Action ; en cas de réussite elle redirige, en cas d'échec elle renvoie `{ message }`, affiché sous le bouton ou dans la confirmation.
 */
export function ConfirmDelete({ askLabel, question, children, run }: { askLabel: string; question: string; children?: ReactNode; run: () => Promise<{ message?: string }> }) {
  const [confirming, setConfirming] = useState(false);
  const [state, action, pending] = useActionState<{ message?: string }>(() => run(), {});
  const askRef = useRef<HTMLButtonElement>(null);
  const wasConfirming = useRef(false);
  useEffect(() => {
    if (!confirming && wasConfirming.current) askRef.current?.focus();
    wasConfirming.current = confirming;
  }, [confirming]);

  if (!confirming) {
    return (
      <div className="flex flex-col gap-2">
        <Button ref={askRef} type="button" variant="outline" className="self-start text-destructive" onClick={() => setConfirming(true)}>
          {askLabel}
        </Button>
        {state.message && (
          <p role="alert" className="text-sm text-destructive">
            {state.message}
          </p>
        )}
      </div>
    );
  }
  return (
    <ConfirmPanel label={question} question={question} action={action} pending={pending} error={state.message} onCancel={() => setConfirming(false)}>
      {children}
    </ConfirmPanel>
  );
}
