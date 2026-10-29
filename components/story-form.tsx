"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useState } from "react";

import type { StoryFormState, StoryFormValues } from "@/app/(app)/missions/story-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { STORY_POINTS, STORY_STATUSES, STORY_STATUS_LABELS } from "@/lib/domain/user-stories";

export const selectClass =
  "flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-base shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring max-md:h-11 md:text-sm";

type Values = StoryFormValues;
const EMPTY: Values = { title: "", role: "", benefit: "", acceptance_criteria: "", points: "", status: "todo" };

/** Formulaire d'une user story (ajout, modification, proposition de l'IA à relire) ; mêmes champs et mêmes erreurs partout. */
export function StoryForm({
  idPrefix,
  action,
  initial,
  submitLabel,
  onDone,
  onCancel,
}: {
  idPrefix: string;
  action: (state: StoryFormState, formData: FormData) => Promise<StoryFormState>;
  initial?: Values;
  submitLabel: string;
  onDone: () => void;
  onCancel: () => void;
}) {
  const router = useRouter();
  // `sent` compte les envois : il sert de clé aux menus (React remet les champs à zéro après l'action et ne met pas à jour l'option
  // par défaut d'un menu déjà monté ; sans cela « points » et « statut » reviendraient à leur valeur d'origine après une erreur).
  const [state, formAction, pending] = useActionState<StoryFormState, FormData>(
    async (prev, formData) => ({ ...(await action(prev, formData)), sent: (prev.sent ?? 0) + 1 }),
    {},
  );
  // Après une erreur, les valeurs renvoyées par l'action l'emportent sur les valeurs initiales.
  const values = state.values ?? initial ?? EMPTY;
  // Le statut reçu à l'ouverture, figé : l'action ne l'écrit que s'il a été changé dans ce formulaire (sinon un changement fait ailleurs, par le menu de statut, serait annulé).
  const [initialStatus] = useState(initial?.status);
  const errors = state.errors ?? {};
  const title = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (state.ok) onDone();
  }, [state.ok, onDone]);
  // La story ou la mission a disparu (supprimée dans un autre onglet) : on recharge pour que la liste le reflète.
  useEffect(() => {
    if (state.gone) router.refresh();
  }, [state.gone, router]);
  useEffect(() => title.current?.focus(), []);

  const field = (key: keyof Values) => {
    const id = `${idPrefix}-${key}`;
    return { id, name: key, defaultValue: values[key], "aria-invalid": errors[key] ? (true as const) : undefined, "aria-describedby": errors[key] ? `${id}-error` : undefined };
  };
  const errorLine = (key: keyof Values) =>
    errors[key] && (
      <p id={`${idPrefix}-${key}-error`} role="alert" className="text-sm text-destructive">
        {errors[key]}
      </p>
    );

  return (
    <form action={formAction} noValidate className="flex max-w-2xl flex-col gap-4 rounded-md border border-primary/30 bg-primary/10 p-4">
      {initialStatus !== undefined && <input type="hidden" name="initial_status" value={initialStatus} />}
      <div className="grid gap-2">
        <Label htmlFor={`${idPrefix}-title`}>Je veux… (obligatoire)</Label>
        <Input {...field("title")} ref={title} aria-required="true" autoComplete="off" placeholder="voir où en est chaque inscription" />
        {errorLine("title")}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor={`${idPrefix}-role`}>En tant que…</Label>
          <Input {...field("role")} autoComplete="off" placeholder="responsable des ateliers" />
          {errorLine("role")}
        </div>
        <div className="grid gap-2">
          <Label htmlFor={`${idPrefix}-benefit`}>Afin de…</Label>
          <Input {...field("benefit")} autoComplete="off" placeholder="relancer à temps les familles" />
          {errorLine("benefit")}
        </div>
      </div>
      <div className="grid gap-2">
        <Label htmlFor={`${idPrefix}-acceptance_criteria`}>Critères d&apos;acceptation</Label>
        <Textarea {...field("acceptance_criteria")} rows={4} />
        {errorLine("acceptance_criteria")}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor={`${idPrefix}-points`}>Points</Label>
          <select key={`p${state.sent ?? 0}`} {...field("points")} className={selectClass}>
            <option value="">Sans points</option>
            {STORY_POINTS.map((p) => (
              <option key={p} value={String(p)}>
                {p}
              </option>
            ))}
          </select>
          {errorLine("points")}
        </div>
        <div className="grid gap-2">
          <Label htmlFor={`${idPrefix}-status`}>Statut</Label>
          <select key={`s${state.sent ?? 0}`} {...field("status")} className={selectClass}>
            {STORY_STATUSES.map((s) => (
              <option key={s} value={s}>
                {STORY_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
          {errorLine("status")}
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
        <button type="button" onClick={onCancel} className="text-sm underline underline-offset-4 max-md:inline-flex max-md:min-h-11 max-md:items-center">
          Annuler
        </button>
      </div>
    </form>
  );
}

