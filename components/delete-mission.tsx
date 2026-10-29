"use client";

import { deleteMission } from "@/app/(app)/missions/actions";
import { ConfirmDelete } from "@/components/confirm-delete";
import { missionDeletionNotice } from "@/lib/domain/missions";

export function DeleteMission({ id, storyCount = 0, sprintCount = 0 }: { id: string; storyCount?: number; sprintCount?: number }) {
  const notice = missionDeletionNotice(storyCount, sprintCount);
  return (
    <ConfirmDelete askLabel="Supprimer cette mission" question="Supprimer cette mission ?" run={() => deleteMission(id)}>
      Cette action est définitive. La fiche du client n&apos;est pas touchée.
      {notice && <strong className="block text-foreground">{notice}</strong>}
    </ConfirmDelete>
  );
}
