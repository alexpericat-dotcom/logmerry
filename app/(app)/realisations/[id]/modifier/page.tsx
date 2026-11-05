import { notFound } from "next/navigation";
import { Suspense } from "react";

import { updateRealisation } from "@/app/(app)/realisations/actions";
import { RealisationImages } from "@/components/realisation-images";
import { PublicationControl } from "@/components/publication-control";
import { DeleteRealisation } from "@/components/delete-realisation";
import { PageBanner } from "@/components/page-banner";
import { RealisationForm } from "@/components/realisation-form";
import { listRealisationImages } from "@/lib/db/realisation-images";
import { getRealisation } from "@/lib/db/realisations";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/domain/notes";

export const metadata = { title: "Modifier la réalisation · LogMerry" };

async function EditRealisation({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const r = await getRealisation(id);
  if (!r) notFound();
  const supabase = await createClient();
  const [images, claims] = await Promise.all([listRealisationImages(id), supabase.auth.getClaims()]);
  const ownerId = claims.data?.claims?.sub;

  return (
    <div className="flex flex-col gap-6">
      <PageBanner title="Modifier la réalisation" />
      {r.published && (
        <p role="note" className="max-w-2xl rounded-md border p-3 text-sm">
          Cette réalisation est publiée. Enregistrer une modification la remet « non publiée » : tu la republieras ensuite avec le bouton « Publier » en bas de page.
        </p>
      )}
      <RealisationForm
        // La clé suit le contenu enregistré, pas `updated_at` : publier ou retirer (qui le modifie) ne doit pas effacer une saisie en cours.
        key={[r.title, r.description, r.origin, r.client_name, r.client_sector, r.result_figure, r.link_url, r.client_consent, r.stack.join("|")].join("\u0001")}
        action={updateRealisation.bind(null, id)}
        initial={{
          title: r.title,
          description: r.description,
          origin: r.origin,
          client_name: r.client_name ?? "",
          client_sector: r.client_sector ?? "",
          result_figure: r.result_figure ?? "",
          link_url: r.link_url ?? "",
          client_consent: r.client_consent ? "on" : "",
          stack: r.stack.join(", "),
        }}
        submitLabel="Enregistrer les modifications"
      />
      {ownerId && <RealisationImages realisationId={id} ownerId={ownerId} supabaseUrl={process.env.NEXT_PUBLIC_SUPABASE_URL!} images={images} />}
      <PublicationControl id={id} published={r.published} consent={r.client_consent} />
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
