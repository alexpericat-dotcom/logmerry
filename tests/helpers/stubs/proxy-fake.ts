/** État partagé des doublures du proxy (`@supabase/ssr`, `next/server`) : ce que le test dicte, et ce que le code a fait (dans l'ordre). */
export const fake = {
  /** Claims renvoyés par `getClaims()` ; `null` = pas de session (le vrai client renvoie alors `data: null`). */
  claims: null as Record<string, unknown> | null,
  /** Le client Supabase rafraîchit la session : il pose ce cookie par `setAll` pendant `getClaims()`. */
  refreshCookie: false,
  /** Journal : « createServerClient », « getClaims », « next », « redirect », « json ». */
  calls: [] as string[],
  reset() {
    this.claims = null;
    this.refreshCookie = false;
    this.calls = [];
  },
};
