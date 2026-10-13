"use client";

import Link from "next/link";
import { useActionState } from "react";

import type { NoteFormState } from "@/app/(app)/notes/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { NOTE_TYPES, NOTE_TYPE_LABELS } from "@/lib/domain/notes";

type Props = {
  action: (state: NoteFormState, formData: FormData) => Promise<NoteFormState>;
  initial?: { title: string; body: string; type: string };
  submitLabel: string;
};

export function NoteForm({ action, initial, submitLabel }: Props) {
  const [state, formAction, pending] = useActionState<NoteFormState, FormData>(action, {});
  // Après une erreur, les valeurs renvoyées par l'action l'emportent sur les valeurs initiales.
  const values = state.values ?? initial ?? { title: "", body: "", type: "note" };
  const titleError = state.errors?.title;
  const bodyError = state.errors?.body;
  const typeError = state.errors?.type;

  return (
    <form action={formAction} noValidate className="flex max-w-2xl flex-col gap-6">
      <div className="grid gap-2">
        <Label htmlFor="title">Titre (obligatoire)</Label>
        <Input
          id="title"
          name="title"
          defaultValue={values.title}
          aria-required="true"
          aria-invalid={titleError ? true : undefined}
          aria-describedby={titleError ? "title-error" : undefined}
        />
        {titleError && (
          <p id="title-error" role="alert" className="text-sm text-destructive">
            {titleError}
          </p>
        )}
      </div>
      <div className="grid gap-2">
        <Label htmlFor="type">Type</Label>
        <select
          id="type"
          name="type"
          defaultValue={values.type}
          aria-invalid={typeError ? true : undefined}
          aria-describedby={typeError ? "type-error" : undefined}
          className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-base shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring md:text-sm"
        >
          {NOTE_TYPES.map((t) => (
            <option key={t} value={t}>
              {NOTE_TYPE_LABELS[t]}
            </option>
          ))}
        </select>
        {typeError && (
          <p id="type-error" role="alert" className="text-sm text-destructive">
            {typeError}
          </p>
        )}
      </div>
      <div className="grid gap-2">
        <Label htmlFor="body">Texte</Label>
        <Textarea
          id="body"
          name="body"
          defaultValue={values.body}
          aria-invalid={bodyError ? true : undefined}
          aria-describedby={bodyError ? "body-error" : undefined}
        />
        {bodyError && (
          <p id="body-error" role="alert" className="text-sm text-destructive">
            {bodyError}
          </p>
        )}
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
        <Link href="/notes" className="text-sm underline underline-offset-4">
          Annuler
        </Link>
      </div>
    </form>
  );
}
