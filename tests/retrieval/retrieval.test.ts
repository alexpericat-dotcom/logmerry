import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { retrieveChunks } from "../../lib/db/retrieval.ts";
import { embeddingsOk, mockFetch, withFakeKey } from "./helpers.ts";

type Err = { code: string };
type Setup = {
  matches?: { id: string; note_id: string; content: string; similarity: number }[];
  matchError?: Err;
  found?: { id: string; title: string }[]; // réponse de search_notes
  searchError?: Err;
  chunks?: { id: string; note_id: string; content: string }[];
  titles?: { id: string; title: string }[];
  titlesError?: Err; // lecture des titres (table notes)
  chunksError?: Err; // lecture des extraits (table note_chunks)
};

/** Client Supabase minimal : les deux RPC et les deux lectures que fait `retrieveChunks`. Note les appels de `search_notes`. */
function fakeDb(s: Setup) {
  const searched: string[] = [];
  const db = {
    rpc: async (name: string, args: { query?: string }) => {
      if (name === "match_chunks") return { data: s.matchError ? null : (s.matches ?? []), error: s.matchError ?? null };
      searched.push(args.query ?? "");
      return { data: s.searchError ? null : (s.found ?? []), error: s.searchError ?? null };
    },
    from: (table: string) => ({
      select: () => ({
        in: () => {
          const error = (table === "notes" ? s.titlesError : s.chunksError) ?? null;
          const result = { data: error ? null : table === "notes" ? (s.titles ?? []) : (s.chunks ?? []), error };
          return { limit: async () => result, then: (ok: (v: unknown) => unknown) => Promise.resolve(result).then(ok) };
        },
      }),
    }),
  };
  return { db: db as never, searched };
}

const SENSE = [{ id: "c1", note_id: "n1", content: "Le contrat de bail est renouvelé.", similarity: 0.9 }];
const QUESTION = "Quand le bail est-il renouvelé ?"; // mots-clés : quand, bail, renouvelé… (« quand » est un mot vide)

describe("retrieveChunks", () => {
  test("deux voies : fusion, `score` nul pour l'extrait trouvé par mots-clés seuls", async (t) => {
    withFakeKey(t);
    mockFetch(t, embeddingsOk);
    const { db, searched } = fakeDb({
      matches: SENSE,
      titles: [{ id: "n1", title: "Bail" }],
      found: [{ id: "n2", title: "Locaux" }],
      chunks: [{ id: "c2", note_id: "n2", content: "Le bail des locaux expire en juin." }],
    });
    const out = await retrieveChunks(db, QUESTION);
    assert.deepEqual(out.map((c) => [c.id, c.title, c.score]), [["c1", "Bail", 0.9], ["c2", "Locaux", null]]);
    assert.ok(searched.includes("bail")); // un appel par mot-clé
  });

  test("voie par mots-clés en échec : résultat de la voie par sens, erreur journalisée sans contenu", async (t) => {
    withFakeKey(t);
    mockFetch(t, embeddingsOk);
    const log = t.mock.method(console, "error", () => {});
    const { db } = fakeDb({ matches: SENSE, titles: [{ id: "n1", title: "Bail" }], searchError: { code: "XX000" } });
    const out = await retrieveChunks(db, QUESTION);
    assert.deepEqual(out.map((c) => c.id), ["c1"]);
    assert.equal(log.mock.callCount(), 1);
    assert.equal(log.mock.calls[0].arguments[0], "Recherche par mots-clés impossible :");
    assert.deepEqual(log.mock.calls[0].arguments, ["Recherche par mots-clés impossible :", "search_notes XX000"]); // seulement le code, ni mot-clé, ni question, ni texte
  });

  test("lecture des extraits en erreur : voie par sens seule, journalisée ; lecture des titres en erreur : l'appel échoue", async (t) => {
    withFakeKey(t);
    mockFetch(t, embeddingsOk);
    const log = t.mock.method(console, "error", () => {});
    const found = [{ id: "n2", title: "Locaux" }];
    const sense = { matches: SENSE, titles: [{ id: "n1", title: "Bail" }] };
    const out = await retrieveChunks(fakeDb({ ...sense, found, chunksError: { code: "XX001" } }).db, QUESTION);
    assert.deepEqual(out.map((c) => c.id), ["c1"]);
    assert.deepEqual(log.mock.calls[0].arguments, ["Recherche par mots-clés impossible :", "extraits XX001"]);
    await assert.rejects(retrieveChunks(fakeDb({ ...sense, titlesError: { code: "XX002" } }).db, QUESTION), /titres XX002/);
  });

  test("même extrait trouvé par les deux voies : gardé une fois, avec son score ; rien trouvé : liste vide", async (t) => {
    withFakeKey(t);
    mockFetch(t, embeddingsOk);
    const both = fakeDb({
      matches: SENSE,
      titles: [{ id: "n1", title: "Bail" }],
      found: [{ id: "n1", title: "Bail" }],
      chunks: [{ id: "c1", note_id: "n1", content: "Le contrat de bail est renouvelé." }],
    });
    assert.deepEqual((await retrieveChunks(both.db, QUESTION)).map((c) => [c.id, c.score]), [["c1", 0.9]]);
    assert.deepEqual(await retrieveChunks(fakeDb({}).db, QUESTION), []);
  });

  test("voie par sens en échec (Mistral ou match_chunks) : l'appel échoue, même si les mots-clés répondent", async (t) => {
    withFakeKey(t);
    const found = { found: [{ id: "n2", title: "Locaux" }], chunks: [{ id: "c2", note_id: "n2", content: "Le bail expire." }] };
    let down = true;
    mockFetch(t, (body) => (down ? new Response("panne", { status: 500 }) : embeddingsOk(body)));
    await assert.rejects(retrieveChunks(fakeDb(found).db, QUESTION), /Mistral a répondu 500/);
    down = false;
    await assert.rejects(retrieveChunks(fakeDb({ ...found, matchError: { code: "XX000" } }).db, QUESTION), /match_chunks XX000/);
  });

  test("question sans mot-clé : aucune requête search_notes, voie par sens seule", async (t) => {
    withFakeKey(t);
    mockFetch(t, embeddingsOk);
    const { db, searched } = fakeDb({ matches: SENSE, titles: [{ id: "n1", title: "Bail" }] });
    const out = await retrieveChunks(db, "est-ce que");
    assert.deepEqual(searched, []);
    assert.deepEqual(out.map((c) => c.id), ["c1"]);
  });
});
