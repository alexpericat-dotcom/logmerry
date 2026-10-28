/**
 * Calcul sur des jours `YYYY-MM-DD` (colonnes `date`), en UTC pour éviter tout décalage d'heure d'été. Source unique : les règles reçoivent
 * leur jour de référence en argument (jamais l'horloge), le jour de Paris vient de `todayParis` (`lib/format.ts`).
 */
const DAY_MS = 86_400_000;

/** Nombre de jours depuis le 1er janvier 1970 (entier pour un jour valide). */
export const dayNumber = (day: string): number => Date.parse(`${day}T00:00:00Z`) / DAY_MS;

/** Le jour (`YYYY-MM-DD`) qui porte ce numéro. */
export const dayFromNumber = (n: number): string => new Date(n * DAY_MS).toISOString().slice(0, 10);

export const addDays = (day: string, n: number): string => dayFromNumber(dayNumber(day) + n);

/** Jours de `from` à `to` (négatif si `to` est avant). */
export const daysBetween = (from: string, to: string): number => dayNumber(to) - dayNumber(from);

export const daysInMonth = (year: number, month: number): number => new Date(Date.UTC(year, month, 0)).getUTCDate();
