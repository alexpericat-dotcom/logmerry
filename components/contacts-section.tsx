"use client";

import {
  useActionState,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  addContact,
  deleteContact,
  updateContact,
  type ContactDeleteState,
} from "@/app/(app)/clients/contact-actions";
import { ContactForm } from "@/components/contact-form";
import { FocusOnMount } from "@/components/form-helpers";
import { ConfirmPanel } from "@/components/confirm-panel";
import { Button } from "@/components/ui/button";
import type { ContactRecord } from "@/lib/db/contacts";
import { initials } from "@/lib/domain/contacts";

function DeleteContact({
  contact,
  onCancel,
}: {
  contact: ContactRecord;
  onCancel: () => void;
}) {
  const [state, action, pending] = useActionState<ContactDeleteState>(
    () => deleteContact(contact.id),
    {},
  );
  return (
    <ConfirmPanel
      label={`Supprimer ${contact.name}`}
      question={`Supprimer ${contact.name} ? C'est définitif.`}
      size="compact"
      className="mt-3"
      action={action}
      pending={pending}
      error={state.message}
      onCancel={onCancel}
    />
  );
}

function ContactItem({ contact }: { contact: ContactRecord }) {
  const [mode, setMode] = useState<"view" | "edit" | "delete">("view");
  const close = useCallback(() => setMode("view"), []);
  const editButton = useRef<HTMLButtonElement>(null);
  const wasOpen = useRef(false);
  // Le focus revient sur « Modifier » quand le formulaire ou la confirmation se ferme sans supprimer.
  useEffect(() => {
    if (mode === "view" && wasOpen.current) editButton.current?.focus();
    wasOpen.current = mode !== "view";
  }, [mode]);

  if (mode === "edit") {
    return (
      <li className="md:col-span-2">
        <ContactForm
          idPrefix={`edit-${contact.id}`}
          action={updateContact.bind(null, contact.id)}
          initial={{
            name: contact.name,
            job_title: contact.job_title ?? "",
            email: contact.email ?? "",
            phone: contact.phone ?? "",
            address: contact.address ?? "",
          }}
          submitLabel="Enregistrer les modifications"
          onDone={close}
          onCancel={close}
        />
      </li>
    );
  }

  return (
    <li className="flex flex-col gap-3 rounded-md border bg-card p-3 md:col-span-1">
      <div className="flex items-start gap-3">
        <div
          className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-sm font-semibold text-foreground"
          aria-hidden="true"
        >
          {initials(contact.name)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="break-words font-semibold">{contact.name}</p>
          {contact.job_title && (
            <p className="break-words text-sm text-muted-foreground">
              {contact.job_title}
            </p>
          )}
        </div>
      </div>
      {(contact.email || contact.phone || contact.address) && (
        <dl className="grid gap-1 text-sm">
          {contact.email && (
            <div className="flex gap-2 max-md:items-center">
              <dt className="text-muted-foreground">E-mail</dt>
              <dd className="min-w-0 break-all">
                <a
                  href={`mailto:${contact.email}`}
                  className="text-primary underline underline-offset-4 max-md:inline-flex max-md:min-h-11 max-md:items-center"
                >
                  {contact.email}
                </a>
              </dd>
            </div>
          )}
          {contact.phone && (
            <div className="flex gap-2 max-md:items-center">
              <dt className="text-muted-foreground">Téléphone</dt>
              <dd className="font-mono tabular-nums">
                {/* Lien d'appel seulement pour un numéro « pur » (chiffres, espaces, + ( ) . -) : une extension ou une mention en lettres ferait composer un mauvais numéro. */}
                {/^[+\d\s().-]+$/.test(contact.phone) &&
                /\d/.test(contact.phone) ? (
                  <a
                    href={`tel:${contact.phone.replace(/[^\d+]/g, "")}`}
                    className="text-primary underline underline-offset-4 max-md:inline-flex max-md:min-h-11 max-md:items-center"
                  >
                    {contact.phone}
                  </a>
                ) : (
                  contact.phone
                )}
              </dd>
            </div>
          )}
          {contact.address && (
            <div className="flex gap-2">
              <dt className="text-muted-foreground">Adresse</dt>
              <dd className="min-w-0 whitespace-pre-line break-words">
                {contact.address}
              </dd>
            </div>
          )}
        </dl>
      )}
      {mode === "view" && (
        <div className="mt-auto flex justify-end gap-2 border-t border-filet pt-3">
          <Button
            ref={editButton}
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setMode("edit")}
          >
            Modifier<span className="sr-only"> {contact.name}</span>
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="text-destructive"
            onClick={() => setMode("delete")}
          >
            Supprimer<span className="sr-only"> {contact.name}</span>
          </Button>
        </div>
      )}
      {mode === "delete" && (
        <DeleteContact contact={contact} onCancel={close} />
      )}
    </li>
  );
}

/** Contacts d'une fiche : liste, ajout, modification et suppression sur place. */
export function ContactsSection({
  clientId,
  clientName,
  contacts,
}: {
  clientId: string;
  clientName: string;
  contacts: ContactRecord[];
}) {
  const [adding, setAdding] = useState(false);
  const addButton = useRef<HTMLButtonElement>(null);
  const wasAdding = useRef(false);
  const done = useCallback(() => setAdding(false), []);
  // Après une suppression, la ligne disparaît avec le focus : il passe au titre de la section au lieu de se perdre.
  const heading = useRef<HTMLHeadingElement>(null);
  const count = useRef(contacts.length);
  useEffect(() => {
    if (contacts.length < count.current) heading.current?.focus();
    count.current = contacts.length;
  }, [contacts.length]);
  useEffect(() => {
    if (!adding && wasAdding.current) addButton.current?.focus();
    wasAdding.current = adding;
  }, [adding]);

  return (
    <section aria-labelledby="contacts-title" className="flex flex-col gap-3">
      <h2
        ref={heading}
        id="contacts-title"
        tabIndex={-1}
        className="text-xl font-semibold focus:outline-none"
      >
        Contacts{" "}
        <span
          className="font-mono text-base font-normal tabular-nums text-muted-foreground"
          aria-label={`${contacts.length} contact${contacts.length > 1 ? "s" : ""}`}
        >
          {contacts.length}
        </span>
      </h2>
      {contacts.length === 0 && !adding && (
        <p className="text-muted-foreground">
          Aucun contact pour {clientName} pour l&apos;instant. Ajoute les
          personnes avec qui tu es en lien.
        </p>
      )}
      {contacts.length > 0 && (
        <ul className="grid gap-3 md:grid-cols-2">
          {contacts.map((c) => (
            <ContactItem key={c.id} contact={c} />
          ))}
        </ul>
      )}
      {adding ? (
        <FocusOnMount>
          <ContactForm
            idPrefix="add"
            action={addContact.bind(null, clientId)}
            submitLabel="Ajouter le contact"
            onDone={done}
            onCancel={done}
          />
        </FocusOnMount>
      ) : (
        <Button
          ref={addButton}
          type="button"
          size="lg"
          className="self-start"
          onClick={() => setAdding(true)}
        >
          Ajouter un contact
        </Button>
      )}
    </section>
  );
}
