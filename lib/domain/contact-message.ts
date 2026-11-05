import { CONTACT_EMAIL_MAX, isEmail } from "./contacts.ts";

/** Mêmes bornes que la fonction SQL `submit_contact_message` (migration 20261107100000). */
export const MESSAGE_NAME_MAX = 200;
export const MESSAGE_MIN = 10;
export const MESSAGE_MAX = 4000;
/** Un humain met plus de temps à écrire dix caractères : en dessous, c'est un robot. */
export const MIN_FILL_MS = 3000;

export type ContactMessageInput = { name: string; email: string; message: string; website: string; openedAt: string };
export type ContactMessageValues = { name: string; email: string; message: string };
export type ContactMessageErrors = Partial<Record<keyof ContactMessageValues, string>>;

const stripNul = (s: string) => s.replaceAll("\u0000", "");
// Même décompte que char_length côté base (points de code, pas unités UTF-16).
const length = (s: string) => [...s].length;

/**
 * Contrôle d'un message du formulaire public. `spam` : champ piège rempli ou formulaire envoyé trop vite ; l'appelant répond comme si tout allait bien,
 * sans rien écrire. `now` en paramètre pour rester testable.
 */
export function checkContactMessage(input: ContactMessageInput, now: number): { ok: true; value: ContactMessageValues } | { ok: false; spam: true } | { ok: false; errors: ContactMessageErrors } {
  // ponytail : sans JavaScript, l'heure d'ouverture est vide et le message est écarté comme du spam ; une page sans JavaScript n'est pas gérée.
  const opened = Number(input.openedAt);
  if (input.website.trim() !== "" || !(opened > 0) || now - opened < MIN_FILL_MS) return { ok: false, spam: true };

  const clean = (s: string) => stripNul(s).trim();
  const name = clean(input.name).replace(/[\r\n\t]+/g, " ");
  const email = clean(input.email);
  const message = clean(input.message);
  const errors: ContactMessageErrors = {};
  if (!name) errors.name = "Indiquez votre nom.";
  else if (length(name) > MESSAGE_NAME_MAX) errors.name = `Votre nom doit faire ${MESSAGE_NAME_MAX} caractères au plus.`;
  if (!email) errors.email = "Indiquez votre adresse e-mail.";
  else if (!isEmail(email)) errors.email = "Indiquez une adresse e-mail valide (par exemple nom@exemple.fr).";
  else if (length(email) > CONTACT_EMAIL_MAX) errors.email = `Votre e-mail doit faire ${CONTACT_EMAIL_MAX} caractères au plus.`;
  if (length(message) < MESSAGE_MIN) errors.message = `Votre message doit faire ${MESSAGE_MIN} caractères au moins.`;
  else if (length(message) > MESSAGE_MAX) errors.message = `Votre message doit faire ${MESSAGE_MAX} caractères au plus.`;
  if (Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, value: { name, email, message } };
}
