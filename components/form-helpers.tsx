"use client";

import { useEffect, useRef, useState, type MouseEvent } from "react";

import { errorSummaryItems, fieldProps, summaryTitle } from "@/lib/form";

/** Menu de sélection des formulaires : deux variantes seulement ; `truncate` pour les intitulés longs (facture, échéance). */
export const selectClass =
  "flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-base shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring max-md:h-11 md:text-sm";
export const selectClassTruncate =
  "flex h-9 w-full truncate rounded-md border border-input bg-background px-3 py-1 text-base shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring max-md:h-11 md:text-sm";

/** Ligne d'erreur d'un champ (reliée par `aria-describedby`). Pas de `role="alert"` : le récapitulatif en tête reçoit le focus et annonce déjà les erreurs. */
export function ErrorLine({ id, message }: { id: string; message: string | undefined }) {
  return message ? (
    <p id={`${id}-error`} className="text-sm text-destructive">
      {message}
    </p>
  ) : null;
}

/**
 * Donne `field(clé)` (attributs du champ) et `errorLine(clé)` (sa ligne d'erreur) d'un formulaire. `prefix` : préfixe des identifiants (rien pour un formulaire à
 * une seule instance) ; `values` : valeurs par défaut des champs non contrôlés (sinon le formulaire les pose lui-même).
 */
export function useFormFields<K extends string>(prefix: string | undefined, errors: Partial<Record<K, string | undefined>>, values?: Partial<Record<K, string>>) {
  const field = (key: K) => fieldProps(prefix, key, errors[key], values?.[key]);
  const errorLine = (key: K) => <ErrorLine id={fieldProps(prefix, key, undefined).id} message={errors[key]} />;
  return { field, errorLine };
}

/** Met le focus sur un champ SANS laisser le navigateur l'aligner sous l'en-tête fixe du téléphone (même motif que les encaissements). */
export function focusField(id: string) {
  const el = document.getElementById(id);
  el?.focus({ preventScroll: true });
  el?.scrollIntoView?.({ block: "center" });
}

/**
 * Récapitulatif d'erreurs en tête d'un formulaire (EXPERIENCE.md) : titre, un lien par erreur (le texte est le message), le focus dessus après chaque
 * envoi refusé (`token` change à chaque réponse du serveur). Un lien met le focus sur son champ ; `reveal(clé)` ouvre d'abord un champ replié.
 */
export function ErrorSummary({ errors, prefix, token, reveal }: { errors: Record<string, string | undefined> | undefined; prefix?: string; token: unknown; reveal?: (key: string) => void }) {
  const items = errorSummaryItems(errors, prefix);
  const box = useRef<HTMLDivElement>(null);
  const count = items.length;
  useEffect(() => {
    if (count > 0) box.current?.focus();
  }, [token, count]);
  if (count === 0) return null;
  const go = (e: MouseEvent, key: string, id: string) => {
    e.preventDefault();
    reveal?.(key);
    requestAnimationFrame(() => focusField(id));
  };
  const titleId = `${prefix ?? "form"}-error-summary-title`;
  return (
    <div ref={box} tabIndex={-1} role="group" aria-labelledby={titleId} className="rounded-md border border-destructive p-3 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring">
      <p id={titleId} className="font-semibold text-destructive">
        {summaryTitle(count)}
      </p>
      <ul className="mt-1 list-disc pl-5">
        {items.map((i) => (
          <li key={i.key}>
            <a href={`#${i.id}`} onClick={(e) => go(e, i.key, i.id)} className="underline underline-offset-4">
              {i.message}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * « Plus de champs » : une erreur qui ARRIVE dans un champ replié l'ouvre (`errors` : l'objet de la réponse du serveur, `undefined` sans erreur), puis le bouton
 * peut le refermer, l'erreur restant dans le récapitulatif. Se règle pendant le rendu (jamais d'effet) : `errors` ne change qu'à une nouvelle réponse.
 */
export function useMoreFields(initiallyOpen: boolean, errors: object | undefined, hasHiddenError: boolean) {
  const [open, setOpen] = useState(initiallyOpen);
  const [seen, setSeen] = useState(errors);
  if (errors !== seen) {
    setSeen(errors);
    if (hasHiddenError && !open) setOpen(true);
  }
  return [open, setOpen] as const;
}
