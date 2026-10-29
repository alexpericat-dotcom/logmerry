import { fake } from "./proxy-fake.ts";

type Cookie = { name: string; value: string; options?: unknown };

class CookieJar {
  jar = new Map<string, Cookie>();
  /** Comme `ResponseCookies` : `set(nom, valeur, options)` ou `set({ name, value, … })`. */
  set(a: string | Cookie, value?: string, options?: unknown) {
    const cookie = typeof a === "string" ? { name: a, value: value ?? "", options } : a;
    this.jar.set(cookie.name, cookie);
    return this;
  }
  getAll() {
    return [...this.jar.values()];
  }
}

/** Doublure de `NextResponse` : note le genre de réponse (`next`, `redirect`, `json`) et garde un panier de cookies. */
export class NextResponse {
  kind: "next" | "redirect" | "json" = "next";
  cookies = new CookieJar();
  status = 200;
  body: unknown = undefined;
  url: { pathname: string } | undefined;
  static next() {
    fake.calls.push("next");
    return new NextResponse();
  }
  static redirect(url: { pathname: string }, status = 307) {
    fake.calls.push("redirect");
    const r = new NextResponse();
    r.kind = "redirect";
    r.status = status;
    r.url = url;
    return r;
  }
  static json(body: unknown, init?: { status?: number }) {
    fake.calls.push("json");
    const r = new NextResponse();
    r.kind = "json";
    r.status = init?.status ?? 200;
    r.body = body;
    return r;
  }
}

/** Requête minimale : le chemin, un `clone()` modifiable, des cookies lisibles et modifiables. */
export function fakeRequest(pathname: string) {
  const jar = new CookieJar();
  return {
    nextUrl: { pathname, clone: () => ({ pathname }) },
    cookies: { getAll: () => jar.getAll(), set: (name: string, value: string) => jar.set(name, value) },
  };
}
