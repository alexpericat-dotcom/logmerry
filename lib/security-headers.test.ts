import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { securityHeaders } from "./security-headers.ts";

const get = (h: { key: string; value: string }[], key: string) => h.find((x) => x.key === key)?.value;

describe("securityHeaders", () => {
  const h = securityHeaders("https://abc.supabase.co/");

  test("les cinq en-têtes bloquants ont leur valeur exacte", () => {
    assert.equal(get(h, "X-Frame-Options"), "DENY");
    assert.equal(get(h, "X-Content-Type-Options"), "nosniff");
    assert.equal(get(h, "Referrer-Policy"), "strict-origin-when-cross-origin");
    assert.equal(get(h, "Strict-Transport-Security"), "max-age=63072000; includeSubDomains");
    assert.equal(get(h, "Permissions-Policy"), "camera=(), microphone=(), geolocation=()");
  });

  test("la CSP est en mode rapport seulement, jamais bloquante, et interdit les cadres", () => {
    assert.equal(get(h, "Content-Security-Policy"), undefined);
    const csp = get(h, "Content-Security-Policy-Report-Only") ?? "";
    assert.ok(csp.includes("frame-ancestors 'none'"));
    assert.ok(csp.includes("default-src 'self'"));
  });

  test("connect-src autorise l'origine de Supabase (sans chemin) et rien d'autre", () => {
    const csp = get(h, "Content-Security-Policy-Report-Only") ?? "";
    assert.ok(csp.includes("connect-src 'self' https://abc.supabase.co;"));
    assert.ok(!csp.includes("https://abc.supabase.co/"));
  });

  test("sans URL Supabase : connect-src se limite à 'self'", () => {
    const csp = get(securityHeaders(undefined), "Content-Security-Policy-Report-Only") ?? "";
    assert.ok(csp.includes("connect-src 'self';"));
  });

  test("URL Supabase invalide, vide ou faite d'espaces : pas d'exception, connect-src se limite à 'self'", () => {
    for (const bad of ["your-project-url", "   ", ""]) {
      const csp = get(securityHeaders(bad), "Content-Security-Policy-Report-Only") ?? "";
      assert.ok(csp.includes("connect-src 'self';"), bad);
    }
  });

  test("la CSP autorise les images du bucket public de Supabase (page du portfolio)", () => {
    const csp = get(securityHeaders("https://abc.supabase.co"), "Content-Security-Policy-Report-Only") ?? "";
    const imgSrc = csp.split("; ").find((d) => d.startsWith("img-src"));
    assert.equal(imgSrc, "img-src 'self' data: https://abc.supabase.co");
    const without = get(securityHeaders(undefined), "Content-Security-Policy-Report-Only") ?? "";
    assert.equal(without.split("; ").find((d) => d.startsWith("img-src")), "img-src 'self' data:");
  });

  test("la CSP n'autorise les cadres que vers des adresses https (aperçu en direct des réalisations)", () => {
    const csp = get(h, "Content-Security-Policy-Report-Only") ?? "";
    assert.ok(csp.split("; ").includes("frame-src https:"));
  });

  test("la CSP couvre aussi base-uri, form-action et object-src", () => {
    const csp = get(h, "Content-Security-Policy-Report-Only") ?? "";
    for (const d of ["base-uri 'self'", "form-action 'self'", "object-src 'none'", "script-src 'self'", "img-src 'self' data:"]) assert.ok(csp.includes(d), d);
  });
});
