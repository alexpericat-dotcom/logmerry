import assert from "node:assert/strict";
import test from "node:test";

import { PAGE_SIZE, readAllPages } from "./paginate.ts";

// Faux « serveur » : renvoie au plus 1 000 lignes par appel, comme PostgREST.
const server = (total: number) => {
  const calls: [number, number][] = [];
  const fetchPage = async (from: number, to: number) => {
    calls.push([from, to]);
    return Array.from({ length: Math.max(0, Math.min(to, total - 1) - from + 1) }, (_, i) => from + i);
  };
  return { calls, fetchPage };
};

test("lecture page par page : 0, 999, 1 000, 1 001 et 2 500 lignes, aucune perdue, aucune en double", async () => {
  assert.equal(PAGE_SIZE, 1000);
  for (const total of [0, 1, 999, 1000, 1001, 2500, 3000]) {
    const s = server(total);
    const rows = await readAllPages(s.fetchPage);
    assert.equal(rows.length, total, `total ${total}`);
    assert.deepEqual(rows, Array.from({ length: total }, (_, i) => i), `ordre et unicité pour ${total}`);
  }
});

test("une page pleine appelle la suivante (1 000 lignes : une lecture de plus, vide) ; une page incomplète s'arrête", async () => {
  const exact = server(1000);
  await readAllPages(exact.fetchPage);
  assert.deepEqual(exact.calls, [[0, 999], [1000, 1999]], "1 000 pile : la page suivante est lue et vide");
  const partial = server(999);
  await readAllPages(partial.fetchPage);
  assert.deepEqual(partial.calls, [[0, 999]]);
  const big = server(2500);
  await readAllPages(big.fetchPage);
  assert.deepEqual(big.calls, [[0, 999], [1000, 1999], [2000, 2999]]);
});

test("une erreur de lecture se propage (jamais une liste tronquée présentée comme complète)", async () => {
  let n = 0;
  await assert.rejects(readAllPages(async () => {
    n += 1;
    if (n === 2) throw new Error("boom");
    return Array.from({ length: 1000 }, (_, i) => i);
  }), /boom/);
});
