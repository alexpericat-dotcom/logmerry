"use client";

import { useActionState, useEffect, useState } from "react";

import type { InvoiceFormState } from "@/app/(app)/factures/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { linkableQuotes, type InvoiceInput } from "@/lib/domain/invoices";
import { formatCents } from "@/lib/domain/quotes";
import { formatDate } from "@/lib/format";
import { submitWith } from "@/lib/submit-with";

export type MissionChoice = { id: string; title: string; client_id: string; client_name: string };
export type QuoteChoice = { id: string; client_id: string; amount_ht_cents: number; sent_on: string | null; status: string };

const selectClass =
  "flex h-9 truncate w-full rounded-md border border-input bg-background px-3 py-1 text-base shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring max-md:h-11 md:text-sm";

export function InvoiceForm({
  idPrefix,
  action,
  initial,
  missions,
  quotes,
  submitLabel,
  onDone,
  onCancel,
}: {
  idPrefix: string;
  action: (state: InvoiceFormState, formData: FormData) => Promise<InvoiceFormState>;
  initial: InvoiceInput;
  missions: MissionChoice[];
  quotes: QuoteChoice[];
  submitLabel: string;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [state, formAction, pending] = useActionState<InvoiceFormState, FormData>(action, {});
  useEffect(() => {
    if (state.saved) onDone();
  }, [state.saved, onDone]);
  const values = state.values ?? initial;
  const e = state.errors ?? {};
  // Le devis proposé dépend de la mission choisie : ces deux menus sont contrôlés (React 19 vide un formulaire après une action).
  const [missionId, setMissionId] = useState(values.mission_id);
  const [quoteId, setQuoteId] = useState(values.quote_id);
  const [more, setMore] = useState(!!(values.issued_on || values.reference || values.note));
  const showMore = more || !!(e.issued_on || e.reference || e.note); // une erreur ne reste jamais cachée
  const clientId = missions.find((m) => m.id === missionId)?.client_id;
  const options = clientId ? linkableQuotes(quotes, clientId) : [];
  const id = (name: string) => `${idPrefix}-${name}`;
  const field = (name: keyof InvoiceInput) => ({
    id: id(name),
    name,
    "aria-invalid": e[name] ? (true as const) : undefined,
    "aria-describedby": e[name] ? `${id(name)}-error` : undefined,
  });
  const errorLine = (name: keyof InvoiceInput) =>
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
        <div className="grid gap-2 sm:col-span-2">
          <Label htmlFor={id("mission_id")}>Mission (obligatoire)</Label>
          <select
            {...field("mission_id")}
            value={missionId}
            aria-required="true"
            onChange={(ev) => {
              setMissionId(ev.target.value);
              setQuoteId(""); // le devis d'une autre mission n'a plus lieu d'être
            }}
            className={selectClass}
          >
            <option value="">Choisir une mission</option>
            {missions.map((m) => (
              <option key={m.id} value={m.id}>
                {m.title}
                {m.client_name && ` — ${m.client_name}`}
              </option>
            ))}
          </select>
          {errorLine("mission_id")}
        </div>
        <div className="grid gap-2">
          <Label htmlFor={id("amount_ht")}>Montant hors taxe, en € (obligatoire)</Label>
          <Input {...field("amount_ht")} inputMode="decimal" defaultValue={values.amount_ht} aria-required="true" autoComplete="off" />
          {errorLine("amount_ht")}
        </div>
        <div className="grid gap-2">
          <Label htmlFor={id("tax")}>Taxe, en € (vide si inconnue)</Label>
          <Input {...field("tax")} inputMode="decimal" defaultValue={values.tax} aria-describedby={e.tax ? `${id("tax")}-error` : id("tax-help")} autoComplete="off" />
          <p id={id("tax-help")} className="text-xs text-muted-foreground">
            Vide veut dire « inconnue », pas 0.
          </p>
          {errorLine("tax")}
        </div>
        <div className="grid gap-2">
          <Label htmlFor={id("due_on")}>Date d&apos;échéance (obligatoire)</Label>
          <Input {...field("due_on")} type="date" defaultValue={values.due_on} aria-required="true" />
          {errorLine("due_on")}
        </div>
        <div className="grid gap-2">
          <Label htmlFor={id("quote_id")}>Devis d&apos;origine (facultatif)</Label>
          <select {...field("quote_id")} value={quoteId} onChange={(ev) => setQuoteId(ev.target.value)} className={selectClass}>
            <option value="">Aucun</option>
            {quoteId && !options.some((q) => q.id === quoteId) && <option value={quoteId}>Devis déjà lié</option>}
            {options.map((q) => (
              <option key={q.id} value={q.id}>
                {formatCents(q.amount_ht_cents)} HT{q.sent_on && `, envoyé le ${formatDate(q.sent_on)}`}
              </option>
            ))}
          </select>
          {errorLine("quote_id")}
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <Button type="button" variant="outline" size="sm" className="self-start" aria-expanded={showMore} aria-controls={id("more")} onClick={() => setMore((v) => !v)}>
          Plus de champs
        </Button>
        <div id={id("more")} className={showMore ? "grid gap-4 sm:grid-cols-2" : "hidden"}>
          <div className="grid gap-2">
            <Label htmlFor={id("issued_on")}>Date d&apos;émission</Label>
            <Input {...field("issued_on")} type="date" defaultValue={values.issued_on} />
            {errorLine("issued_on")}
          </div>
          <div className="grid gap-2">
            <Label htmlFor={id("reference")}>Référence (ton numéro de facture)</Label>
            <Input {...field("reference")} defaultValue={values.reference} autoComplete="off" />
            {errorLine("reference")}
          </div>
          <div className="grid gap-2 sm:col-span-2">
            <Label htmlFor={id("note")}>Remarque</Label>
            <Textarea {...field("note")} defaultValue={values.note} rows={3} />
            {errorLine("note")}
          </div>
        </div>
      </div>

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
