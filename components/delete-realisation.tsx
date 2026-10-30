"use client";

import { deleteRealisation } from "@/app/(app)/realisations/actions";
import { ConfirmDelete } from "@/components/confirm-delete";

export function DeleteRealisation({ id }: { id: string }) {
  return (
    <ConfirmDelete askLabel="Supprimer cette réalisation" question="Supprimer cette réalisation ?" run={() => deleteRealisation(id)}>
      Cette action est définitive.
    </ConfirmDelete>
  );
}
