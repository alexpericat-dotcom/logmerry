import assert from "node:assert/strict";
import test from "node:test";

import { todayParis } from "./format.ts";

test("todayParis : le jour de Paris, pas celui d'UTC (passage de minuit, heure d'été et d'hiver)", () => {
  assert.equal(todayParis(new Date("2026-10-23T21:59:59Z")), "2026-10-23", "23 h 59 min 59 s à Paris (CEST)");
  assert.equal(todayParis(new Date("2026-10-23T22:00:00Z")), "2026-10-24", "minuit à Paris (CEST) : le jour a changé alors qu'UTC dit 22 h");
  assert.equal(todayParis(new Date("2026-12-31T22:59:59Z")), "2026-12-31", "23 h 59 min 59 s à Paris (CET)");
  assert.equal(todayParis(new Date("2026-12-31T23:00:00Z")), "2027-01-01", "minuit du nouvel an à Paris (CET)");
  assert.equal(todayParis(new Date("2028-02-28T23:00:00Z")), "2028-02-29", "29 février d'une année bissextile");
  assert.equal(todayParis(new Date("2026-03-29T00:30:00Z")), "2026-03-29", "nuit du passage à l'heure d'été");
});
