"use client";

import { deleteMission } from "@/app/(app)/missions/actions";
import { ConfirmDelete } from "@/components/confirm-delete";

export function DeleteMission({ id, storyCount = 0 }: { id: string; storyCount?: number }) {
  return (
    <ConfirmDelete askLabel="Supprimer cette mission" question="Supprimer cette mission ?" run={() => deleteMission(id)}>
      Cette action est définitive. La fiche du client n&apos;est pas touchée.
      {storyCount > 0 && <strong className="block text-foreground">Son backlog sera supprimé aussi : {storyCount} user {storyCount > 1 ? "stories" : "story"}.</strong>}
    </ConfirmDelete>
  );
}
