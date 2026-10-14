export const CONTACT_NAME_MAX = 200;
export const CONTACT_JOB_MAX = 200;
export const CONTACT_EMAIL_MAX = 254;
export const CONTACT_PHONE_MAX = 30;
export const CONTACT_ADDRESS_MAX = 500;

export type ContactInput = { name: string; job_title: string; email: string; phone: string; address: string };
/** Les champs facultatifs vides valent `null` (jamais une chaîne vide). */
export type ContactValues = { name: string; job_title: string | null; email: string | null; phone: string | null; address: string | null };
export type ContactErrors = Partial<Record<keyof ContactInput, string>>;

// Postgres refuse le caractère nul dans un texte.
const stripNul = (s: string) => s.replaceAll("\u0000", "");
// Même décompte que char_length côté base (points de code, pas unités UTF-16).
const length = (s: string) => [...s].length;

/** Un « @ » entouré de texte, sans espace : même règle que la contrainte de la base. */
export const isEmail = (s: string) => /^[^\s@]+@[^\s@]+$/.test(s);

export function validateContactInput(input: ContactInput): { ok: true; value: ContactValues } | { ok: false; errors: ContactErrors } {
  const clean = (s: string) => stripNul(s).trim();
  const name = clean(input.name);
  const job = clean(input.job_title);
  const email = clean(input.email);
  const phone = clean(input.phone);
  const address = clean(input.address);
  const errors: ContactErrors = {};
  if (!name) errors.name = "Saisis le nom du contact.";
  else if (length(name) > CONTACT_NAME_MAX) errors.name = `Le nom doit faire ${CONTACT_NAME_MAX} caractères au plus.`;
  if (length(job) > CONTACT_JOB_MAX) errors.job_title = `La fonction doit faire ${CONTACT_JOB_MAX} caractères au plus.`;
  if (email && !isEmail(email)) errors.email = "Saisis une adresse e-mail valide (par exemple nom@exemple.fr).";
  else if (length(email) > CONTACT_EMAIL_MAX) errors.email = `L'e-mail doit faire ${CONTACT_EMAIL_MAX} caractères au plus.`;
  if (length(phone) > CONTACT_PHONE_MAX) errors.phone = `Le téléphone doit faire ${CONTACT_PHONE_MAX} caractères au plus.`;
  if (length(address) > CONTACT_ADDRESS_MAX) errors.address = `L'adresse doit faire ${CONTACT_ADDRESS_MAX} caractères au plus.`;
  if (Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, value: { name, job_title: job || null, email: email || null, phone: phone || null, address: address || null } };
}
