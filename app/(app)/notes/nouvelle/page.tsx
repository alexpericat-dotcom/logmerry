import { createNote } from "@/app/(app)/notes/actions";
import { PageBanner } from "@/components/page-banner";
import { NoteForm } from "@/components/note-form";

export const metadata = { title: "Nouvelle note · LogMerry" };

export default function NouvelleNotePage() {
  return (
    <div className="flex flex-col gap-6">
      <PageBanner title="Nouvelle note" />
      <NoteForm action={createNote} submitLabel="Enregistrer la note" />
    </div>
  );
}
