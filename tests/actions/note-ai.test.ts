import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { searchNotes } from "../../app/(app)/notes/search-actions.ts";
import { searchBySense } from "../../app/(app)/notes/sense-actions.ts";
import { summarizeNote } from "../../app/(app)/notes/summary-actions.ts";
import { SummaryRejected } from "../../lib/domain/summary.ts";
import { SENSE_QUERY_MAX } from "../../lib/domain/matching.ts";
import { errorOf, fake, filterValue, routes, toLogin, withHarness, writes } from "../helpers/harness.ts";

const ID = "abababab-abab-4bab-8bab-abababababab";

withHarness();

describe("summarizeNote", () => {
  test("lit la note visée (sous RLS), la résume, n'écrit rien", async () => {
    routes(["notes:select", { data: [{ title: "CR", body: "Texte de la note" }] }]);
    fake.ai.replies.summary = "Un résumé.";
    assert.deepEqual(await summarizeNote(ID), { ok: true, summary: "Un résumé." });
    assert.deepEqual(fake.ai.calls.map((c) => c.name), ["summary"]);
    assert.equal(filterValue(fake.on("notes", "select")[0], "eq", "id"), ID); // la note visée
    assert.deepEqual(fake.ai.calls[0].args[0], { title: "CR", body: "Texte de la note" }); // ce qui part : le titre et le texte de CETTE note
    assert.deepEqual(writes(), []);
  });

  test("note disparue (ou d'un autre compte, invisible), identifiant invalide, note sans texte : message, l'IA n'est pas appelée", async () => {
    assert.match(errorOf(await summarizeNote(ID)), /n'existe plus/);
    assert.match(errorOf(await summarizeNote("x")), /n'existe plus/);
    routes(["notes:select", { data: [{ title: "Brouillon", body: "   " }] }]);
    assert.match(errorOf(await summarizeNote(ID)), /pas de texte à résumer/);
    assert.equal(fake.ai.calls.length, 0);
  });

  test("résumé rejeté par la vérification : message distinct, journalisé sans contenu ; autre échec : message général", async (t) => {
    routes(["notes:select", { data: [{ title: "CR", body: "Texte SENTINELLE" }] }]);
    const log = t.mock.method(console, "error", () => {});
    fake.ai.replies.summary = new SummaryRejected("chiffre inventé");
    assert.match(errorOf(await summarizeNote(ID)), /n'a pas pu être vérifié/);
    assert.equal(log.mock.calls[0].arguments[0], "Résumé rejeté :");
    fake.ai.replies.summary = new Error("erreur du modèle");
    assert.match(errorOf(await summarizeNote(ID)), /Résumé impossible/);
    assert.equal(log.mock.calls[1].arguments[0], "Résumé impossible :");
    routes(["notes:select", { error: { code: "XX000" } }]); // lecture de la note en erreur : échec général, jamais « n'existe plus »
    assert.match(errorOf(await summarizeNote(ID)), /Résumé impossible/);
    assert.equal(log.mock.callCount(), 3);
    assert.ok(!JSON.stringify(log.mock.calls).includes("SENTINELLE"));
  });

  test("sans session : redirection vers la connexion, ni requête ni appel à l'IA", async () => {
    fake.claims = null;
    await assert.rejects(() => summarizeNote(ID), toLogin);
    assert.equal(fake.ops.length + fake.ai.calls.length, 0);
  });
});

describe("searchBySense", () => {
  test("question vide : rien n'est vectorisé ni lu ; sinon seule la question part à la vectorisation", async () => {
    assert.deepEqual(await searchBySense("   "), { results: [], question: "" });
    assert.equal(fake.ops.length + fake.ai.calls.length, 0);
    routes(["match_chunks:rpc", { data: [{ id: "c1", note_id: ID, content: "Extrait", similarity: 0.82 }] }], ["notes:select", { data: [{ id: ID, title: "CR" }] }]);
    const r = await searchBySense("relance des factures");
    assert.deepEqual(r.results, [{ chunkId: "c1", noteId: ID, title: "CR", content: "Extrait", score: 0.82 }]);
    assert.equal(r.searched, true);
    assert.deepEqual(fake.ai.calls.filter((c) => c.name === "embed").map((c) => c.message), ["relance des factures"]);
    const rpc = fake.on("match_chunks")[0].payload as Record<string, unknown>;
    assert.deepEqual(Object.keys(rpc).sort(), ["match_count", "match_threshold", "query_embedding"]); // le cloisonnement par propriétaire est fait par la base (RLS dans la fonction), jamais par un paramètre du client
    assert.deepEqual(writes().filter((w) => !w.endsWith(":rpc")), []); // les appels de fonctions (recherche) sont des lectures
  });

  test("question trop longue ou non textuelle : bornée avant d'être vectorisée, ou ignorée", async () => {
    routes(["match_chunks:rpc", { data: [] }]);
    const r = await searchBySense("mot ".repeat(500));
    assert.deepEqual([r.searched, r.results], [true, []]); // aucun résultat n'est une réponse, pas une panne
    assert.ok(fake.ai.calls[0].message.length <= SENSE_QUERY_MAX);
    fake.reset();
    assert.deepEqual(await searchBySense(undefined as unknown as string), { results: [], question: "" });
    assert.equal(fake.ai.calls.length + fake.ops.length, 0);
  });

  test("panne du service de vectorisation ou de la base (match_chunks) : message, journal avec la nature de l'échec mais sans la question", async (t) => {
    const log = t.mock.method(console, "error", () => {});
    fake.ai.replies.embed = new Error("service indisponible");
    const r = await searchBySense("question SENTINELLE");
    assert.equal(r.message, "Recherche impossible pour le moment. Réessaie.");
    assert.deepEqual(r.results, []);
    fake.reset();
    routes(["match_chunks:rpc", { error: { code: "XX000" } }]);
    assert.equal((await searchBySense("question SENTINELLE")).message, "Recherche impossible pour le moment. Réessaie.");
    assert.equal(log.mock.callCount(), 2);
    assert.ok(!JSON.stringify(log.mock.calls).includes("SENTINELLE"));
  });

  test("sans session : redirection vers la connexion, rien n'est vectorisé", async () => {
    fake.claims = null;
    await assert.rejects(() => searchBySense("relance"), toLogin);
    assert.equal(fake.ai.calls.length, 0);
  });
});

describe("searchNotes", () => {
  test("requête vide : aucune lecture ; panne de la recherche en base : message général ; sans session : redirection", async () => {
    assert.deepEqual(await searchNotes("  "), { results: [], clients: [], missions: [] });
    assert.equal(fake.ops.length, 0);
    routes(["search_notes:rpc", { error: { code: "XX000" } }]);
    const failed = await searchNotes("relance");
    assert.deepEqual([failed.results, failed.message], [[], "Recherche impossible pour le moment. Réessaie."]);
    fake.reset();
    fake.claims = null;
    await assert.rejects(() => searchNotes("relance"), toLogin);
    assert.equal(fake.ops.length, 0);
  });

  test("résultats : note trouvée avec son extrait borné, fiche (nom, via un contact) et mission (avec sa fiche) correspondantes ; aucune écriture", async () => {
    const body = "mot ".repeat(100);
    routes(
      ["search_notes:rpc", { data: [{ id: ID, title: "CR", body, type: "note" }] }],
      ["clients:select", { data: [{ id: "c1", name: "Lumière Atelier", status: "client", origin: "demo", created_at: "2026-10-01", updated_at: "2026-10-01" }] }],
      ["missions:select", { data: [{ id: "m1", title: "Suivi mot", status: "in_progress", client_id: "c1", client: { name: "Lumière Atelier" }, start_date: null, end_date: null }] }],
    );
    const r = await searchNotes("  Mot ");
    assert.deepEqual(fake.on("search_notes")[0].payload, { query: "Mot" }); // la requête normalisée
    assert.deepEqual([r.results[0].id, r.results[0].title, r.results[0].type], [ID, "CR", "note"]);
    assert.ok(r.results[0].excerpt.startsWith("mot mot") && r.results[0].excerpt.length < body.length && r.results[0].excerpt.endsWith("…"));
    assert.deepEqual(r.missions, [{ id: "m1", title: "Suivi mot", status: "in_progress", client: "Lumière Atelier" }]);
    assert.deepEqual(writes().filter((w) => !w.endsWith(":rpc")), []);
  });
});
