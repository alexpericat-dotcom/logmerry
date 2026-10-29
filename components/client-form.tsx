"use client";

import Link from "next/link";
import { useActionState } from "react";

import type { ClientFormState } from "@/app/(app)/clients/actions";
import { ErrorSummary, selectClass, useFormFields } from "@/components/form-helpers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  CLIENT_ORIGINS,
  CLIENT_ORIGIN_LABELS,
  CLIENT_STATUSES,
  CLIENT_STATUS_LABELS,
  type ClientOrigin,
  type ClientStatus,
} from "@/lib/domain/clients";

type Props = {
  action: (state: ClientFormState, formData: FormData) => Promise<ClientFormState>;
  initial?: { name: string; status: string; origin: string };
  submitLabel: string;
  /** Lien du bouton « Annuler » (la liste par défaut). */
  cancelHref?: string;
};


export function ClientForm({ action, initial, submitLabel, cancelHref = "/clients" }: Props) {
  const [state, formAction, pending] = useActionState<ClientFormState, FormData>(action, {});
  // Après une erreur, les valeurs renvoyées par l'action l'emportent sur les valeurs initiales.
  const values = state.values ?? initial ?? { name: "", status: "prospect", origin: "" };

  const { field, errorLine } = useFormFields(undefined, state.errors ?? {});

  return (
    <form action={formAction} noValidate className="flex max-w-2xl flex-col gap-6">
      <ErrorSummary errors={state.errors ?? {}} token={state} />
      <div className="grid gap-2">
        <Label htmlFor="name">Nom (obligatoire)</Label>
        <Input {...field("name")} defaultValue={values.name} aria-required="true" autoComplete="off" />
        {errorLine("name")}
      </div>
      <div className="grid gap-2">
        <Label htmlFor="status">Statut</Label>
        <select {...field("status")} defaultValue={values.status} className={selectClass}>
          {CLIENT_STATUSES.map((s: ClientStatus) => (
            <option key={s} value={s}>
              {CLIENT_STATUS_LABELS[s]}
            </option>
          ))}
        </select>
        {errorLine("status")}
      </div>
      <div className="grid gap-2">
        <Label htmlFor="origin">Origine (obligatoire)</Label>
        <select {...field("origin")} defaultValue={values.origin} aria-required="true" className={selectClass}>
          <option value="" disabled>
            Choisis une origine
          </option>
          {CLIENT_ORIGINS.map((o: ClientOrigin) => (
            <option key={o} value={o}>
              {CLIENT_ORIGIN_LABELS[o]}
            </option>
          ))}
        </select>
        {errorLine("origin")}
      </div>
      {state.message && (
        <p role="alert" className="text-sm text-destructive">
          {state.message}
        </p>
      )}
      <div className="flex items-center gap-4">
        <Button type="submit" disabled={pending}>
          {pending ? "Enregistrement…" : submitLabel}
        </Button>
        <Link href={cancelHref} className="text-sm underline underline-offset-4 max-md:inline-flex max-md:min-h-11 max-md:items-center">
          Annuler
        </Link>
      </div>
    </form>
  );
}
