import { createRealisation } from "@/app/(app)/realisations/actions";
import { PageBanner } from "@/components/page-banner";
import { RealisationForm } from "@/components/realisation-form";

export const metadata = { title: "Nouvelle réalisation · LogMerry" };

export default function NouvelleRealisationPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageBanner title="Nouvelle réalisation" />
      <RealisationForm action={createRealisation} submitLabel="Enregistrer la réalisation" />
    </div>
  );
}
