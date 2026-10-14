"use client";

import { useActionState, useEffect } from "react";

import type { ContactFormState } from "@/app/(app)/clients/contact-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Values = {
  name: string;
  job_title: string;
  email: string;
  phone: string;
  address: string;
};

type Props = {
  /** Préfixe des identifiants : plusieurs formulaires (ajout, modification) peuvent coexister sur la page. */
  idPrefix: string;
  action: (
    state: ContactFormState,
    formData: FormData,
  ) => Promise<ContactFormState>;
  initial?: Values;
  submitLabel: string;
  onDone: () => void;
  onCancel: () => void;
};

const EMPTY: Values = {
  name: "",
  job_title: "",
  email: "",
  phone: "",
  address: "",
};

export function ContactForm({
  idPrefix,
  action,
  initial,
  submitLabel,
  onDone,
  onCancel,
}: Props) {
  const [state, formAction, pending] = useActionState<
    ContactFormState,
    FormData
  >(action, {});
  // Après une erreur, les valeurs renvoyées par l'action l'emportent sur les valeurs initiales.
  const values = state.values ?? initial ?? EMPTY;
  const errors = state.errors ?? {};

  useEffect(() => {
    if (state.ok) onDone();
  }, [state.ok, onDone]);

  const field = (key: keyof Values) => {
    const id = `${idPrefix}-${key}`;
    return {
      id,
      name: key,
      defaultValue: values[key],
      "aria-invalid": errors[key] ? (true as const) : undefined,
      "aria-describedby": errors[key] ? `${id}-error` : undefined,
    };
  };
  const errorLine = (key: keyof Values) =>
    errors[key] && (
      <p
        id={`${idPrefix}-${key}-error`}
        role="alert"
        className="text-sm text-destructive"
      >
        {errors[key]}
      </p>
    );

  return (
    <form
      action={formAction}
      noValidate
      className="flex max-w-2xl flex-col gap-4 rounded-md border border-primary/30 bg-primary/10 p-4"
    >
      <div className="grid gap-2">
        <Label htmlFor={`${idPrefix}-name`}>Nom (obligatoire)</Label>
        <Input {...field("name")} aria-required="true" autoComplete="off" />
        {errorLine("name")}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor={`${idPrefix}-job_title`}>Fonction</Label>
          <Input {...field("job_title")} autoComplete="off" />
          {errorLine("job_title")}
        </div>
        <div className="grid gap-2">
          <Label htmlFor={`${idPrefix}-phone`}>Téléphone</Label>
          <Input {...field("phone")} type="tel" autoComplete="off" />
          {errorLine("phone")}
        </div>
      </div>
      <div className="grid gap-2">
        <Label htmlFor={`${idPrefix}-email`}>E-mail</Label>
        <Input {...field("email")} type="email" autoComplete="off" />
        {errorLine("email")}
      </div>
      <div className="grid gap-2">
        <Label htmlFor={`${idPrefix}-address`}>Adresse</Label>
        <Textarea {...field("address")} rows={3} />
        {errorLine("address")}
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
        <button
          type="button"
          onClick={onCancel}
          className="text-sm underline underline-offset-4"
        >
          Annuler
        </button>
      </div>
    </form>
  );
}
