"use client";

import { useActionState, useEffect, useRef, useState } from "react";

import { deleteMission, type DeleteMissionState } from "@/app/(app)/missions/actions";
import { Button } from "@/components/ui/button";

export function DeleteMission({ id }: { id: string }) {
  const [confirming, setConfirming] = useState(false);
  const [state, action, pending] = useActionState<DeleteMissionState>(() => deleteMission(id), {});
  const askRef = useRef<HTMLButtonElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  // Le focus suit la confirmation : sur « Annuler » à l'ouverture, sur « Supprimer » à la fermeture.
  const wasConfirming = useRef(false);
  useEffect(() => {
    if (confirming) cancelRef.current?.focus();
    else if (wasConfirming.current) askRef.current?.focus();
    wasConfirming.current = confirming;
  }, [confirming]);

  const message = state.message && (
    <p role="alert" className="text-sm text-destructive">
      {state.message}
    </p>
  );

  if (!confirming) {
    return (
      <div className="flex flex-col gap-2">
        <Button ref={askRef} type="button" variant="outline" className="self-start text-destructive" onClick={() => setConfirming(true)}>
          Supprimer cette mission
        </Button>
        {message}
      </div>
    );
  }

  return (
    <form
      action={action}
      role="group"
      aria-labelledby="delete-question"
      onKeyDown={(e) => {
        if (e.key !== "Escape" || pending) return;
        e.preventDefault(); // la confirmation prend la touche : le panneau de l'assistant reste ouvert
        setConfirming(false);
      }}
      className="flex max-w-2xl flex-col gap-3 rounded-md border border-destructive p-3"
    >
      <p id="delete-question" className="font-semibold">
        Supprimer cette mission ?
      </p>
      <p className="text-sm text-muted-foreground">Cette action est définitive. La fiche du client n&apos;est pas touchée.</p>
      {message}
      <div className="flex gap-3">
        <Button type="submit" variant="destructive" disabled={pending}>
          {pending ? "Suppression…" : "Oui, supprimer"}
        </Button>
        <Button ref={cancelRef} type="button" variant="outline" disabled={pending} onClick={() => setConfirming(false)}>
          Annuler
        </Button>
      </div>
    </form>
  );
}
