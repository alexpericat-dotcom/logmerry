"use client";

import { useActionState } from "react";

import { setRealisationPublication, type PublicationState } from "@/app/(app)/realisations/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

/** Bloc « Publication » de la page de modification : état actuel et un bouton Publier / Retirer de la publication. */
export function PublicationControl({ id, published, consent, hasStatus = true }: { id: string; published: boolean; consent: boolean; hasStatus?: boolean }) {
  const blocked = !published && (!consent || !hasStatus);
  const [state, action, pending] = useActionState<PublicationState>(() => setRealisationPublication(id, !published), {});
  return (
    <section aria-labelledby="publication-title" className="flex max-w-2xl flex-col gap-3 rounded-lg border p-4">
      <div className="flex flex-wrap items-center gap-3">
        <h2 id="publication-title" className="font-semibold">
          Publication
        </h2>
        <span aria-live="polite">
          <Badge variant={published ? "success" : "outline"}>{published ? "Publiée" : "Non publiée"}</Badge>
        </span>
      </div>
      {blocked && (
        <p id="publication-help" className="text-sm text-muted-foreground">
          {!consent
            ? "Pour publier, coche d'abord l'accord du client dans le formulaire ci-dessus, puis clique sur « Enregistrer les modifications »."
            : "Pour publier, choisis d'abord un statut dans le formulaire ci-dessus, puis clique sur « Enregistrer les modifications »."}
        </p>
      )}
      <form action={action} className="flex flex-col items-start gap-2">
        <Button
          type="submit"
          variant={published ? "outline" : "default"}
          disabled={pending || blocked}
          aria-describedby={blocked ? "publication-help" : undefined}
        >
          {pending ? "Un instant…" : published ? "Retirer de la publication" : "Publier"}
        </Button>
        {state.message && (
          <p role="alert" className="text-sm text-destructive">
            {state.message}
          </p>
        )}
      </form>
    </section>
  );
}
