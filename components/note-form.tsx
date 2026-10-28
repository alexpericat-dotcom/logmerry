"use client";

import Link from "next/link";
import { useActionState, useRef, useState } from "react";

import type { NoteFormState, NoteFormValues } from "@/app/(app)/notes/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  CLIENT_ORIGINS,
  CLIENT_ORIGIN_LABELS,
  CLIENT_STATUS_LABELS,
  matchClients,
  type ClientStatus,
} from "@/lib/domain/clients";
import { NEW_CLIENT } from "@/lib/domain/note-link";
import { NOTE_TYPES, NOTE_TYPE_LABELS } from "@/lib/domain/notes";

type Props = {
  action: (state: NoteFormState, formData: FormData) => Promise<NoteFormState>;
  initial?: NoteFormValues;
  /** Mes fiches, pour le champ « Lié à ». */
  clients: { id: string; name: string; status: ClientStatus }[];
  submitLabel: string;
};

const selectClass =
  "flex h-9 w-full rounded-md border border-input bg-background max-md:h-11 px-3 py-1 text-base shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring md:text-sm";
const EMPTY: NoteFormValues = { title: "", body: "", type: "note", client_id: "", new_name: "", new_origin: "" };

export function NoteForm({ action, initial, clients, submitLabel }: Props) {
  // `sent` compte les envois : il sert de clé au menu « Lié à » (voir plus bas).
  const [state, formAction, pending] = useActionState<NoteFormState & { sent?: number }, FormData>(
    async (prev, formData) => ({ ...(await action(prev, formData)), sent: (prev.sent ?? 0) + 1 }),
    {},
  );
  // Après une erreur, les valeurs renvoyées par l'action l'emportent sur les valeurs initiales.
  const values = state.values ?? initial ?? EMPTY;
  // Menu non contrôlé et remonté à chaque envoi (clé) : React remet les champs à zéro après l'action et ne met pas à jour
  // l'option par défaut d'un menu déjà monté ; sans cela le menu reviendrait à « Aucune fiche » alors que le panneau reste ouvert.
  const [choice, setChoice] = useState(values.client_id);
  const linkRef = useRef<HTMLSelectElement>(null);
  const [newName, setNewName] = useState(values.new_name);
  const sorted = [...clients].sort((a, b) => a.name.localeCompare(b.name, "fr"));
  const close = choice === NEW_CLIENT ? matchClients(clients, newName, 5) : [];
  const { client_id: linkError, new_name: newNameError, new_origin: newOriginError } = state.errors ?? {};
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
          className="flex h-9 w-full rounded-md border border-input bg-background max-md:h-11 px-3 py-1 text-base shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring md:text-sm"
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
        <Label htmlFor="client_id">Lié à</Label>
        <select
          key={state.sent ?? 0}
          id="client_id"
          name="client_id"
          ref={linkRef}
          defaultValue={values.client_id}
          onChange={(e) => setChoice(e.target.value)}
          aria-invalid={linkError ? true : undefined}
          aria-describedby={linkError ? "client_id-error" : undefined}
          className={selectClass}
        >
          <option value="">Aucune fiche</option>
          {sorted.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} ({CLIENT_STATUS_LABELS[c.status]})
            </option>
          ))}
          <option value={NEW_CLIENT}>+ Nouvelle fiche…</option>
        </select>
        {linkError && (
          <p id="client_id-error" role="alert" className="text-sm text-destructive">
            {linkError}
          </p>
        )}
      </div>
      {choice === NEW_CLIENT && (
        <fieldset className="grid gap-4 rounded-md border p-3">
          <legend className="px-1 text-sm font-semibold">Nouvelle fiche (prospect)</legend>
          <div className="grid gap-2">
            <Label htmlFor="new_name">Nom de la fiche (obligatoire)</Label>
            <Input
              id="new_name"
              name="new_name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              autoComplete="off"
              aria-required="true"
              aria-invalid={newNameError ? true : undefined}
              aria-describedby={newNameError ? "new_name-error" : undefined}
            />
            {newNameError && (
              <p id="new_name-error" role="alert" className="text-sm text-destructive">
                {newNameError}
              </p>
            )}
            {close.length > 0 && (
              <div className="text-sm" aria-live="polite">
                <p className="text-muted-foreground">Fiches proches : c&apos;est peut-être l&apos;une d&apos;elles ?</p>
                <ul className="mt-1 flex flex-wrap gap-2">
                  {close.map((c) => (
                    <li key={c.id}>
                      <Button type="button" variant="outline" size="sm" onClick={() => {
                          if (linkRef.current) linkRef.current.value = c.id;
                          setChoice(c.id);
                        }}>
                        Utiliser {c.name}
                      </Button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="new_origin">Origine (obligatoire)</Label>
            <select
              id="new_origin"
              name="new_origin"
              defaultValue={values.new_origin}
              aria-required="true"
              aria-invalid={newOriginError ? true : undefined}
              aria-describedby={newOriginError ? "new_origin-error" : undefined}
              className={selectClass}
            >
              <option value="" disabled>
                Choisis une origine
              </option>
              {CLIENT_ORIGINS.map((o) => (
                <option key={o} value={o}>
                  {CLIENT_ORIGIN_LABELS[o]}
                </option>
              ))}
            </select>
            {newOriginError && (
              <p id="new_origin-error" role="alert" className="text-sm text-destructive">
                {newOriginError}
              </p>
            )}
          </div>
        </fieldset>
      )}
      <div className="grid gap-2">
        <Label htmlFor="body">Texte</Label>
        <Textarea
          id="body"
          className="min-h-40"
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
        <Link href="/notes" className="text-sm underline underline-offset-4 max-md:inline-flex max-md:min-h-11 max-md:items-center">
          Annuler
        </Link>
      </div>
    </form>
  );
}
