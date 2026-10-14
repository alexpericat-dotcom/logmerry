import { notFound } from "next/navigation";
import { Suspense } from "react";

import { updateClientRecord } from "@/app/(app)/clients/actions";
import { ClientForm } from "@/components/client-form";
import { ContactsSection } from "@/components/contacts-section";
import { DeleteClient } from "@/components/delete-client";
import { PageBanner } from "@/components/page-banner";
import { PromoteClient } from "@/components/promote-client";
import { getClientRecord } from "@/lib/db/clients";
import { listContacts } from "@/lib/db/contacts";
import { isUuid } from "@/lib/domain/notes";
import { formatDateTime } from "@/lib/format";

export const metadata = { title: "Modifier la fiche · LogMerry" };

async function EditClient({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const client = await getClientRecord(id);
  if (!client) notFound();
  const contacts = await listContacts(id);

  return (
    <div className="flex flex-col gap-6">
      <PageBanner
        title="Modifier la fiche"
        actions={
          client.status === "prospect" ? <PromoteClient id={id} /> : undefined
        }
      />
      <p className="font-mono text-xs tabular-nums text-muted-foreground">
        Dernière modification : {formatDateTime(client.updated_at)}
      </p>
      <ClientForm
        key={`${client.status}-${client.updated_at}`}
        action={updateClientRecord.bind(null, id)}
        initial={{
          name: client.name,
          status: client.status,
          origin: client.origin,
        }}
        submitLabel="Enregistrer les modifications"
      />
      <ContactsSection clientId={id} contacts={contacts} />
      <DeleteClient id={id} />
    </div>
  );
}

export default function ClientPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense fallback={<p className="text-muted-foreground">Chargement…</p>}>
      <EditClient params={params} />
    </Suspense>
  );
}
