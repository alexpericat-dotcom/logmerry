"use client";

import { useCallback, useState } from "react";

import { createInvoice } from "@/app/(app)/factures/actions";
import { InvoiceForm, type MissionChoice, type QuoteChoice } from "@/components/invoice-form";
import { InvoiceRow } from "@/components/invoice-row";
import { Button } from "@/components/ui/button";
import type { InvoiceRecord } from "@/lib/db/invoices";
import { INVOICE_NOT_LEGAL } from "@/lib/domain/invoices";

/** Liste de factures avec « Nouvelle facture » (page Factures, et fiche d'une mission avec `missionId` préremplie). */
export function InvoicesPanel({
  invoices,
  missions,
  quotes,
  today,
  missionId = "",
  emptyText,
}: {
  invoices: InvoiceRecord[];
  missions: MissionChoice[];
  quotes: QuoteChoice[];
  today: string;
  missionId?: string;
  emptyText: string;
}) {
  const [creating, setCreating] = useState(false);
  const done = useCallback(() => setCreating(false), []);
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">{INVOICE_NOT_LEGAL}</p>
      {creating ? (
        <InvoiceForm
          idPrefix={`new-${missionId || "all"}`}
          action={createInvoice}
          initial={{ mission_id: missionId, quote_id: "", amount_ht: "", tax: "", due_on: "", issued_on: "", reference: "", note: "" }}
          missions={missions}
          quotes={quotes}
          submitLabel="Créer la facture"
          onDone={done}
          onCancel={done}
        />
      ) : (
        <Button type="button" size="sm" className="self-start" disabled={missions.length === 0} onClick={() => setCreating(true)}>
          Nouvelle facture
        </Button>
      )}
      {missions.length === 0 && <p className="text-sm text-muted-foreground">Crée d&apos;abord une mission : une facture se rattache toujours à une mission.</p>}
      {invoices.length === 0 ? (
        <p className="text-muted-foreground">{emptyText}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {invoices.map((i) => (
            <InvoiceRow key={i.id} invoice={i} missions={missions} quotes={quotes} today={today} />
          ))}
        </ul>
      )}
    </div>
  );
}
