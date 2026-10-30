"use client";

import Link from "next/link";
import { useActionState } from "react";

import type { RealisationFormState } from "@/app/(app)/realisations/actions";
import { ErrorSummary, selectClass, useFormFields } from "@/components/form-helpers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  REALISATION_ORIGINS,
  REALISATION_ORIGIN_LABELS,
  type RealisationInput,
  type RealisationOrigin,
} from "@/lib/domain/realisations";

type Props = {
  action: (state: RealisationFormState, formData: FormData) => Promise<RealisationFormState>;
  initial?: RealisationInput;
  submitLabel: string;
  cancelHref?: string;
};

const EMPTY: RealisationInput = { title: "", description: "", origin: "", client_name: "", client_sector: "", result_figure: "", stack: "" };

export function RealisationForm({ action, initial, submitLabel, cancelHref = "/realisations" }: Props) {
  const [state, formAction, pending] = useActionState<RealisationFormState, FormData>(action, {});
  // Après une erreur, les valeurs renvoyées par l'action l'emportent sur les valeurs initiales.
  const values = state.values ?? initial ?? EMPTY;
  const { field, errorLine } = useFormFields(undefined, state.errors ?? {});

  return (
    <form action={formAction} noValidate className="flex max-w-2xl flex-col gap-6">
      <ErrorSummary errors={state.errors ?? {}} token={state} />
      <div className="grid gap-2">
        <Label htmlFor="title">Titre (obligatoire)</Label>
        <Input {...field("title")} defaultValue={values.title} aria-required="true" autoComplete="off" />
        {errorLine("title")}
      </div>
      <div className="grid gap-2">
        <Label htmlFor="description">Description courte (obligatoire)</Label>
        <Textarea {...field("description")} defaultValue={values.description} aria-required="true" rows={4} />
        {errorLine("description")}
      </div>
      <div className="grid gap-2">
        <Label htmlFor="origin">Origine (obligatoire)</Label>
        <select {...field("origin")} defaultValue={values.origin} aria-required="true" className={selectClass}>
          <option value="" disabled>
            Choisis une origine
          </option>
          {REALISATION_ORIGINS.map((o: RealisationOrigin) => (
            <option key={o} value={o}>
              {REALISATION_ORIGIN_LABELS[o]}
            </option>
          ))}
        </select>
        {errorLine("origin")}
      </div>
      <div className="grid gap-2">
        <Label htmlFor="client_name">Nom du client (facultatif)</Label>
        <Input {...field("client_name")} defaultValue={values.client_name} autoComplete="off" />
        {errorLine("client_name")}
      </div>
      <div className="grid gap-2">
        <Label htmlFor="client_sector">Secteur du client (facultatif)</Label>
        <Input {...field("client_sector")} defaultValue={values.client_sector} autoComplete="off" />
        {errorLine("client_sector")}
      </div>
      <div className="grid gap-2">
        <Label htmlFor="result_figure">Chiffre de résultat (facultatif)</Label>
        <Input {...field("result_figure")} defaultValue={values.result_figure} autoComplete="off" />
        {errorLine("result_figure")}
      </div>
      <div className="grid gap-2">
        <Label htmlFor="stack">Stack, séparée par des virgules (facultatif)</Label>
        <Input {...field("stack")} defaultValue={values.stack} autoComplete="off" />
        {errorLine("stack")}
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
