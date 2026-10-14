"use client";

import Link from "next/link";
import { useActionState } from "react";

import type { ClientFormState } from "@/app/(app)/clients/actions";
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
};

const selectClass =
  "flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-base shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring md:text-sm";

export function ClientForm({ action, initial, submitLabel }: Props) {
  const [state, formAction, pending] = useActionState<ClientFormState, FormData>(action, {});
  // Après une erreur, les valeurs renvoyées par l'action l'emportent sur les valeurs initiales.
  const values = state.values ?? initial ?? { name: "", status: "prospect", origin: "" };
  const { name: nameError, status: statusError, origin: originError } = state.errors ?? {};

  const field = (id: string, error: string | undefined) => ({
    id,
    name: id,
    "aria-invalid": error ? (true as const) : undefined,
    "aria-describedby": error ? `${id}-error` : undefined,
  });
  const errorLine = (id: string, error: string | undefined) =>
    error && (
      <p id={`${id}-error`} role="alert" className="text-sm text-destructive">
        {error}
      </p>
    );

  return (
    <form action={formAction} noValidate className="flex max-w-2xl flex-col gap-6">
      <div className="grid gap-2">
        <Label htmlFor="name">Nom (obligatoire)</Label>
        <Input {...field("name", nameError)} defaultValue={values.name} aria-required="true" autoComplete="off" />
        {errorLine("name", nameError)}
      </div>
      <div className="grid gap-2">
        <Label htmlFor="status">Statut</Label>
        <select {...field("status", statusError)} defaultValue={values.status} className={selectClass}>
          {CLIENT_STATUSES.map((s: ClientStatus) => (
            <option key={s} value={s}>
              {CLIENT_STATUS_LABELS[s]}
            </option>
          ))}
        </select>
        {errorLine("status", statusError)}
      </div>
      <div className="grid gap-2">
        <Label htmlFor="origin">Origine (obligatoire)</Label>
        <select {...field("origin", originError)} defaultValue={values.origin} aria-required="true" className={selectClass}>
          <option value="" disabled>
            Choisis une origine
          </option>
          {CLIENT_ORIGINS.map((o: ClientOrigin) => (
            <option key={o} value={o}>
              {CLIENT_ORIGIN_LABELS[o]}
            </option>
          ))}
        </select>
        {errorLine("origin", originError)}
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
        <Link href="/clients" className="text-sm underline underline-offset-4">
          Annuler
        </Link>
      </div>
    </form>
  );
}
