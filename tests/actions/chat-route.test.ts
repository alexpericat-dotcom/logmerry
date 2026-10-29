import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { POST } from "../../app/api/chat/route.ts";
import { QUOTA_MESSAGES } from "../../lib/domain/ai-quota.ts";
import { fake, withHarness } from "../helpers/harness.ts";

withHarness();

const ask = (question: unknown) => POST(new Request("http://localhost/api/chat", { method: "POST", body: JSON.stringify({ question }) }));

describe("/api/chat : plafond d'appels à l'IA", () => {
  test("plafond atteint : 429 (minute, jour) ou 503 (compteur en panne), le message du plafond, ni vectorisation ni lecture de notes", async () => {
    for (const [quota, status] of [["minute", 429], ["day", 429], ["error", 503]] as const) {
      fake.reset();
      fake.quota = quota;
      const res = await ask("Quelle durée de session ?");
      assert.equal(res.status, status, quota);
      assert.deepEqual(await res.json(), { error: QUOTA_MESSAGES[quota] }, quota);
      assert.equal(fake.ai.calls.length, 0, quota);
      assert.equal(fake.ops.length, 0, quota);
    }
  });

  test("question vide : 400 sans consommer de plafond ; sans session : 401 sans consommer de plafond", async () => {
    assert.equal((await ask("   ")).status, 400);
    fake.claims = null;
    assert.equal((await ask("Une vraie question")).status, 401);
    assert.equal(fake.quotaCalls, 0);
  });

  test("plafond permis : le plafond est compté avant toute lecture, une seule fois, puis la recherche part", async () => {
    let countedAtFirstOp = -1;
    fake.respond = () => {
      if (countedAtFirstOp < 0) countedAtFirstOp = fake.quotaCalls;
      return { data: [], error: null };
    };
    const res = await ask("Quelle durée de session ?");
    assert.equal(res.status, 200);
    assert.equal(countedAtFirstOp, 1, "le plafond doit être compté avant la première lecture");
    assert.equal(fake.quotaCalls, 1);
    assert.ok(fake.ops.length > 0, "la recherche est partie");
  });
});
