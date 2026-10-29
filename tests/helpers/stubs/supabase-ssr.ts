import { fake } from "./proxy-fake.ts";

type CookieAdapter = { getAll(): unknown[]; setAll(cookies: { name: string; value: string; options?: Record<string, unknown> }[]): void };

/** Doublure de `@supabase/ssr` : `getClaims()` rend `fake.claims`, et pose un cookie rafraîchi si le test le demande (comme le vrai client). */
export function createServerClient(_url: string, _key: string, options: { cookies: CookieAdapter }) {
  fake.calls.push("createServerClient");
  return {
    auth: {
      getClaims: async () => {
        fake.calls.push("getClaims");
        if (fake.refreshCookie) options.cookies.setAll([{ name: "sb-session", value: "rafraichi", options: { path: "/" } }]);
        return { data: fake.claims ? { claims: fake.claims } : null, error: null };
      },
    },
  };
}
