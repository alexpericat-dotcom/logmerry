"use client";

import { useActionState, useEffect, useState } from "react";

import type { DeadlineFormState } from "@/app/(app)/calendrier/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DEADLINE_CATEGORIES, DEADLINE_CATEGORY_LABELS, DEADLINE_PRIORITIES, DEADLINE_PRIORITY_LABELS, DEADLINE_RECURRENCES, DEADLINE_RECURRENCE_LABELS, type DeadlineInput } from "@/lib/domain/deadlines";
import { submitWith } from "@/lib/submit-with";

const selectClass =
  "flex h-9 w-full truncate rounded-md border border-input bg-background px-3 py-1 text-base shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring max-md:h-11 md:text-sm";

export function DeadlineForm({
  idPrefix,
  action,
  initial,
  submitLabel,
  onDone,
  onCancel,
  series = false,
  canRecur = false,
}: {
  idPrefix: string;
  action: (state: DeadlineFormState, formData: FormData) => Promise<DeadlineFormState>;
  initial: DeadlineInput;
  submitLabel: string;
  onDone: () => void;
  onCancel: () => void;
  /** Occurrence d'une série : sa date est figée (la grille la régénérerait) et sa récurrence ne change pas. */
  series?: boolean;
  /** Création : le choix de récurrence est proposé (il ne change plus ensuite). */
  canRecur?: boolean;
}) {
  const [state, formAction, pending] = useActionState<DeadlineFormState, FormData>(action, {});
  useEffect(() => {
    if (state.saved) onDone();
  }, [state.saved, onDone]);
  const values = state.values ?? initial;
  const e = state.errors ?? {};
  const [more, setMore] = useState(!!values.note || !!values.recurrence);
  const showMore = more || !!e.note || !!e.recurrence; // une erreur ne reste jamais cachée
  const id = (name: string) => `${idPrefix}-${name}`;
  const field = (name: keyof DeadlineInput) => ({
    id: id(name),
    name,
    "aria-invalid": e[name] ? (true as const) : undefined,
    "aria-describedby": e[name] ? `${id(name)}-error` : undefined,
  });
  const errorLine = (name: keyof DeadlineInput) =>
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
          <Label htmlFor={id("title")}>Titre (obligatoire)</Label>
          <Input {...field("title")} defaultValue={values.title} aria-required="true" autoComplete="off" />
          {errorLine("title")}
        </div>
        <div className="grid gap-2">
          <Label htmlFor={id("due_on")}>Date de l&apos;échéance (obligatoire)</Label>
          <Input {...field("due_on")} type="date" defaultValue={values.due_on} aria-required="true" readOnly={series} aria-describedby={[series && id("due_on-locked"), e.due_on && `${id("due_on")}-error`].filter(Boolean).join(" ") || undefined} />
          {series && (
            <p id={id("due_on-locked")} className="text-sm text-muted-foreground">
              La date d&apos;une échéance récurrente ne se modifie pas.
            </p>
          )}
          {errorLine("due_on")}
        </div>
        <div className="grid gap-2">
          <Label htmlFor={id("category")}>Catégorie (obligatoire)</Label>
          <select {...field("category")} defaultValue={values.category} aria-required="true" className={selectClass}>
            <option value="">Choisir une catégorie</option>
            {DEADLINE_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {DEADLINE_CATEGORY_LABELS[c]}
              </option>
            ))}
          </select>
          {errorLine("category")}
        </div>
        <div className="grid gap-2">
          <Label htmlFor={id("priority")}>Priorité</Label>
          <select {...field("priority")} defaultValue={values.priority || "normal"} className={selectClass}>
            {DEADLINE_PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {DEADLINE_PRIORITY_LABELS[p]}
              </option>
            ))}
          </select>
          {errorLine("priority")}
        </div>
        <div className="grid gap-2 sm:col-span-2">
          <Label htmlFor={id("source")}>Source officielle : lien https:// (obligatoire)</Label>
          <Input {...field("source")} inputMode="url" defaultValue={values.source} aria-required="true" autoComplete="off" placeholder="https://" />
          {errorLine("source")}
        </div>
      </div>
      <div className="flex flex-col gap-4">
        <Button type="button" variant="outline" size="sm" className="self-start" aria-expanded={showMore} aria-controls={id("more")} onClick={() => setMore((v) => !v)}>
          Plus de champs
        </Button>
        <div id={id("more")} className={showMore ? "grid gap-2" : "hidden"}>
          <Label htmlFor={id("note")}>Remarque</Label>
          <Textarea {...field("note")} defaultValue={values.note} rows={3} />
          {errorLine("note")}
          {canRecur && (
            <>
              <Label htmlFor={id("recurrence")}>Récurrence</Label>
              <select {...field("recurrence")} defaultValue={values.recurrence} className={selectClass}>
                <option value="">Aucune</option>
                {DEADLINE_RECURRENCES.map((r) => (
                  <option key={r} value={r}>
                    {DEADLINE_RECURRENCE_LABELS[r]}
                  </option>
                ))}
              </select>
              <p className="text-sm text-muted-foreground">Une ligne par occurrence sur les 12 prochains mois ; chacune se coche seule.</p>
              {errorLine("recurrence")}
            </>
          )}
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
