import { notFound } from "next/navigation";
import { Suspense } from "react";

import { ClientCard } from "@/components/client-card";
import { ContactsSection } from "@/components/contacts-section";
import { PageBanner } from "@/components/page-banner";
import { PromoteClient } from "@/components/promote-client";
import { getClientRecord } from "@/lib/db/clients";
import { listContacts } from "@/lib/db/contacts";
import { isUuid } from "@/lib/domain/notes";

export const metadata = { title: "Fiche · LogMerry" };

async function ClientView({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const client = await getClientRecord(id);
  if (!client) notFound();
  const contacts = await listContacts(id);

  return (
    <div className="flex flex-col gap-6">
      <PageBanner title={client.status === "client" ? "Fiche client" : "Fiche prospect"} actions={client.status === "prospect" ? <PromoteClient id={id} /> : undefined} />
      <ClientCard client={client} />
      <ContactsSection clientId={id} clientName={client.name} contacts={contacts} />
    </div>
  );
}

export default function ClientPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<p className="text-muted-foreground">Chargement…</p>}>
      <ClientView params={params} />
    </Suspense>
  );
}
