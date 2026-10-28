"use client";

import Link from "next/link";

import { deleteClientRecord } from "@/app/(app)/clients/actions";
import { ConfirmDelete } from "@/components/confirm-delete";
import { missionsRefusal } from "@/lib/domain/missions";
import { quotesRefusal } from "@/lib/domain/quotes";

export function DeleteClient({ id, noteCount = 0, missionCount = 0, quoteCount = 0 }: { id: string; noteCount?: number; missionCount?: number; quoteCount?: number }) {
  // Une fiche qui a des missions ne se supprime pas : on l'explique avant même de proposer le bouton (la base refuse aussi).
  if (missionCount > 0 || quoteCount > 0) {
    return (
      <p role="note" className="max-w-2xl rounded-md border p-3 text-sm text-muted-foreground">
        {missionCount > 0 ? missionsRefusal(missionCount) : quotesRefusal(quoteCount)}{" "}
        <Link href={`/clients/${id}`} className="text-primary underline underline-offset-4">
          {missionCount > 0 ? "Voir ses missions" : "Voir ses devis"}
        </Link>
        .
      </p>
    );
  }
  return (
    <ConfirmDelete askLabel="Supprimer cette fiche" question="Supprimer cette fiche ?" run={() => deleteClientRecord(id)}>
      Cette action est définitive. Ses contacts seront supprimés aussi.{noteCount > 0 && ` ${noteCount > 1 ? `${noteCount} notes seront conservées, sans lien` : "1 note sera conservée, sans lien"}.`}
    </ConfirmDelete>
  );
}
