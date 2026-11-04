"use server";

import { checkContactMessage, type ContactMessageErrors, type ContactMessageValues } from "@/lib/domain/contact-message";
import { CONTACT } from "@/lib/portfolio-content";
import { createClient } from "@/lib/supabase/server";

export type ContactMessageState = { ok?: true; error?: string; errors?: ContactMessageErrors; values?: ContactMessageValues };

const text = (formData: FormData, key: string) => {
  const v = formData.get(key);
  return typeof v === "string" ? v : "";
};

/**
 * Formulaire de contact public. Aucune session requise : le message passe par la fonction SQL `submit_contact_message`, la seule porte ouverte à `anon`
 * (elle valide, plafonne et écrit une note en brouillon chez le destinataire désigné).
 */
export async function sendContactMessage(_prev: ContactMessageState, formData: FormData): Promise<ContactMessageState> {
  const values = { name: text(formData, "name"), email: text(formData, "email"), message: text(formData, "message") };
  const checked = checkContactMessage({ ...values, website: text(formData, "website"), openedAt: text(formData, "openedAt") }, Date.now());
  // Robot : même réponse qu'un envoi réussi, rien n'est écrit.
  if (!checked.ok && "spam" in checked) return { ok: true };
  if (!checked.ok) return { errors: checked.errors, values };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("submit_contact_message", { p_name: checked.value.name, p_email: checked.value.email, p_message: checked.value.message });
  if (error?.code === "54000") return { error: CONTACT.form.rate, values };
  if (error || data !== true) return { error: CONTACT.form.fail, values };
  return { ok: true };
}
