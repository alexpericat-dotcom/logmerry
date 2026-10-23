"use client";

import { AlertTriangle, CircleCheck, CircleDashed, CircleDot } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";

import { deleteInvoice, updateInvoice } from "@/app/(app)/factures/actions";
import { InvoiceForm, type MissionChoice, type QuoteChoice } from "@/components/invoice-form";
import { InvoicePayments } from "@/components/invoice-payments";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { InvoiceRecord } from "@/lib/db/invoices";
import { daysLate, isOverdue } from "@/lib/domain/invoices";
import { INVOICE_STATUS_LABELS, invoiceBalance, type InvoiceStatus } from "@/lib/domain/payments";
import { centsToInput, formatCents, totalCents } from "@/lib/domain/quotes";
import { formatDate } from "@/lib/format";

const STATUS_BADGE = {
  unpaid: { icon: CircleDashed, variant: "outline" },
  partial: { icon: CircleDot, variant: "secondary" },
  paid: { icon: CircleCheck, variant: "success" },
} as const satisfies Record<InvoiceStatus, { icon: unknown; variant: "outline" | "secondary" | "success" }>;

export function InvoiceRow({
  invoice,
  missions,
  quotes,
  today,
  lockedMissionId,
  onDeleted,
}: {
  invoice: InvoiceRecord;
  missions: MissionChoice[];
  quotes: QuoteChoice[];
  today: string;
  lockedMissionId?: string;
  onDeleted: (title: string) => void;
}) {
  const [mode, setMode] = useState<"view" | "edit" | "delete">("view");
  const [message, setMessage] = useState<string | undefined>();
  const [pending, start] = useTransition();
  const total = totalCents(invoice);
  const balance = invoiceBalance(invoice, invoice.payments);
  const late = isOverdue(invoice.due_on, today, balance.status);
  const StatusIcon = STATUS_BADGE[balance.status].icon;
  const days = daysLate(invoice.due_on, today);
  const title = invoice.reference ?? invoice.mission?.title ?? "Facture";

  const back = () => {
    setMode("view");
    setMessage(undefined);
  };
  const remove = () =>
    start(async () => {
      try {
        const r = await deleteInvoice(invoice.id);
        setMessage(r.message);
        if (!r.message) onDeleted(title); // la ligne disparaît avec la page rechargée : c'est le panneau qui annonce et rend le focus
      } catch {
        setMessage("Opération impossible pour le moment. Rien n'a été modifié. Réessaie.");
      }
    });

  // Le focus suit le panneau : sur « Annuler » (le choix sûr) à l'ouverture, sur la rangée d'actions à la fermeture.
  const panelRef = useRef<HTMLDivElement>(null);
  const actionsRef = useRef<HTMLDivElement>(null);
  const wasOpen = useRef(false);
  useEffect(() => {
    const open = mode === "delete";
    if (open) [...(panelRef.current?.querySelectorAll<HTMLElement>("button") ?? [])].at(-1)?.focus();
    else if (wasOpen.current) actionsRef.current?.querySelector<HTMLElement>("button")?.focus();
    wasOpen.current = open;
  }, [mode]);

  if (mode === "edit") {
    return (
      <li>
        <InvoiceForm
          idPrefix={`edit-${invoice.id}`}
          action={updateInvoice.bind(null, invoice.id)}
          initial={{
            mission_id: invoice.mission_id,
            quote_id: invoice.quote_id ?? "",
            amount_ht: centsToInput(invoice.amount_ht_cents),
            tax: invoice.tax_cents === null ? "" : centsToInput(invoice.tax_cents),
            due_on: invoice.due_on,
            issued_on: invoice.issued_on ?? "",
            reference: invoice.reference ?? "",
            note: invoice.note ?? "",
          }}
          missions={missions}
          quotes={quotes}
          lockedMissionId={lockedMissionId}
          submitLabel="Enregistrer"
          onDone={back}
          onCancel={back}
        />
      </li>
    );
  }

  return (
    <li className="flex flex-col gap-2 rounded-md border bg-card p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-semibold">{title}</span>
        <Badge variant={STATUS_BADGE[balance.status].variant}>
          <StatusIcon size={11} aria-hidden="true" />
          {INVOICE_STATUS_LABELS[balance.status]}
        </Badge>
        {late && (
          <Badge variant="warning">
            <AlertTriangle size={11} aria-hidden="true" />
            Échue
          </Badge>
        )}
      </div>
      <p className="text-sm">
        <span className="font-mono font-semibold tabular-nums">{formatCents(invoice.amount_ht_cents)} HT</span>
        <span className="text-muted-foreground">
          {" · "}
          {total === null ? "taxe à confirmer" : `${formatCents(total)} TTC`}
        </span>
      </p>
      <p className="text-sm text-muted-foreground">
        Échéance le <span className="font-mono tabular-nums">{formatDate(invoice.due_on)}</span>
        {late && <strong className="text-foreground">{`, en retard de ${days} jour${days > 1 ? "s" : ""}`}</strong>}
        {invoice.issued_on && (
          <>
            {" · émise le "}
            <span className="font-mono tabular-nums">{formatDate(invoice.issued_on)}</span>
          </>
        )}
      </p>
      {invoice.mission && (
        <p className="text-sm">
          <Link href={`/missions/${invoice.mission_id}`} className="underline underline-offset-4">
            {invoice.mission.title}
          </Link>
          {invoice.mission.client && (
            <>
              {" · "}
              <Link href={`/clients/${invoice.mission.client_id}`} className="underline underline-offset-4">
                {invoice.mission.client.name}
              </Link>
            </>
          )}
        </p>
      )}
      {invoice.note && <p className="whitespace-pre-line text-sm text-muted-foreground">{invoice.note}</p>}
      <InvoicePayments invoiceId={invoice.id} invoice={invoice} payments={invoice.payments} balance={balance} />

      {mode === "view" && (
        <div ref={actionsRef} className="flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="outline" onClick={() => setMode("edit")}>
            Modifier<span className="sr-only"> la facture {title}</span>
          </Button>
          <Button type="button" size="sm" variant="outline" className="text-destructive" onClick={() => setMode("delete")}>
            Supprimer<span className="sr-only"> la facture {title}</span>
          </Button>
        </div>
      )}
      {mode === "delete" && (
        <div
          ref={panelRef}
          role="group"
          aria-label={`Supprimer la facture ${title}`}
          onKeyDown={(ev) => {
            if (ev.key !== "Escape" || pending) return;
            ev.preventDefault();
            back();
          }}
          className="flex max-w-2xl flex-col gap-3 rounded-md border border-destructive p-3"
        >
          <p className="font-semibold">Supprimer cette facture ?</p>
          <p className="text-sm text-muted-foreground">Cette action est définitive. La mission et le devis ne sont pas touchés.</p>
          <div className="flex gap-3">
            <Button type="button" size="sm" variant="destructive" disabled={pending} onClick={remove}>
              {pending ? "…" : "Supprimer"}
            </Button>
            <Button type="button" size="sm" variant="outline" disabled={pending} onClick={back}>
              Annuler
            </Button>
          </div>
        </div>
      )}
      {message && (
        <p role="alert" className="text-sm text-destructive">
          {message}
        </p>
      )}
    </li>
  );
}
