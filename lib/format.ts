const dateTime = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Europe/Paris",
});

/** Date et heure de Paris, ex. « 13 oct. 2026, 18:42 ». */
export function formatDateTime(iso: string): string {
  return dateTime.format(new Date(iso));
}
