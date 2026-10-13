import { NoteForm } from "@/components/note-form";

export const metadata = { title: "Nouvelle note · LogMerry" };

export default function NouvelleNotePage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-bold">Nouvelle note</h1>
      <NoteForm />
    </div>
  );
}
