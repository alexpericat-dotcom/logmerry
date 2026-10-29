/** Identifiant d'un champ : `${préfixe}-${clé}` ; sans préfixe, la clé seule (formulaires à une seule instance : client, mission). */
export const fieldId = (prefix: string | undefined, key: string) => (prefix ? `${prefix}-${key}` : key);

/**
 * Attributs d'un champ de formulaire : identifiant, nom, valeur par défaut (si donnée) et, quand le champ est en erreur, `aria-invalid` et
 * `aria-describedby` vers sa ligne d'erreur (`${id}-error`).
 */
export function fieldProps(prefix: string | undefined, key: string, error: string | undefined, defaultValue?: string) {
  const id = fieldId(prefix, key);
  return {
    id,
    name: key,
    ...(defaultValue === undefined ? {} : { defaultValue }),
    "aria-invalid": error ? (true as const) : undefined,
    "aria-describedby": error ? `${id}-error` : undefined,
  };
}

/** Plusieurs descriptions pour `aria-describedby` (l'erreur ET l'aide d'un champ) : les identifiants absents sont ignorés ; rien = `undefined`. */
export const describedBy = (...ids: (string | false | null | undefined)[]) => ids.filter(Boolean).join(" ") || undefined;

/** Les erreurs de champ à lister dans le récapitulatif, dans l'ordre des clés ; les messages vides sont ignorés. */
export function errorSummaryItems(errors: Record<string, string | undefined> | undefined, prefix?: string): { key: string; id: string; message: string }[] {
  return Object.entries(errors ?? {}).flatMap(([key, message]) => (message ? [{ key, id: fieldId(prefix, key), message }] : []));
}

/** Titre du récapitulatif : « 1 erreur à corriger », « 2 erreurs à corriger ». */
export const summaryTitle = (count: number) => `${count} erreur${count > 1 ? "s" : ""} à corriger`;
