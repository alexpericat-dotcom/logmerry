"use client";

import { useActionState, useEffect } from "react";

import type { PaymentFormState } from "@/app/(app)/factures/payment-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { PaymentInput } from "@/lib/domain/payments";
import { submitWith } from "@/lib/submit-with";

export function PaymentForm({
  idPrefix,
  action,
  initial,
  submitLabel,
  onDone,
  onCancel,
}: {
  idPrefix: string;
  action: (state: PaymentFormState, formData: FormData) => Promise<PaymentFormState>;
  initial: PaymentInput;
  submitLabel: string;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [state, formAction, pending] = useActionState<PaymentFormState, FormData>(action, {});
  useEffect(() => {
    if (state.saved) onDone();
  }, [state.saved, onDone]);
  const values = state.values ?? initial;
  const e = state.errors ?? {};
  const id = (name: string) => `${idPrefix}-${name}`;
  const field = (name: keyof PaymentInput) => ({
    id: id(name),
    name,
    "aria-invalid": e[name] ? (true as const) : undefined,
    "aria-describedby": e[name] ? `${id(name)}-error` : undefined,
  });
  const errorLine = (name: keyof PaymentInput) =>
    e[name] && (
      <p id={`${id(name)}-error`} role="alert" className="text-sm text-destructive">
        {e[name]}
      </p>
    );

  return (
    <form
      onSubmit={submitWith(formAction)}
      noValidate
      onKeyDown={(ev) => {
        if (ev.key !== "Escape" || pending) return;
        ev.preventDefault();
        onCancel();
      }}
      className="flex max-w-2xl flex-col gap-4 rounded-md border bg-card p-3"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor={id("amount_ht")}>Montant hors taxe encaissé, en € (obligatoire)</Label>
          <Input {...field("amount_ht")} inputMode="decimal" defaultValue={values.amount_ht} aria-required="true" autoComplete="off" />
          {errorLine("amount_ht")}
        </div>
        <div className="grid gap-2">
          <Label htmlFor={id("tax")}>Taxe encaissée, en € (vide si inconnue)</Label>
          <Input {...field("tax")} inputMode="decimal" defaultValue={values.tax} aria-describedby={e.tax ? `${id("tax")}-error` : id("tax-help")} autoComplete="off" />
          <p id={id("tax-help")} className="text-xs text-muted-foreground">
            Vide veut dire « inconnue », pas 0. Elle n&apos;est jamais répartie automatiquement.
          </p>
          {errorLine("tax")}
        </div>
        <div className="grid gap-2">
          <Label htmlFor={id("received_on")}>Date d&apos;encaissement (obligatoire)</Label>
          <Input {...field("received_on")} type="date" defaultValue={values.received_on} aria-required="true" />
          {errorLine("received_on")}
        </div>
        <div className="grid gap-2 sm:col-span-2">
          <Label htmlFor={id("note")}>Remarque</Label>
          <Textarea {...field("note")} defaultValue={values.note} rows={2} />
          {errorLine("note")}
        </div>
      </div>
      {e.invoice_id && (
        <p role="alert" className="text-sm text-destructive">
          {e.invoice_id}
        </p>
      )}
      {state.message && (
        <p role="alert" className="text-sm text-destructive">
          {state.message}
        </p>
      )}
      <div className="flex items-center gap-3">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Enregistrement…" : submitLabel}
        </Button>
        <Button type="button" variant="outline" size="sm" disabled={pending} onClick={onCancel}>
          Annuler
        </Button>
      </div>
    </form>
  );
}
