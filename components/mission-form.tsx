"use client";

import Link from "next/link";
import { useActionState } from "react";

import type { MissionFormState, MissionFormValues } from "@/app/(app)/missions/actions";
import { ErrorSummary, selectClass, useFormFields } from "@/components/form-helpers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MISSION_STATUSES, MISSION_STATUS_LABELS } from "@/lib/domain/missions";

type Props = {
  action: (state: MissionFormState, formData: FormData) => Promise<MissionFormState>;
  initial?: MissionFormValues;
  /** Création : mes fiches, à choisir. Modification : le client ne change pas (nom affiché, champ caché). */
  clients?: { id: string; name: string }[];
  fixedClient?: { id: string; name: string };
  submitLabel: string;
  cancelHref: string;
};


export function MissionForm({ action, initial, clients = [], fixedClient, submitLabel, cancelHref }: Props) {
  const [state, formAction, pending] = useActionState<MissionFormState, FormData>(action, {});
  // Après une erreur, les valeurs renvoyées par l'action l'emportent sur les valeurs initiales.
  const values = state.values ?? initial ?? { client_id: "", title: "", status: "in_progress", start_date: "", end_date: "" };
  const e = state.errors ?? {};
  const { field, errorLine } = useFormFields(undefined, e);
  const sorted = [...clients].sort((a, b) => a.name.localeCompare(b.name, "fr"));

  return (
    <form action={formAction} noValidate className="flex max-w-2xl flex-col gap-6">
      <ErrorSummary errors={e} token={state} />
      {fixedClient ? (
        <div className="grid gap-1">
          <span className="text-sm font-medium">Client</span>
          <p>{fixedClient.name}</p>
          <input type="hidden" name="client_id" value={fixedClient.id} />
        </div>
      ) : (
        <div className="grid gap-2">
          <Label htmlFor="client_id">Client (obligatoire)</Label>
          {sorted.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Crée d&apos;abord une fiche client ou prospect, <Link href="/clients/nouvelle" className="underline underline-offset-4">dans l&apos;onglet Clients</Link>.
            </p>
          ) : (
            <select {...field("client_id")} defaultValue={values.client_id} aria-required="true" className={selectClass}>
              <option value="" disabled>
                Choisis un client
              </option>
              {sorted.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          )}
          {errorLine("client_id")}
        </div>
      )}
      <div className="grid gap-2">
        <Label htmlFor="title">Titre (obligatoire)</Label>
        <Input {...field("title")} defaultValue={values.title} aria-required="true" autoComplete="off" />
        {errorLine("title")}
      </div>
      <div className="grid gap-2">
        <Label htmlFor="status">Statut</Label>
        <select {...field("status")} defaultValue={values.status} className={selectClass}>
          {MISSION_STATUSES.map((s) => (
            <option key={s} value={s}>
              {MISSION_STATUS_LABELS[s]}
            </option>
          ))}
        </select>
        {errorLine("status")}
      </div>
      <div className="grid gap-6 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="start_date">Date de début</Label>
          <Input {...field("start_date")} type="date" defaultValue={values.start_date} />
          {errorLine("start_date")}
        </div>
        <div className="grid gap-2">
          <Label htmlFor="end_date">Date de fin</Label>
          <Input {...field("end_date")} type="date" defaultValue={values.end_date} />
          {errorLine("end_date")}
        </div>
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
