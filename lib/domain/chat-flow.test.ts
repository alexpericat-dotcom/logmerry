import assert from "node:assert/strict";
import test from "node:test";

import { NOT_FOUND, answerQuestion } from "./chat-flow.ts";

test("aucun extrait : réponse fixe et Claude n'est jamais appelé", async () => {
  let asked = false;
  const out = await answerQuestion("q", {
    retrieve: async () => [],
    ask: async () => {
      asked = true;
      return { answer: "x" };
    },
  });
  assert.deepEqual(out, { answer: NOT_FOUND, found: false });
  assert.equal(asked, false);
});

test("des extraits : Claude reçoit la question et exactement ces extraits", async () => {
  let received: unknown[] = [];
  const out = await answerQuestion("Quelle est la procédure ?", {
    retrieve: async () => [{ id: "c1" }, { id: "c2" }],
    ask: async (q, chunks) => {
      received = [q, chunks];
      return { answer: "Réponse." };
    },
  });
  assert.deepEqual(out, { answer: "Réponse.", found: true });
  assert.deepEqual(received, ["Quelle est la procédure ?", [{ id: "c1" }, { id: "c2" }]]);
});

test("une panne de la recherche ou de Claude remonte (la route la traduit en 502)", async () => {
  await assert.rejects(answerQuestion("q", { retrieve: async () => { throw new Error("match_chunks"); }, ask: async () => ({ answer: "" }) }), /match_chunks/);
  await assert.rejects(answerQuestion("q", { retrieve: async () => [1], ask: async () => { throw new Error("Claude a répondu 500."); } }), /500/);
});
