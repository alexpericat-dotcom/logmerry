"use client";

import { deleteNote } from "@/app/(app)/notes/actions";
import { ConfirmDelete } from "@/components/confirm-delete";
import { NO_NOTES_FILTER, type NotesListFilter } from "@/lib/domain/notes";

export function DeleteNote({ id, listFilter = NO_NOTES_FILTER }: { id: string; listFilter?: NotesListFilter }) {
  return (
    <ConfirmDelete askLabel="Supprimer cette note" question="Supprimer cette note ?" run={() => deleteNote(id, listFilter)}>
      Cette action est définitive.
    </ConfirmDelete>
  );
}
