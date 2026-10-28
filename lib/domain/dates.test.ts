import assert from "node:assert/strict";
import test from "node:test";

import { addDays, dayFromNumber, dayNumber, daysBetween, daysInMonth } from "./dates.ts";

test("dayNumber et dayFromNumber : aller-retour, dont le jour de changement d'heure", () => {
  for (const d of ["1970-01-01", "2026-03-29", "2026-10-25", "2028-02-29"]) assert.equal(dayFromNumber(dayNumber(d)), d);
  assert.equal(dayNumber("1970-01-02"), 1);
});

test("addDays : passe les fins de mois et d'année, négatif accepté", () => {
  assert.equal(addDays("2026-10-28", 4), "2026-11-01");
  assert.equal(addDays("2026-12-31", 1), "2027-01-01");
  assert.equal(addDays("2026-03-01", -1), "2026-02-28");
  assert.equal(addDays("2028-02-28", 1), "2028-02-29");
});

test("daysBetween : signé, exact au changement d'heure du 25 octobre 2026", () => {
  assert.equal(daysBetween("2026-10-24", "2026-10-26"), 2);
  assert.equal(daysBetween("2026-10-28", "2026-10-25"), -3);
  assert.equal(daysBetween("2026-10-28", "2026-10-28"), 0);
});

test("daysInMonth : mois courts et février bissextile", () => {
  assert.equal(daysInMonth(2026, 2), 28);
  assert.equal(daysInMonth(2028, 2), 29);
  assert.equal(daysInMonth(2026, 4), 30);
  assert.equal(daysInMonth(2026, 12), 31);
});
