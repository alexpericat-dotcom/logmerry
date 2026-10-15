import assert from "node:assert/strict";
import test from "node:test";

import { NEW_CLIENT, validateLink } from "./note-link.ts";

const ID = "11111111-2222-3333-4444-555555555555";
const base = { client_id: "", new_name: "", new_origin: "" };

test("aucune fiche, fiche existante, identifiant invalide", () => {
  assert.deepEqual(validateLink(base), { ok: true, link: { kind: "none" } });
  assert.deepEqual(validateLink({ ...base, client_id: ID }), { ok: true, link: { kind: "existing", id: ID } });
  const bad = validateLink({ ...base, client_id: "x" });
  assert.equal(bad.ok, false);
});

test("nouvelle fiche : nom et origine obligatoires, nom nettoyé", () => {
  const empty = validateLink({ ...base, client_id: NEW_CLIENT });
  assert.equal(empty.ok, false);
  if (!empty.ok) assert.ok(empty.errors.new_name && empty.errors.new_origin);
  const ok = validateLink({ client_id: NEW_CLIENT, new_name: "  École Lanterne ", new_origin: "demo" });
  assert.deepEqual(ok, { ok: true, link: { kind: "new", name: "École Lanterne", origin: "demo" } });
});
