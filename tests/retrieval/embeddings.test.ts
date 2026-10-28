import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { embedTexts } from "../../lib/ai/embeddings.ts";
import { embeddingsOk, mockFetch, vec, withFakeKey } from "./helpers.ts";

describe("embedTexts", () => {
  test("liste vide : aucun appel", async (t) => {
    withFakeKey(t);
    const calls = mockFetch(t, embeddingsOk);
    assert.deepEqual(await embedTexts([]), []);
    assert.equal(calls.length, 0);
  });

  test("35 textes : trois lots (16, 16, 3), vecteurs rendus dans l'ordre des textes", async (t) => {
    withFakeKey(t);
    const calls = mockFetch(t, embeddingsOk);
    const texts = Array.from({ length: 35 }, (_, i) => `t${i}`);
    const vectors = await embedTexts(texts);
    assert.deepEqual(calls.map((c) => c.input.length), [16, 16, 3]);
    assert.deepEqual(calls.flatMap((c) => c.input), texts); // ordre conservé d'un lot à l'autre
    assert.deepEqual(vectors, texts.map((_, i) => vec(i)));
    const first = calls[0].init;
    assert.equal(first.method, "POST");
    assert.equal((first.headers as Record<string, string>).Authorization, "Bearer cle-factice-SECRETE");
    assert.ok(first.signal instanceof AbortSignal); // le délai est bien branché
  });

  test("statut non OK : erreur sans la clé ni le texte, les lots suivants ne partent pas", async (t) => {
    withFakeKey(t);
    const calls = mockFetch(t, () => new Response("quota", { status: 429 }));
    const texts = Array.from({ length: 20 }, (_, i) => `SENTINELLE${i}`);
    await assert.rejects(embedTexts(texts), (e: Error) => {
      assert.equal(e.message, "Mistral a répondu 429.");
      assert.ok(!e.message.includes("SECRETE") && !e.message.includes("SENTINELLE"));
      return true;
    });
    assert.equal(calls.length, 1);
  });

  test("délai dépassé : l'erreur de fetch remonte", async (t) => {
    withFakeKey(t);
    t.mock.method(globalThis, "fetch", async () => {
      throw new DOMException("délai", "TimeoutError");
    });
    await assert.rejects(embedTexts(["t1"]), { name: "TimeoutError" });
  });

  test("clé absente : erreur qui nomme la variable, aucun appel", async (t) => {
    withFakeKey(t, "  ");
    const calls = mockFetch(t, embeddingsOk);
    await assert.rejects(embedTexts(["t1"]), /MISTRAL_API_KEY/);
    assert.equal(calls.length, 0);
  });

  test("réponse inattendue (mauvais nombre de vecteurs) : erreur", async (t) => {
    withFakeKey(t);
    mockFetch(t, () => Response.json({ data: [] }));
    await assert.rejects(embedTexts(["t1"]), /inattendue/);
  });
});
