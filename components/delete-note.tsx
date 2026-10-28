"use client";

import { deleteNote } from "@/app/(app)/notes/actions";
import { ConfirmDelete } from "@/components/confirm-delete";

export function DeleteNote({ id }: { id: string }) {
  return (
    <ConfirmDelete askLabel="Supprimer cette note" question="Supprimer cette note ?" run={() => deleteNote(id)}>
      Cette action est définitive.
    </ConfirmDelete>
  );
}
