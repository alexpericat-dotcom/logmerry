import { notFound } from "next/navigation";
import { Suspense } from "react";

import { updateRealisation } from "@/app/(app)/realisations/actions";
import { DeleteRealisation } from "@/components/delete-realisation";
import { PageBanner } from "@/components/page-banner";
import { RealisationForm } from "@/components/realisation-form";
import { getRealisation } from "@/lib/db/realisations";
import { isUuid } from "@/lib/domain/notes";

export const metadata = { title: "Modifier la réalisation · LogMerry" };

async function EditRealisation({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const r = await getRealisation(id);
  if (!r) notFound();

  return (
    <div className="flex flex-col gap-6">
      <PageBanner title="Modifier la réalisation" />
      <RealisationForm
        key={r.updated_at}
        action={updateRealisation.bind(null, id)}
        initial={{
          title: r.title,
          description: r.description,
          origin: r.origin,
          client_name: r.client_name ?? "",
          client_sector: r.client_sector ?? "",
          result_figure: r.result_figure ?? "",
          link_url: r.link_url ?? "",
          stack: r.stack.join(", "),
        }}
        submitLabel="Enregistrer les modifications"
      />
      <DeleteRealisation id={id} />
    </div>
  );
}

export default function EditRealisationPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<p className="text-muted-foreground">Chargement…</p>}>
      <EditRealisation params={params} />
    </Suspense>
  );
}
