const dateTime = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Europe/Paris",
});

/** Date et heure de Paris, ex. « 13 oct. 2026, 18:42 ». */
export function formatDateTime(iso: string): string {
  return dateTime.format(new Date(iso));
}

const dateOnly = new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeZone: "UTC" });

/** Date sans heure (`YYYY-MM-DD`, colonne `date`), ex. « 13 oct. 2026 » ; pas de décalage de fuseau. */
export function formatDate(day: string): string {
  return dateOnly.format(new Date(`${day}T00:00:00Z`));
}
