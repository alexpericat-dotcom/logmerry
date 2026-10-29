import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { createDraftFromQuestion, createNote, deleteNote, retryIndexing, updateNote } from "../../app/(app)/notes/actions.ts";
import { fake, filterValue, form, redirectsTo, withHarness } from "../helpers/harness.ts";

const ID = "12121212-1212-4212-8212-121212121212";
const CLIENT = "34343434-3434-4434-8434-343434343434";

const VALID = { title: "Compte rendu", body: "Texte de la note", type: "note", client_id: "", new_name: "", new_origin: "" };
const REFRESHED = ["/notes", "/a-faire", "/aujourd-hui"];

withHarness();

describe("createNote", () => {
  test("sans fiche liée : insère avec client_id nul, relit l'identifiant, indexe la note, revalide, redirige vers la liste", async () => {
    fake.respond = () => ({ data: [{ id: ID }] });
    await assert.rejects(() => createNote({}, form(VALID)), redirectsTo("/notes"));
    const [op] = fake.on("notes", "insert");
    assert.equal((op.payload as { client_id: string | null }).client_id, null);
    assert.equal(op.returning, true);
    assert.equal("owner_id" in (op.payload as object), false); // le propriétaire vient de la base, jamais du formulaire
    assert.deepEqual(fake.indexed, [ID]);
    assert.deepEqual(fake.revalidated, REFRESHED);
  });

  test("l'indexation échoue : la note est tout de même enregistrée (retour à la liste), jamais d'erreur de sauvegarde", async () => {
    fake.respond = () => ({ data: [{ id: ID }] });
    fake.indexResult = "failed";
    await assert.rejects(() => createNote({}, form(VALID)), redirectsTo("/notes"));
    await assert.rejects(() => updateNote(ID, {}, form(VALID)), redirectsTo("/notes"));
    assert.deepEqual(fake.indexed, [ID, ID]);
  });

  test("lecture de la fiche liée en erreur, ou création de la nouvelle fiche en erreur : message, aucune note écrite", async () => {
    fake.respond = (op) => (op.table === "clients" ? { error: { code: "XX000" } } : { data: [{ id: ID }] });
    assert.match((await createNote({}, form({ ...VALID, client_id: CLIENT }))).message ?? "", /Enregistrement impossible/);
    assert.match((await createNote({}, form({ ...VALID, client_id: "new", new_name: "Prospect", new_origin: "demo" }))).message ?? "", /Enregistrement impossible/);
    assert.equal(fake.on("notes").length, 0);
    assert.deepEqual(fake.indexed, []);
  });

  test("fiche existante : vérifiée avant l'écriture ; disparue = « fiche n'existe plus », aucune note créée", async () => {
    fake.respond = (op) => (op.table === "clients" ? { data: [] } : { data: [{ id: ID }] });
    assert.match((await createNote({}, form({ ...VALID, client_id: CLIENT }))).message ?? "", /fiche n'existe plus/);
    assert.equal(filterValue(fake.on("clients", "select")[0], "eq", "id"), CLIENT);
    assert.equal(fake.on("notes").length, 0);
    assert.deepEqual(fake.indexed, []);
  });

  test("nouvelle fiche sur place : créée comme prospect, puis liée à la note", async () => {
    fake.respond = (op) => ({ data: [{ id: op.table === "clients" ? CLIENT : ID }] });
    await assert.rejects(() => createNote({}, form({ ...VALID, client_id: "new", new_name: "Nouveau prospect", new_origin: "demo" })), redirectsTo("/notes"));
    const [client] = fake.on("clients", "insert");
    assert.equal((client.payload as { status: string }).status, "prospect");
    assert.equal((fake.on("notes", "insert")[0].payload as { client_id: string }).client_id, CLIENT);
  });

  test("saisie invalide : erreurs par champ, aucune requête ; erreur d'écriture : message, pas d'indexation", async () => {
    assert.ok((await createNote({}, form({ ...VALID, title: " " }))).errors?.title);
    assert.equal(fake.ops.length, 0);
    fake.respond = () => ({ error: { code: "XX000" } });
    assert.match((await createNote({}, form(VALID))).message ?? "", /Enregistrement impossible/);
    assert.deepEqual(fake.indexed, []);
    assert.deepEqual(fake.revalidated, []);
  });
});

describe("updateNote", () => {
  test("repasse l'indexation à « pending », filtre sur l'identifiant, relit, indexe la note", async () => {
    fake.respond = () => ({ data: [{ id: ID }] });
    await assert.rejects(() => updateNote(ID, {}, form(VALID)), redirectsTo("/notes"));
    const [op] = fake.on("notes", "update");
    assert.equal((op.payload as { index_status: string }).index_status, "pending");
    assert.equal(filterValue(op, "eq", "id"), ID);
    assert.equal(op.returning, true);
    assert.deepEqual(fake.indexed, [ID]);
  });

  test("note disparue ou identifiant invalide : « n'existe plus », rien d'indexé", async () => {
    assert.match((await updateNote(ID, {}, form(VALID))).message ?? "", /note n'existe plus/);
    fake.reset();
    assert.match((await updateNote("x", {}, form(VALID))).message ?? "", /note n'existe plus/);
    assert.equal(fake.on("notes").length, 0);
    assert.deepEqual(fake.indexed, []);
  });
});

describe("retour sur la liste filtrée (createNote, updateNote, deleteNote)", () => {
  const ok = () => {
    fake.respond = () => ({ data: [{ id: ID }] });
  };

  test("enregistrer : retour sur le filtre d'où l'on vient (type, brouillons), relu côté serveur", async () => {
    ok();
    await assert.rejects(() => createNote({}, form({ ...VALID, list_type: "procedure" })), redirectsTo("/notes?type=procedure"));
    await assert.rejects(() => updateNote(ID, {}, form({ ...VALID, list_statut: "brouillon" })), redirectsTo("/notes?statut=brouillon"));
    await assert.rejects(() => updateNote(ID, {}, form({ ...VALID, list_type: "faq", list_statut: "brouillon" })), redirectsTo("/notes?statut=brouillon"));
  });

  test("filtre falsifié : retour sur /notes, jamais l'adresse reçue", async () => {
    ok();
    for (const bad of ["https://evil.example", "//evil.example", "/clients", "<script>", "procedure&x=1", "PROCEDURE"]) {
      await assert.rejects(() => createNote({}, form({ ...VALID, list_type: bad, list_statut: bad })), redirectsTo("/notes"), bad);
    }
  });

  test("note disparue ou écriture en échec avec un filtre : message, aucune redirection", async () => {
    fake.respond = () => ({ data: [] });
    assert.match((await updateNote(ID, {}, form({ ...VALID, list_type: "procedure" }))).message ?? "", /note n'existe plus/);
    fake.respond = () => ({ error: { code: "XX000" } });
    assert.match((await updateNote(ID, {}, form({ ...VALID, list_type: "procedure" }))).message ?? "", /Enregistrement impossible/);
  });

  test("supprimer : retour sur le filtre (type, brouillons) ; valeur inconnue : /notes", async () => {
    ok();
    await assert.rejects(() => deleteNote(ID, { type: "template" }), redirectsTo("/notes?type=template"));
    await assert.rejects(() => deleteNote(ID, { draft: true }), redirectsTo("/notes?statut=brouillon"));
    await assert.rejects(() => deleteNote(ID, { type: "https://evil.example" }), redirectsTo("/notes"));
    await assert.rejects(() => deleteNote(ID, { type: "faq", draft: true }), redirectsTo("/notes?statut=brouillon")); // les brouillons l'emportent
    await assert.rejects(() => deleteNote(ID, { type: { toString: () => "faq" } as unknown as string }), redirectsTo("/notes")); // un objet n'est jamais relu
    await assert.rejects(() => deleteNote(ID), redirectsTo("/notes"));
  });
});

describe("deleteNote", () => {
  test("suppression filtrée sur l'identifiant, relue, trois pages revalidées, retour à la liste", async () => {
    fake.respond = () => ({ data: [{ id: ID }] });
    await assert.rejects(() => deleteNote(ID), redirectsTo("/notes"));
    const [op] = fake.on("notes", "delete");
    assert.equal(filterValue(op, "eq", "id"), ID);
    assert.equal(op.returning, true);
    assert.deepEqual(fake.revalidated, REFRESHED);
  });

  test("aucune ligne : « n'existe plus » ; erreur : « conservée »", async () => {
    assert.match((await deleteNote(ID)).message ?? "", /n'existe plus/);
    fake.respond = () => ({ error: { code: "XX000" } });
    assert.match((await deleteNote(ID)).message ?? "", /conservée/);
  });
});

describe("retryIndexing", () => {
  test("relit la note puis l'indexe ; revalide aussi la fiche de la note", async () => {
    fake.respond = () => ({ data: [{ title: "T", body: "B" }] });
    assert.deepEqual(await retryIndexing(ID), {});
    assert.deepEqual(fake.indexed, [ID]);
    assert.equal(filterValue(fake.on("notes", "select")[0], "eq", "id"), ID); // relit LA note visée
    assert.deepEqual(fake.revalidated, [...REFRESHED, `/notes/${ID}`]);
  });

  test("erreur de lecture = indexation impossible (pas « note supprimée ») ; note absente = « n'existe plus » ; échec d'indexation = message", async () => {
    fake.respond = () => ({ error: { code: "XX000" } });
    assert.match((await retryIndexing(ID)).message ?? "", /Indexation impossible/);
    fake.reset();
    assert.match((await retryIndexing(ID)).message ?? "", /n'existe plus/);
    fake.reset();
    fake.respond = () => ({ data: [{ title: "T", body: "B" }] });
    fake.indexResult = "failed";
    assert.match((await retryIndexing(ID)).message ?? "", /Indexation impossible/);
  });
});

describe("createDraftFromQuestion", () => {
  test("crée un brouillon vide, déjà « indexed » (rien à envoyer à l'IA), jamais indexé", async () => {
    fake.respond = (op) => (op.op === "insert" ? { data: [{ id: ID }] } : { data: [] });
    const r = await createDraftFromQuestion("Comment relancer une facture ?");
    assert.deepEqual(r, { ok: true, id: ID, title: "À documenter : Comment relancer une facture ?", existing: false });
    const [op] = fake.on("notes", "insert");
    assert.deepEqual(op.payload, { title: r.ok ? r.title : "", body: "", type: "note", status: "draft", index_status: "indexed" });
    assert.deepEqual(fake.indexed, []);
    assert.deepEqual(fake.revalidated, REFRESHED);
  });

  test("la même question ne crée pas de doublon : le brouillon existant est renvoyé", async () => {
    fake.respond = () => ({ data: [{ id: ID }] });
    const r = await createDraftFromQuestion("Comment relancer une facture ?");
    assert.equal(r.ok && r.existing, true);
    assert.equal(fake.on("notes", "insert").length, 0);
    const [read] = fake.on("notes", "select");
    assert.equal(filterValue(read, "eq", "status"), "draft");
    assert.equal(filterValue(read, "eq", "title"), "À documenter : Comment relancer une facture ?"); // la MÊME question, pas n'importe quel brouillon
  });

  test("question vide ou faite d'espaces : échec sans requête ; très longue : bornée", async () => {
    for (const q of ["", "   \n ", null as unknown as string, undefined as unknown as string]) assert.equal((await createDraftFromQuestion(q)).ok, false);
    assert.equal(fake.ops.length, 0);
    fake.respond = (op) => (op.op === "insert" ? { data: [{ id: ID }] } : { data: [] });
    const r = await createDraftFromQuestion("a".repeat(5000));
    assert.ok(r.ok && r.title.length <= 200);
  });
});

test("sans session : redirection vers la connexion, aucune requête ni indexation", async () => {
  fake.claims = null;
  await assert.rejects(() => createNote({}, form(VALID)), redirectsTo("/auth/login"));
  await assert.rejects(() => updateNote(ID, {}, form(VALID)), redirectsTo("/auth/login"));
  await assert.rejects(() => deleteNote(ID), redirectsTo("/auth/login"));
  await assert.rejects(() => retryIndexing(ID), redirectsTo("/auth/login"));
  await assert.rejects(() => createDraftFromQuestion("Question ?"), redirectsTo("/auth/login"));
  assert.equal(fake.ops.length, 0);
  assert.deepEqual(fake.indexed, []);
});
