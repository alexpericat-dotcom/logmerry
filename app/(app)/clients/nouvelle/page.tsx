import { createClientRecord } from "@/app/(app)/clients/actions";
import { ClientForm } from "@/components/client-form";
import { PageBanner } from "@/components/page-banner";

export const metadata = { title: "Nouvelle fiche · LogMerry" };

export default function NouvelleFichePage() {
  return (
    <div className="flex flex-col gap-6">
      <PageBanner title="Nouvelle fiche" />
      <ClientForm action={createClientRecord} submitLabel="Enregistrer la fiche" />
    </div>
  );
}
