import assert from "node:assert/strict";
import test from "node:test";

import { formatScore } from "./matching.ts";

test("score affiché avec deux décimales et une virgule", () => {
  assert.equal(formatScore(0.7912), "0,79");
  assert.equal(formatScore(1), "1,00");
  assert.equal(formatScore(0.8), "0,80");
});
