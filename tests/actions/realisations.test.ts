import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { createRealisation, deleteRealisation, updateRealisation } from "../../app/(app)/realisations/actions.ts";
import { fake, filterValue, form, redirectsTo, withHarness } from "../helpers/harness.ts";

const ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

const VALID = { title: "Assistant RAG", description: "Un assistant qui cite ses sources.", origin: "demo", stack: "Next.js, Supabase" };

withHarness();

describe("createRealisation / updateRealisation", () => {
  test("création valide : insertion sans propriétaire ni publication, retour à la liste", async () => {
    await assert.rejects(() => createRealisation({}, form(VALID)), redirectsTo("/realisations"));
    const [op] = fake.on("realisations", "insert");
    const payload = op.payload as Record<string, unknown>;
    assert.equal(payload.title, "Assistant RAG");
    assert.deepEqual(payload.stack, ["Next.js", "Supabase"]);
    assert.equal(payload.client_name, null);
    // Le propriétaire vient de la base ; accord et publication ne passent jamais par ce formulaire (6.2).
    for (const key of ["owner_id", "published", "published_at", "client_consent"]) assert.equal(key in payload, false, key);
    assert.deepEqual(fake.revalidated, ["/realisations"]);
  });

  test("champs forgés (publié, accord, propriétaire) ignorés", async () => {
    await assert.rejects(() => createRealisation({}, form({ ...VALID, published: "true", client_consent: "on", owner_id: "x" })), redirectsTo("/realisations"));
    const payload = fake.on("realisations", "insert")[0].payload as Record<string, unknown>;
    for (const key of ["owner_id", "published", "client_consent"]) assert.equal(key in payload, false, key);
  });

  test("saisie invalide : erreurs par champ et valeurs rendues, aucune requête", async () => {
    const r = await createRealisation({}, form({ ...VALID, title: "  ", origin: "" }));
    assert.ok(r.errors?.title && r.errors.origin);
    assert.equal(r.values?.description, VALID.description);
    assert.equal(fake.ops.length, 0);
  });

  test("erreur de la base : message, pas de redirection", async () => {
    fake.respond = () => ({ error: { code: "XX000" } });
    assert.match((await createRealisation({}, form(VALID))).message ?? "", /Enregistrement impossible/);
    assert.deepEqual(fake.revalidated, []);
  });

  test("modification : filtre sur l'identifiant, relue, retour à la liste", async () => {
    fake.respond = () => ({ data: [{ id: ID }] });
    await assert.rejects(() => updateRealisation(ID, {}, form(VALID)), redirectsTo("/realisations"));
    const [op] = fake.on("realisations", "update");
    assert.equal(filterValue(op, "eq", "id"), ID);
    assert.equal(op.returning, true);
    assert.equal("published" in (op.payload as object), false);
  });

  test("modification : réalisation disparue ou identifiant invalide = « n'existe plus »", async () => {
    assert.match((await updateRealisation(ID, {}, form(VALID))).message ?? "", /n'existe plus/);
    fake.reset();
    assert.match((await updateRealisation("x", {}, form(VALID))).message ?? "", /n'existe plus/);
    assert.equal(fake.ops.length, 0);
  });
});

describe("deleteRealisation", () => {
  test("suppression filtrée sur l'identifiant, relue, retour à la liste", async () => {
    fake.respond = () => ({ data: [{ id: ID }] });
    await assert.rejects(() => deleteRealisation(ID), redirectsTo("/realisations"));
    const [op] = fake.on("realisations", "delete");
    assert.equal(filterValue(op, "eq", "id"), ID);
    assert.equal(op.returning, true);
  });

  test("absente, invalide ou en erreur : message, jamais de redirection", async () => {
    assert.match((await deleteRealisation(ID)).message ?? "", /n'existe plus/);
    assert.match((await deleteRealisation("x")).message ?? "", /n'existe plus/);
    fake.respond = () => ({ error: { code: "XX000" } });
    assert.match((await deleteRealisation(ID)).message ?? "", /Suppression impossible/);
  });
});
