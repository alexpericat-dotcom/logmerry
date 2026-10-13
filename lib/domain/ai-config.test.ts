import assert from "node:assert/strict";
import test from "node:test";

import { readAiConfig } from "./ai-config.ts";

const ENV = { ANTHROPIC_API_KEY: "a-secret", MISTRAL_API_KEY: "m-secret", AI_CHAT_MODEL: "un-modele" };

test("les trois variables présentes : configuration renvoyée", () => {
  assert.deepEqual(readAiConfig(ENV), {
    anthropicApiKey: "a-secret",
    mistralApiKey: "m-secret",
    chatModel: "un-modele",
  });
});

test("variable absente ou vide : l'erreur nomme la variable, jamais une valeur", () => {
  for (const name of Object.keys(ENV)) {
    for (const bad of [undefined, "", "   "]) {
      assert.throws(
        () => readAiConfig({ ...ENV, [name]: bad }),
        (e: Error) => e.message.includes(name) && !/secret/.test(e.message),
      );
    }
  }
});
