"use client";

import Link from "next/link";
import { useActionState } from "react";

import { createNote, type NoteFormState } from "@/app/(app)/notes/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function NoteForm() {
  const [state, action, pending] = useActionState<NoteFormState, FormData>(
    createNote,
    {},
  );
  const titleError = state.errors?.title;
  const bodyError = state.errors?.body;

  return (
    <form action={action} noValidate className="flex max-w-2xl flex-col gap-6">
      <div className="grid gap-2">
        <Label htmlFor="title">Titre (obligatoire)</Label>
        <Input
          id="title"
          name="title"
          defaultValue={state.values?.title}
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
        <Label htmlFor="body">Texte</Label>
        <Textarea
          id="body"
          name="body"
          defaultValue={state.values?.body}
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
          {pending ? "Enregistrement…" : "Enregistrer la note"}
        </Button>
        <Link href="/notes" className="text-sm underline underline-offset-4">
          Annuler
        </Link>
      </div>
    </form>
  );
}
