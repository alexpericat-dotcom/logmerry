import assert from "node:assert/strict";
import { beforeEach, describe, test } from "node:test";

import { SESSION_EXPIRED } from "../../lib/auth.ts";
import { updateSession } from "../../lib/supabase/proxy.ts";
import { fakeRequest, NextResponse } from "../helpers/stubs/next-server-proxy.ts";
import { fake } from "../helpers/stubs/proxy-fake.ts";

beforeEach(() => fake.reset());

const run = (pathname: string, signedIn: boolean, refreshCookie = false) => {
  fake.claims = signedIn ? { sub: "u1" } : null;
  fake.refreshCookie = refreshCookie;
  return updateSession(fakeRequest(pathname) as never) as unknown as Promise<NextResponse>;
};
const names = (r: NextResponse) => r.cookies.getAll().map((c) => c.name);

describe("updateSession : câblage de la garde d'accès", () => {
  test("racine : connecté vers le cockpit, déconnecté vers la connexion ; les cookies rafraîchis sont repris sur CETTE redirection", async () => {
    const inn = await run("/", true, true);
    assert.deepEqual([inn.kind, inn.url?.pathname], ["redirect", "/aujourd-hui"]);
    assert.deepEqual(names(inn), ["sb-session"]);
    const out = await run("/", false, true);
    assert.deepEqual([out.kind, out.url?.pathname], ["redirect", "/auth/login"]);
    assert.deepEqual(names(out), ["sb-session"]);
  });

  test("page privée sans session : redirection vers la connexion, cookies NON repris (comportement d'origine)", async () => {
    const r = await run("/clients", false, true);
    assert.deepEqual([r.kind, r.url?.pathname], ["redirect", "/auth/login"]);
    assert.deepEqual(names(r), []);
  });

  test("page privée avec session : la réponse du client est rendue telle quelle, avec le cookie rafraîchi", async () => {
    const r = await run("/clients", true, true);
    assert.equal(r.kind, "next");
    assert.deepEqual(names(r), ["sb-session"]);
    assert.ok(!fake.calls.includes("redirect") && !fake.calls.includes("json"));
  });

  test("page publique : passe sans session", async () => {
    for (const path of ["/auth/login", "/auth/confirm", "/auth/error"]) {
      const r = await run(path, false);
      assert.equal(r.kind, "next", path);
    }
  });

  test("API : sans session 401 JSON (pas de redirection), avec session elle passe", async () => {
    const out = await run("/api/chat", false);
    assert.deepEqual([out.kind, out.status], ["json", 401]);
    assert.deepEqual(out.body, { error: SESSION_EXPIRED });
    assert.ok(!fake.calls.includes("redirect"));
    assert.deepEqual(names(out), []);
    const refreshed = await run("/api/chat", false, true); // le client a rafraîchi des cookies : aucun n'est copié sur le 401 (décision de la spec, comme pour les redirections de pages)
    assert.deepEqual(names(refreshed), []);
    const inn = await run("/api/chat", true);
    assert.equal(inn.kind, "next");
  });

  test("ordre : le client est créé puis `getClaims` appelé UNE fois, avant toute décision", async () => {
    for (const [path, signedIn] of [["/", true], ["/clients", false], ["/api/chat", false], ["/auth/login", false]] as const) {
      fake.reset();
      await run(path, signedIn);
      const decided = fake.calls.findIndex((c) => c === "redirect" || c === "json");
      assert.equal(fake.calls.filter((c) => c === "getClaims").length, 1, path);
      assert.ok(fake.calls.indexOf("createServerClient") < fake.calls.indexOf("getClaims"), path);
      if (decided !== -1) assert.ok(fake.calls.indexOf("getClaims") < decided, path);
    }
  });

  test("la session se lit dans les claims : sans claims (`data` nul) on est déconnecté", async () => {
    fake.claims = null;
    const r = (await updateSession(fakeRequest("/clients") as never)) as unknown as NextResponse;
    assert.equal(r.kind, "redirect");
  });
});
