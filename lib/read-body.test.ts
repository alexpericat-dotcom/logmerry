import assert from "node:assert/strict";
import { test } from "node:test";

import { readTextBounded } from "./read-body.ts";

const chunked = (parts: string[]) =>
  new Request("http://localhost/x", {
    method: "POST",
    duplex: "half",
    body: new ReadableStream({
      start(c) {
        for (const p of parts) c.enqueue(new TextEncoder().encode(p));
        c.close();
      },
    }),
  } as RequestInit);

test("corps sans longueur annoncée (par morceaux) : lu en entier tant qu'il reste sous la limite, accents compris", async () => {
  assert.equal(await readTextBounded(chunked(['{"question":"', "é", 'a"}']), 100), '{"question":"éa"}');
});

test("corps trop gros, même sans `content-length` : abandonné (null) sans tout lire", async () => {
  assert.equal(await readTextBounded(chunked(["x".repeat(60), "y".repeat(60)]), 100), null);
});

test("pile à la limite : permis ; un octet de plus : refusé", async () => {
  assert.equal((await readTextBounded(chunked(["x".repeat(100)]), 100))?.length, 100);
  assert.equal(await readTextBounded(chunked(["x".repeat(101)]), 100), null);
});

test("requête sans corps : texte vide", async () => {
  assert.equal(await readTextBounded(new Request("http://localhost/x"), 100), "");
});
