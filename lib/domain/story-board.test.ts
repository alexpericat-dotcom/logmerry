import assert from "node:assert/strict";
import test from "node:test";

import { BACKLOG, findList, moveToList } from "./story-board.ts";

const lists = { [BACKLOG]: ["a", "b"], s1: ["c"], s2: [] as string[] };

test("findList : story, liste, inconnu", () => {
  assert.equal(findList(lists, "b"), BACKLOG);
  assert.equal(findList(lists, "s2"), "s2");
  assert.equal(findList(lists, "zz"), undefined);
});

test("moveToList : sur une story, avant ou après ; sur une liste, en dernier (même vide)", () => {
  assert.deepEqual(moveToList(lists, "a", "c", false), { [BACKLOG]: ["b"], s1: ["a", "c"], s2: [] });
  assert.deepEqual(moveToList(lists, "a", "c", true), { [BACKLOG]: ["b"], s1: ["c", "a"], s2: [] });
  assert.deepEqual(moveToList(lists, "b", "s2", false), { [BACKLOG]: ["a"], s1: ["c"], s2: ["b"] });
  assert.deepEqual(moveToList(lists, "c", BACKLOG, false), { [BACKLOG]: ["a", "b", "c"], s1: [], s2: [] });
});

test("moveToList : même liste ou cible inconnue ne change rien (même objet)", () => {
  assert.equal(moveToList(lists, "a", "b", true), lists);
  assert.equal(moveToList(lists, "a", "zz", true), lists);
  assert.equal(moveToList(lists, "zz", "c", true), lists);
});
