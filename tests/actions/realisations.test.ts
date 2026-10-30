import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { createRealisation, deleteRealisation, setRealisationPublication, updateRealisation } from "../../app/(app)/realisations/actions.ts";
import { fake, filterValue, form, redirectsTo, routes, toLogin, withHarness } from "../helpers/harness.ts";

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
    // Le propriétaire vient de la base ; la publication ne passe jamais par ce formulaire. Sans case cochée, l'accord est faux.
    for (const key of ["owner_id", "published", "published_at"]) assert.equal(key in payload, false, key);
    assert.equal(payload.client_consent, false);
    assert.deepEqual(fake.revalidated, ["/realisations"]);
  });

  const FULL = { ...VALID, client_name: " Atelier Brume ", client_sector: "Artisanat", result_figure: "-30 % de saisie", link_url: "https://exemple.fr/", client_consent: "on" };
  const FULL_WITHOUT_CONSENT = { ...FULL, client_consent: "" };
  const FULL_PAYLOAD = {
    title: "Assistant RAG",
    description: "Un assistant qui cite ses sources.",
    origin: "demo",
    client_name: "Atelier Brume",
    client_sector: "Artisanat",
    result_figure: "-30 % de saisie",
    link_url: "https://exemple.fr/",
    client_consent: true,
    stack: ["Next.js", "Supabase"],
  };

  test("création : tous les champs, nettoyés, dans l'insertion (et rien d'autre)", async () => {
    await assert.rejects(() => createRealisation({}, form(FULL)), redirectsTo("/realisations"));
    assert.deepEqual(fake.on("realisations", "insert")[0].payload, FULL_PAYLOAD);
  });

  test("modification : tous les champs, nettoyés, dans la mise à jour (et rien d'autre)", async () => {
    fake.respond = () => ({ data: [{ id: ID }] });
    await assert.rejects(() => updateRealisation(ID, {}, form(FULL)), redirectsTo("/realisations"));
    assert.deepEqual(fake.on("realisations", "update")[0].payload, FULL_PAYLOAD);
  });

  test("champs forgés (publié, accord, propriétaire) ignorés", async () => {
    await assert.rejects(() => createRealisation({}, form({ ...VALID, published: "true", client_consent: "on", owner_id: "x" })), redirectsTo("/realisations"));
    const payload = fake.on("realisations", "insert")[0].payload as Record<string, unknown>;
    for (const key of ["owner_id", "published", "published_at"]) assert.equal(key in payload, false, key);
    assert.equal(payload.client_consent, true, "« on » est la seule valeur qui coche l'accord");
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
    await assert.rejects(() => updateRealisation(ID, {}, form({ ...VALID, client_consent: "on" })), redirectsTo("/realisations"));
    const [op] = fake.on("realisations", "update");
    assert.equal(filterValue(op, "eq", "id"), ID);
    assert.equal(op.returning, true);
    assert.equal("published" in (op.payload as object), false, "avec l'accord coché, la publication n'est pas touchée");
  });

  test("modification sans accord coché : dépubliée d'office, tous les champs écrits", async () => {
    fake.respond = () => ({ data: [{ id: ID }] });
    await assert.rejects(() => updateRealisation(ID, {}, form(FULL_WITHOUT_CONSENT)), redirectsTo("/realisations"));
    assert.deepEqual(fake.on("realisations", "update")[0].payload, { ...FULL_PAYLOAD, client_consent: false, published: false });
    assert.ok(fake.revalidated.includes(`/realisations/${ID}/modifier`), "la page de modification est revalidée");
  });

  test("modification : réalisation disparue ou identifiant invalide = « n'existe plus »", async () => {
    assert.match((await updateRealisation(ID, {}, form(VALID))).message ?? "", /n'existe plus/);
    fake.reset();
    assert.match((await updateRealisation("x", {}, form(VALID))).message ?? "", /n'existe plus/);
    assert.equal(fake.ops.length, 0);
  });
});

describe("setRealisationPublication", () => {
  test("publier : filtre sur l'identifiant ET sur l'accord coché, rien d'autre n'est écrit", async () => {
    fake.respond = () => ({ data: [{ id: ID }] });
    assert.deepEqual(await setRealisationPublication(ID, true), {});
    const [op] = fake.on("realisations", "update");
    assert.deepEqual(op.payload, { published: true });
    assert.equal(filterValue(op, "eq", "id"), ID);
    assert.equal(filterValue(op, "eq", "client_consent"), true);
    assert.ok(fake.revalidated.includes("/realisations"));
  });

  test("publier sans accord : aucune ligne touchée mais la fiche existe → message clair", async () => {
    routes(["realisations:update", { data: [] }], ["realisations:select", { data: { id: ID } }]);
    assert.match((await setRealisationPublication(ID, true)).message ?? "", /accord du client/);
    assert.deepEqual(fake.revalidated, []);
  });

  test("publier une fiche disparue ou d'un identifiant invalide : « n'existe plus »", async () => {
    assert.match((await setRealisationPublication(ID, true)).message ?? "", /n'existe plus/);
    fake.reset();
    assert.match((await setRealisationPublication("x", true)).message ?? "", /n'existe plus/);
    assert.equal(fake.ops.length, 0);
  });

  test("sans session : redirection vers la connexion ; argument qui n'est pas un booléen : refusé sans requête", async () => {
    fake.claims = null;
    await assert.rejects(() => setRealisationPublication(ID, true), toLogin);
    fake.reset();
    assert.match((await setRealisationPublication(ID, "false" as unknown as boolean)).message ?? "", /Changement impossible/);
    assert.equal(fake.ops.length, 0);
  });

  test("retirer de la publication : pas de filtre sur l'accord", async () => {
    fake.respond = () => ({ data: [{ id: ID }] });
    assert.deepEqual(await setRealisationPublication(ID, false), {});
    const [op] = fake.on("realisations", "update");
    assert.deepEqual(op.payload, { published: false });
    assert.equal(filterValue(op, "eq", "client_consent"), undefined);
  });

  test("erreur de la base : message, rien de revalidé", async () => {
    fake.respond = () => ({ error: { code: "XX000" } });
    assert.match((await setRealisationPublication(ID, true)).message ?? "", /Changement impossible/);
    assert.deepEqual(fake.revalidated, []);
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
