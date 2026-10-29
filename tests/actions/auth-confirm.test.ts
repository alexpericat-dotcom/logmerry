import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { GET } from "../../app/auth/confirm/route.ts";
import { fake, redirectsTo, withHarness } from "../helpers/harness.ts";

withHarness();

const get = (query: string) => GET(new Request(`http://localhost/auth/confirm${query}`) as never);
const ERROR = redirectsTo("/auth/error");

describe("GET /auth/confirm", () => {
  test("code valide : échangé contre une session, redirection vers `next`", async () => {
    await assert.rejects(get("?code=abc&next=/auth/update-password"), redirectsTo("/auth/update-password"));
    assert.deepEqual(fake.exchange.codes, ["abc"]);
  });

  test("sans `next` (absent ou vide) : redirection vers /", async () => {
    await assert.rejects(get("?code=abc"), redirectsTo("/"));
    await assert.rejects(get("?code=abc&next="), redirectsTo("/"));
  });

  test("échange réussi dont `error` est `undefined` (et non `null`) : session ouverte", async () => {
    fake.exchange.reply = { error: undefined };
    await assert.rejects(get("?code=abc&next=/clients"), redirectsTo("/clients"));
  });

  test("`next` dangereux : redirection vers /, jamais l'adresse reçue", async () => {
    for (const next of ["//evil.com", "https://evil.com", "/a\\b", "evil.com", "/a\r\nSet-Cookie: x=1", "/a\u0000b"]) {
      await assert.rejects(get(`?code=abc&next=${encodeURIComponent(next)}`), redirectsTo("/"), next);
    }
  });

  test("code absent : /auth/error, aucun échange", async () => {
    await assert.rejects(get("?next=/clients"), ERROR);
    await assert.rejects(get("?code=&next=/clients"), ERROR);
    assert.deepEqual(fake.exchange.codes, []);
  });

  test("échange refusé : /auth/error, même avec un `next` valide", async () => {
    fake.exchange.reply = { error: { message: "code expiré" } };
    await assert.rejects(get("?code=abc&next=/clients"), ERROR);
    assert.deepEqual(fake.exchange.codes, ["abc"]);
  });

  test("échange qui lève (réseau) : /auth/error, pas de plantage", async () => {
    fake.exchange.reply = new Error("réseau");
    await assert.rejects(get("?code=abc"), ERROR);
    assert.deepEqual(fake.exchange.codes, ["abc"]); // l'échange a bien été tenté
  });

  test("client impossible (createClient lève) : /auth/error, pas de plantage, aucun échange", async () => {
    fake.failCreate = true;
    await assert.rejects(get("?code=abc"), ERROR);
    assert.deepEqual(fake.exchange.codes, []);
  });
});
