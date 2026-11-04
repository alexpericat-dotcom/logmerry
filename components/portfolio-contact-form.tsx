"use client";

import { useActionState, useSyncExternalStore } from "react";

import type { ContactMessageState } from "@/app/portfolio/contact-action";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MESSAGE_MAX, MESSAGE_NAME_MAX } from "@/lib/domain/contact-message";
import { CONTACT } from "@/lib/portfolio-content";

const F = CONTACT.form;

/**
 * Heure de chargement de la page, lue une seule fois côté navigateur ; rien côté serveur (le rendu serveur et l'hydratation s'accordent, pas d'écart d'hydratation).
 * Valeur stable : le formulaire est vidé après chaque envoi, l'heure ne doit pas l'être.
 */
const LOADED_AT = String(Date.now());
const noop = () => () => {};

/** Formulaire de contact de `/portfolio`. Champ piège `website` (invisible, hors tabulation) et heure d'ouverture `openedAt` : le contrôle se fait côté serveur. */
export function PortfolioContactForm({ action }: { action: (state: ContactMessageState, formData: FormData) => Promise<ContactMessageState> }) {
  const [state, formAction, pending] = useActionState<ContactMessageState, FormData>(action, {});
  const openedAt = useSyncExternalStore(noop, () => LOADED_AT, () => "");

  if (state.ok) {
    return (
      <p role="status" className="mt-8 max-w-xl rounded-md border px-4 py-3 text-phi-0">
        {F.success}
      </p>
    );
  }

  const errors = state.errors ?? {};
  const v = state.values ?? { name: "", email: "", message: "" };
  const field = (key: "name" | "email" | "message") => ({
    id: `contact-${key}`,
    name: key,
    defaultValue: v[key],
    required: true,
    "aria-invalid": errors[key] ? true : undefined,
    "aria-describedby": errors[key] ? `contact-${key}-error` : undefined,
  });
  const error = (key: "name" | "email" | "message") =>
    errors[key] ? (
      <p id={`contact-${key}-error`} className="text-sm text-destructive">
        {errors[key]}
      </p>
    ) : null;

  return (
    <form action={formAction} noValidate className="mt-8 flex max-w-xl flex-col gap-4">
      {state.error && (
        <p role="alert" className="rounded-md border border-destructive px-4 py-3 text-sm text-destructive">
          {state.error}
        </p>
      )}
      <div className="grid gap-2">
        <Label htmlFor="contact-name">{F.name}</Label>
        <Input {...field("name")} autoComplete="name" maxLength={MESSAGE_NAME_MAX} />
        {error("name")}
      </div>
      <div className="grid gap-2">
        <Label htmlFor="contact-email">{F.email}</Label>
        <Input {...field("email")} type="email" autoComplete="email" />
        {error("email")}
      </div>
      <div className="grid gap-2">
        <Label htmlFor="contact-message">{F.message}</Label>
        <Textarea {...field("message")} rows={6} maxLength={MESSAGE_MAX} />
        {error("message")}
      </div>
      {/* Champ piège : un humain ne le voit pas et ne le remplit pas. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>
          Ne pas remplir
          <input type="text" name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <input type="hidden" name="openedAt" value={openedAt} />
      <p className="text-sm text-muted-foreground">{F.privacy}</p>
      <div>
        <button type="submit" disabled={pending} className="liquid liquid-orange h-12 px-9 text-phi-0">
          {pending ? F.sending : F.send}
        </button>
      </div>
    </form>
  );
}
