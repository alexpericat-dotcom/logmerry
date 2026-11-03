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
  REALISATION_STATUSES,
  REALISATION_STATUS_LABELS,
  type RealisationInput,
  type RealisationOrigin,
  type RealisationStatus,
} from "@/lib/domain/realisations";

type Props = {
  action: (state: RealisationFormState, formData: FormData) => Promise<RealisationFormState>;
  initial?: RealisationInput;
  submitLabel: string;
  cancelHref?: string;
};

const EMPTY: RealisationInput = { title: "", description: "", origin: "", client_name: "", client_sector: "", result_figure: "", link_url: "", client_consent: "", stack: "", status: "", problem: "", tests: "", design_choice: "", validation: "", stack_is_recommended: "" };

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
        <Label htmlFor="status">Statut affiché sur la page publique (obligatoire)</Label>
        {/* Aucune valeur par défaut : sans statut choisi, la réalisation ne peut pas être publiée. */}
        <select {...field("status")} defaultValue={values.status} aria-required="true" className={selectClass}>
          <option value="" disabled>
            Choisis un statut
          </option>
          {REALISATION_STATUSES.map((st: RealisationStatus) => (
            <option key={st} value={st}>
              {REALISATION_STATUS_LABELS[st]}
            </option>
          ))}
        </select>
        {errorLine("status")}
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
        <Label htmlFor="problem">Problème de départ (facultatif)</Label>
        <Textarea {...field("problem")} defaultValue={values.problem} rows={3} />
        {errorLine("problem")}
      </div>
      <div className="grid gap-2">
        <Label htmlFor="tests">Tests (facultatif)</Label>
        <Textarea {...field("tests")} defaultValue={values.tests} rows={3} />
        {errorLine("tests")}
      </div>
      <div className="grid gap-2">
        <Label htmlFor="design_choice">Choix de conception (facultatif)</Label>
        <Textarea {...field("design_choice")} defaultValue={values.design_choice} rows={3} />
        {errorLine("design_choice")}
      </div>
      <div className="grid gap-2">
        <Label htmlFor="validation">Validation (facultatif, distincte du résultat)</Label>
        <Textarea {...field("validation")} defaultValue={values.validation} rows={3} />
        {errorLine("validation")}
      </div>
      <div className="grid gap-2">
        <Label htmlFor="result_figure">Chiffre de résultat (facultatif)</Label>
        <Input {...field("result_figure")} defaultValue={values.result_figure} autoComplete="off" />
        {errorLine("result_figure")}
      </div>
      <div className="grid gap-2">
        <Label htmlFor="link_url">Lien vers la page en ligne, en https:// (facultatif)</Label>
        <Input {...field("link_url")} defaultValue={values.link_url} type="url" inputMode="url" autoComplete="off" />
        {errorLine("link_url")}
      </div>
      <div className="flex items-start gap-3">
        <input
          id="client_consent"
          name="client_consent"
          type="checkbox"
          defaultChecked={values.client_consent === "on"}
          aria-describedby="client_consent-help"
          className="mt-1 size-5 shrink-0 accent-[hsl(var(--primary))] max-md:size-6"
        />
        <div className="grid gap-1">
          <Label htmlFor="client_consent">Le client a donné son accord pour publier cette réalisation</Label>
          <p id="client_consent-help" className="text-sm text-muted-foreground">
            Sans accord, la réalisation ne peut pas être publiée. Décocher l&apos;accord d&apos;une réalisation publiée la retire du portfolio.
          </p>
        </div>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="stack">Stack, séparée par des virgules (facultatif)</Label>
        <Input {...field("stack")} defaultValue={values.stack} autoComplete="off" />
        {errorLine("stack")}
      </div>
      <div className="flex items-start gap-3">
        <input
          id="stack_is_recommended"
          name="stack_is_recommended"
          type="checkbox"
          defaultChecked={values.stack_is_recommended === "on"}
          className="mt-1 size-5 shrink-0 accent-[hsl(var(--primary))] max-md:size-6"
        />
        <Label htmlFor="stack_is_recommended">Cette stack est recommandée, pas utilisée (affichée « Stack recommandée »)</Label>
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
