import assert from "node:assert/strict";
import test from "node:test";

import type { SupabaseClient } from "@supabase/supabase-js";

import { renumber } from "./renumber.ts";

type Row = { id: string; position: number };

/** Faux client Supabase : `select().eq()` renvoie les lignes, `update().eq().select()` enregistre ou échoue selon `failOn`. */
function fake(rows: Row[], opts: { selectError?: boolean; failOn?: string; vanishOn?: string } = {}) {
  const writes: { id: string; position: number }[] = [];
  const client = {
    from: () => ({
      select: () => ({ eq: async () => (opts.selectError ? { data: null, error: { message: "x" } } : { data: rows, error: null }) }),
      update: (values: { position: number }) => ({
        eq: (_col: string, id: string) => ({
          select: async () => {
            if (id === opts.failOn) return { data: null, error: { message: "x" } };
            if (id === opts.vanishOn) return { data: [], error: null };
            writes.push({ id, position: values.position });
            return { data: [{ id }], error: null };
          },
        }),
      }),
    }),
  } as unknown as SupabaseClient;
  return { client, writes };
}
const parent = { column: "story_id", id: "p" } as const;

test("ordre déjà identique : « saved » sans aucune écriture", async () => {
  const { client, writes } = fake([{ id: "a", position: 0 }, { id: "b", position: 1 }]);
  assert.equal(await renumber(client, "tasks", parent, ["a", "b"]), "saved");
  assert.deepEqual(writes, []);
});

test("échange : seules les lignes dont le rang change sont écrites", async () => {
  const { client, writes } = fake([{ id: "a", position: 0 }, { id: "b", position: 1 }, { id: "c", position: 2 }]);
  assert.equal(await renumber(client, "tasks", parent, ["b", "a", "c"]), "saved");
  assert.deepEqual(writes, [{ id: "b", position: 0 }, { id: "a", position: 1 }]);
});

test("positions en double en base : renumérotées 0, 1, 2", async () => {
  const { client, writes } = fake([{ id: "a", position: 0 }, { id: "b", position: 0 }, { id: "c", position: 2 }]);
  assert.equal(await renumber(client, "tasks", parent, ["a", "b", "c"]), "saved");
  assert.deepEqual(writes, [{ id: "b", position: 1 }]);
});

test("liste périmée (ajout ou retrait ailleurs) : « changed » et rien d'écrit", async () => {
  const rows = [{ id: "a", position: 0 }, { id: "b", position: 1 }];
  for (const ids of [["a"], ["a", "b", "c"], ["a", "z"]]) {
    const { client, writes } = fake(rows);
    assert.equal(await renumber(client, "tasks", parent, ids), "changed", ids.join());
    assert.deepEqual(writes, []);
  }
});

test("parent sans ligne (inexistant ou étranger) : « changed » même avec une liste vide", async () => {
  const { client, writes } = fake([]);
  assert.equal(await renumber(client, "tasks", parent, []), "changed");
  assert.deepEqual(writes, []);
});

test("ligne supprimée en cours de route : « changed » ; erreur de lecture ou d'écriture : « error »", async () => {
  const rows = [{ id: "a", position: 0 }, { id: "b", position: 1 }];
  assert.equal(await renumber(fake(rows, { vanishOn: "a" }).client, "tasks", parent, ["b", "a"]), "changed");
  assert.equal(await renumber(fake(rows, { selectError: true }).client, "tasks", parent, ["b", "a"]), "error");
  assert.equal(await renumber(fake(rows, { failOn: "b" }).client, "tasks", parent, ["b", "a"]), "error");
});

test("échec au milieu : les positions déjà écrites restent (limite connue, écriture non atomique)", async () => {
  const rows = [{ id: "a", position: 0 }, { id: "b", position: 1 }, { id: "c", position: 2 }];
  const { client, writes } = fake(rows, { failOn: "a" });
  assert.equal(await renumber(client, "tasks", parent, ["c", "b", "a"]), "error");
  assert.deepEqual(writes, [{ id: "c", position: 0 }], "« c » est déjà écrite quand « a » échoue ; la page recharge l'état réel");
});
