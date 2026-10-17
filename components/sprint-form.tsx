"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef } from "react";

import type { SprintFormState, SprintFormValues } from "@/app/(app)/missions/sprint-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SPRINT_GOAL_MAX, SPRINT_NAME_MAX } from "@/lib/domain/sprints";

const EMPTY: SprintFormValues = { name: "", goal: "", start_date: "", end_date: "" };

/** Formulaire d'un sprint (création, modification) : nom, objectif en une phrase, dates de début et de fin. */
export function SprintForm({
  idPrefix,
  action,
  initial,
  submitLabel,
  datesLocked = false,
  onDone,
  onCancel,
}: {
  idPrefix: string;
  action: (state: SprintFormState, formData: FormData) => Promise<SprintFormState>;
  initial?: SprintFormValues;
  submitLabel: string;
  /** Sprint clos : seuls le nom et l'objectif se modifient. */
  datesLocked?: boolean;
  onDone: () => void;
  onCancel: () => void;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<SprintFormState, FormData>(async (prev, formData) => ({ ...(await action(prev, formData)), sent: (prev.sent ?? 0) + 1 }), {});
  // Après une erreur, les valeurs renvoyées par l'action l'emportent sur les valeurs initiales.
  const values = state.values ?? initial ?? EMPTY;
  const errors = state.errors ?? {};
  const name = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (state.ok) onDone();
  }, [state.ok, onDone]);
  // Le sprint ou la mission a disparu (supprimé dans un autre onglet) : on recharge pour que l'écran le reflète.
  useEffect(() => {
    if (state.gone) router.refresh();
  }, [state.gone, router]);
  useEffect(() => name.current?.focus(), []);

  const field = (key: keyof SprintFormValues) => {
    const id = `${idPrefix}-${key}`;
    return { id, name: key, defaultValue: values[key], "aria-invalid": errors[key] ? (true as const) : undefined, "aria-describedby": errors[key] ? `${id}-error` : undefined };
  };
  const errorLine = (key: keyof SprintFormValues) =>
    errors[key] && (
      <p id={`${idPrefix}-${key}-error`} role="alert" className="text-sm text-destructive">
        {errors[key]}
      </p>
    );

  return (
    <form action={formAction} noValidate className="flex max-w-2xl flex-col gap-4 rounded-md border border-primary/30 bg-primary/10 p-4">
      <div className="grid gap-2">
        <Label htmlFor={`${idPrefix}-name`}>Nom du sprint (obligatoire)</Label>
        <Input {...field("name")} ref={name} aria-required="true" autoComplete="off" maxLength={SPRINT_NAME_MAX * 2} placeholder="Sprint 1" />
        {errorLine("name")}
      </div>
      <div className="grid gap-2">
        <Label htmlFor={`${idPrefix}-goal`}>Objectif en une phrase</Label>
        <Input {...field("goal")} autoComplete="off" maxLength={SPRINT_GOAL_MAX * 2} placeholder="un premier tableau des inscriptions que la directrice peut utiliser" />
        {errorLine("goal")}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor={`${idPrefix}-start_date`}>Début{datesLocked ? "" : " (obligatoire)"}</Label>
          <Input {...field("start_date")} type="date" aria-required={datesLocked ? undefined : "true"} readOnly={datesLocked} />
          {errorLine("start_date")}
        </div>
        <div className="grid gap-2">
          <Label htmlFor={`${idPrefix}-end_date`}>Fin{datesLocked ? "" : " (obligatoire)"}</Label>
          <Input {...field("end_date")} type="date" aria-required={datesLocked ? undefined : "true"} readOnly={datesLocked} />
          {errorLine("end_date")}
        </div>
      </div>
      {datesLocked && <p className="text-xs text-muted-foreground">Un sprint clos garde ses dates ; seuls son nom et son objectif se modifient.</p>}
      {state.message && (
        <p role="alert" className="text-sm text-destructive">
          {state.message}
        </p>
      )}
      <div className="flex items-center gap-4">
        <Button type="submit" disabled={pending}>
          {pending ? "Enregistrement…" : submitLabel}
        </Button>
        <button type="button" onClick={onCancel} className="text-sm underline underline-offset-4 max-md:inline-flex max-md:min-h-11 max-md:items-center">
          Annuler
        </button>
      </div>
    </form>
  );
}
