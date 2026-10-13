import assert from "node:assert/strict";
import test from "node:test";

import { SEARCH_MAX, normalizeQuery } from "./search.ts";

test("espaces réduits et retirés aux bords", () => {
  assert.equal(normalizeQuery("  rendez   vous \n"), "rendez vous");
});

test("rien à chercher : chaîne vide", () => {
  assert.equal(normalizeQuery("   "), "");
});

test("100 caractères au plus", () => {
  assert.equal([...normalizeQuery("é".repeat(SEARCH_MAX + 50))].length, SEARCH_MAX);
});
