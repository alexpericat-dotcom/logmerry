import assert from "node:assert/strict";
import test from "node:test";

import { indexNoteWith, type ChunkRow, type IndexDeps } from "./index-note.ts";

function fake(overrides: Partial<IndexDeps> = {}) {
  const calls: string[] = [];
  let inserted: ChunkRow[] = [];
  const deps: IndexDeps = {
    embed: async (texts) => {
      calls.push(`embed:${texts.length}`);
      return texts.map((_, i) => [i]);
    },
    deleteChunks: async () => void calls.push("delete"),
    insertChunks: async (rows) => {
      calls.push("insert");
      inserted = rows;
    },
    setStatus: async (s) => void calls.push(`status:${s}`),
    ...overrides,
  };
  return { deps, calls, inserted: () => inserted };
}

const quiet = () => {
  const original = console.error;
  console.error = () => {};
  return () => (console.error = original);
};

test("note avec texte : vecteurs d'abord, puis remplacement des extraits, puis « indexée »", async () => {
  const f = fake();
  const body = Array.from({ length: 300 }, (_, i) => `mot${i}`).join(" ");
  assert.equal(await indexNoteWith(f.deps, { title: "Titre", body }), "indexed");
  assert.equal(f.calls[0].startsWith("embed:"), true);
  assert.deepEqual(f.calls.slice(1), ["delete", "insert", "status:indexed"]);
  assert.ok(f.inserted().length > 1);
  assert.deepEqual(f.inserted().map((r) => r.chunk_index), f.inserted().map((_, i) => i));
});

test("le titre est joint au texte vectorisé, pas au texte stocké", async () => {
  let sent: string[] = [];
  const f = fake({ embed: async (t) => ((sent = t), t.map(() => [0])) });
  await indexNoteWith(f.deps, { title: "Mon titre", body: "Le texte." });
  assert.equal(sent[0], "Mon titre\n\nLe texte.");
  assert.equal(f.inserted()[0].content, "Le texte.");
});

test("note sans texte : aucun appel IA ni insertion, anciens extraits supprimés, « indexée »", async () => {
  const f = fake();
  assert.equal(await indexNoteWith(f.deps, { title: "Vide", body: "  \n " }), "indexed");
  assert.deepEqual(f.calls, ["embed:0", "delete", "status:indexed"]);
});

test("IA en panne : rien n'est écrit avant l'échec, puis anciens extraits supprimés et état « échec »", async () => {
  const restore = quiet();
  const f = fake({ embed: async () => { throw new Error("Mistral a répondu 500."); } });
  assert.equal(await indexNoteWith(f.deps, { title: "T", body: "Du texte." }), "failed");
  restore();
  assert.deepEqual(f.calls, ["delete", "status:failed"]);
});

test("l'insertion échoue après la suppression : « échec », extraits supprimés", async () => {
  const restore = quiet();
  const f = fake({ insertChunks: async () => { throw new Error("insertion"); } });
  assert.equal(await indexNoteWith(f.deps, { title: "T", body: "Du texte." }), "failed");
  restore();
  assert.deepEqual(f.calls, ["embed:1", "delete", "delete", "status:failed"]);
});

test("même la remise en ordre échoue : la fonction ne lève jamais", async () => {
  const restore = quiet();
  const f = fake({
    embed: async () => { throw new Error("x"); },
    deleteChunks: async () => { throw new Error("y"); },
    setStatus: async () => { throw new Error("z"); },
  });
  assert.equal(await indexNoteWith(f.deps, { title: "T", body: "Du texte." }), "failed");
  restore();
});

test("le journal ne contient ni le texte de la note ni le titre", async () => {
  const logs: unknown[][] = [];
  const original = console.error;
  console.error = (...a) => void logs.push(a);
  const f = fake({ embed: async () => { throw new Error("Mistral a répondu 401."); } });
  await indexNoteWith(f.deps, { title: "TITRE-SECRET", body: "CORPS-SECRET" });
  console.error = original;
  assert.ok(!JSON.stringify(logs).includes("SECRET"));
});
