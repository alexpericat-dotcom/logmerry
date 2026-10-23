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

const parisDay = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" });

/** Le jour de Paris, `YYYY-MM-DD` (les règles reçoivent leur date de référence en argument, elles ne lisent jamais l'horloge). */
export function todayParis(now: Date = new Date()): string {
  return parisDay.format(now);
}
