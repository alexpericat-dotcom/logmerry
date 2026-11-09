import assert from "node:assert/strict";
import test from "node:test";

import { CONTACT_TITLE_PREFIX } from "./contact-message.ts";
import { INDEX_BATCH, pickToIndex } from "./index-batch.ts";

const note = (id: number, index_status: string) => ({ id, index_status });

test("les notes déjà indexées sont ignorées : relancer ne refait rien", () => {
  const { todo, remaining } = pickToIndex([note(1, "indexed"), note(2, "pending"), note(3, "failed")]);
  assert.deepEqual(todo.map((n) => n.id), [2, 3]);
  assert.equal(remaining, 0);
  assert.deepEqual(pickToIndex([note(1, "indexed")]), { todo: [], remaining: 0 });
});

test("au plus 25 par clic ; le reste est compté", () => {
  const notes = Array.from({ length: 60 }, (_, i) => note(i, "pending"));
  const { todo, remaining } = pickToIndex(notes);
  assert.equal(todo.length, INDEX_BATCH);
  assert.equal(remaining, 60 - INDEX_BATCH);
  assert.deepEqual(pickToIndex(notes, 60).remaining, 0);
});

test("liste vide : rien à faire", () => {
  assert.deepEqual(pickToIndex([]), { todo: [], remaining: 0 });
});

test("les messages du formulaire de contact ne sont jamais envoyés à l'indexation en lot", () => {
  const contact = { id: 10, index_status: "pending", status: "draft", title: `${CONTACT_TITLE_PREFIX}Visiteur` };
  const ownDraft = { id: 11, index_status: "pending", status: "draft", title: "Mon brouillon" };
  const published = { id: 12, index_status: "pending", status: "published", title: `${CONTACT_TITLE_PREFIX}repris par moi` };
  const { todo, remaining } = pickToIndex([contact, ownDraft, published]);
  assert.deepEqual(todo.map((n) => n.id), [11, 12]); // mes brouillons restent indexés ; une note publiée n'est plus un message reçu
  assert.equal(remaining, 0);
  assert.deepEqual(pickToIndex([contact]), { todo: [], remaining: 0 });
});
