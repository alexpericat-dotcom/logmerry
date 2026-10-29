"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";

import { createPayment, deletePayment, updatePayment } from "@/app/(app)/factures/payment-actions";
import { ConfirmPanel } from "@/components/confirm-panel";
import { FocusOnMount, focusField } from "@/components/form-helpers";
import { PaymentForm } from "@/components/payment-form";
import { Button } from "@/components/ui/button";
import type { PaymentRecord } from "@/lib/db/invoices";
import type { InvoiceAmounts, InvoiceBalance } from "@/lib/domain/payments";
import { centsToInput, formatCents } from "@/lib/domain/quotes";
import { formatDate } from "@/lib/format";

const empty = { amount_ht: "", tax: "", received_on: "", note: "" };

function PaymentRow({ invoiceId, invoice, others, payment, today, onDeleted }: { invoiceId: string; invoice: InvoiceAmounts; others: PaymentRecord[]; payment: PaymentRecord; today: string; onDeleted: () => void }) {
  const [mode, setMode] = useState<"view" | "edit" | "delete">("view");
  const [message, setMessage] = useState<string | undefined>();
  const [pending, start] = useTransition();
  const actionsRef = useRef<HTMLDivElement>(null);
  const wasDeleting = useRef(false);
  const back = useCallback(() => {
    setMode("view");
    setMessage(undefined);
  }, []);

  // Le focus revient sur la rangée d'actions à la fermeture de la confirmation (« Annuler » reçoit le focus à l'ouverture : ConfirmPanel).
  useEffect(() => {
    if (mode !== "delete" && wasDeleting.current) actionsRef.current?.querySelector<HTMLElement>("button")?.focus();
    wasDeleting.current = mode === "delete";
  }, [mode]);

  const remove = () =>
    start(async () => {
      try {
        const r = await deletePayment(payment.id);
        setMessage(r.message);
        if (!r.message) onDeleted(); // la ligne disparaît avec la page rechargée : c'est le parent qui annonce et rend le focus
      } catch {
        setMessage("Opération impossible pour le moment. Rien n'a été modifié. Réessaie.");
      }
    });

  if (mode === "edit") {
    return (
      <li>
        <PaymentForm
          idPrefix={`edit-${payment.id}`}
          action={updatePayment.bind(null, payment.id, invoiceId)}
          initial={{ invoice_id: invoiceId, amount_ht: centsToInput(payment.amount_ht_cents), tax: payment.tax_cents === null ? "" : centsToInput(payment.tax_cents), received_on: payment.received_on, note: payment.note ?? "" }}
          invoice={invoice}
          others={others}
          today={today}
          submitLabel="Enregistrer"
          onDone={back}
          onCancel={back}
        />
      </li>
    );
  }

  const label = `l'encaissement du ${formatDate(payment.received_on)}`;
  return (
    <li className="flex flex-col gap-1 rounded-md border bg-background p-2 text-sm">
      <p>
        <span className="font-mono tabular-nums">{formatDate(payment.received_on)}</span>
        {" · "}
        <span className="font-mono font-semibold tabular-nums">{formatCents(payment.amount_ht_cents)} HT</span>
        <span className="text-muted-foreground">{payment.tax_cents === null ? " · taxe inconnue" : ` · taxe ${formatCents(payment.tax_cents)}`}</span>
      </p>
      {payment.note && <p className="whitespace-pre-line text-muted-foreground">{payment.note}</p>}
      {mode === "view" && (
        <div ref={actionsRef} className="flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="outline" onClick={() => setMode("edit")}>
            Modifier<span className="sr-only"> {label}</span>
          </Button>
          <Button type="button" size="sm" variant="outline" className="text-destructive" onClick={() => setMode("delete")}>
            Supprimer<span className="sr-only"> {label}</span>
          </Button>
        </div>
      )}
      {mode === "delete" && (
        <ConfirmPanel label={`Supprimer ${label}`} question="Supprimer cet encaissement ?" size="compact" confirmLabel="Supprimer" pendingLabel="…" pending={pending} onCancel={back} onConfirm={remove}>
          Cette action est définitive. Le statut de la facture se recalcule.
        </ConfirmPanel>
      )}
      {message && (
        <p role="alert" className="text-destructive">
          {message}
        </p>
      )}
    </li>
  );
}

/** Résumé, liste et saisie des encaissements d'une facture (tout se passe dans sa ligne : décision 4). */
export function InvoicePayments({ invoiceId, invoice, payments, balance, today }: { invoiceId: string; invoice: InvoiceAmounts; payments: PaymentRecord[]; balance: InvoiceBalance; today: string }) {
  const [adding, setAdding] = useState(false);
  const [announce, setAnnounce] = useState("");
  const addRef = useRef<HTMLButtonElement>(null);
  const done = useCallback(() => setAdding(false), []);
  const deleted = useCallback(() => {
    setAnnounce("Encaissement supprimé.");
    // Sans défilement automatique : le navigateur alignerait le bouton tout en haut, sous l'en-tête fixe, où il ne reçoit plus les clics.
    // Formulaire d'ajout ouvert : le bouton n'existe pas, le focus va au premier champ du formulaire (sinon il serait perdu avec la ligne supprimée).
    if (addRef.current) {
      addRef.current.focus({ preventScroll: true });
      addRef.current.scrollIntoView({ block: "center" });
    } else focusField(`new-${invoiceId}-amount_ht`);
  }, [invoiceId]);
  const sorted = [...payments].sort((a, b) => a.received_on.localeCompare(b.received_on) || a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id));
  const sentence = `Encaissé ${formatCents(balance.paidCents)} sur ${formatCents(balance.dueCents)}${balance.basis === "ht" ? " hors taxe" : ""}`;

  return (
    <div className="flex flex-col gap-2">
      <p role="status" className="sr-only">
        {announce}
      </p>
      <p className="text-sm">
        <span className="font-semibold">{sentence}</span>
        {balance.overpaidCents > 0 ? <strong className="text-foreground">{` · trop-perçu de ${formatCents(balance.overpaidCents)}`}</strong> : <span className="text-muted-foreground">{` · reste ${formatCents(balance.remainingCents)}`}</span>}
      </p>
      {balance.basis === "ht" && <p className="text-xs text-muted-foreground">Taxe de la facture à confirmer : le statut se calcule sur le hors taxe.</p>}
      {balance.paymentsMissingTax > 0 && (
        <p className="text-xs text-muted-foreground">
          {balance.paymentsMissingTax > 1 ? `Taxe de ${balance.paymentsMissingTax} encaissements` : "Taxe de l'encaissement"} à confirmer : comptée pour zéro tant qu&apos;elle n&apos;est pas saisie.
        </p>
      )}
      {sorted.length > 0 && (
        <ul className="flex flex-col gap-2" aria-label="Encaissements de la facture">
          {sorted.map((p) => (
            <PaymentRow key={p.id} invoiceId={invoiceId} invoice={invoice} others={payments.filter((o) => o.id !== p.id)} payment={p} today={today} onDeleted={deleted} />
          ))}
        </ul>
      )}
      {adding ? (
        <FocusOnMount>
          <PaymentForm idPrefix={`new-${invoiceId}`} action={createPayment.bind(null, invoiceId)} initial={{ invoice_id: invoiceId, ...empty }} invoice={invoice} others={payments} today={today} submitLabel="Enregistrer l'encaissement" onDone={done} onCancel={done} />
        </FocusOnMount>
      ) : (
        <Button ref={addRef} type="button" size="sm" variant="outline" className="self-start" onClick={() => setAdding(true)}>
          Ajouter un encaissement
        </Button>
      )}
    </div>
  );
}
