import assert from "node:assert/strict";
import test from "node:test";

import { sourceState, toHistory, type MessageRow } from "./history.ts";

const cite = (id: string, position: number, note: string | null, title: string | null, chunk: string | null, content: string | null) => ({
  id, position, note_id: note, chunk_id: chunk, notes: title === null ? null : { title }, note_chunks: content === null ? null : { content },
});

const rows: MessageRow[] = [
  { id: "m2", role: "assistant", content: "Réponse.", created_at: "2026-10-13T10:00:02Z", message_citations: [cite("c2", 1, "n2", "Note 2", "k2", "Texte 2"), cite("c1", 0, "n1", "Note 1", "k1", "Texte 1")] },
  { id: "m1", role: "user", content: "Question ?", created_at: "2026-10-13T10:00:01Z", message_citations: [] },
];

test("l'historique est rendu du plus ancien au plus récent, citations dans l'ordre de la réponse", () => {
  const h = toHistory(rows);
  assert.deepEqual(h.map((m) => m.id), ["m1", "m2"]);
  assert.deepEqual(h[1].sources.map((s) => s.id), ["c1", "c2"]);
  assert.deepEqual(h[1].sources[0], { id: "c1", noteId: "n1", title: "Note 1", content: "Texte 1" });
  assert.deepEqual(h[0], { id: "m1", role: "user", text: "Question ?", sources: [] });
});

test("note supprimée : ni titre ni texte, même si la base les renvoyait ; extrait régénéré : titre gardé, texte absent", () => {
  const h = toHistory([
    { id: "m", role: "assistant", content: "R", created_at: "2026-10-13T10:00:01Z", message_citations: [
      cite("a", 0, null, "Titre fantôme", null, "Texte fantôme"),
      cite("b", 1, "n", "Titre", null, null),
    ] },
    { id: "q", role: "user", content: "Q", created_at: "2026-10-13T10:00:00Z", message_citations: [] },
  ]);
  const [deleted, changed] = h[1].sources;
  assert.deepEqual(deleted, { id: "a", noteId: null, title: null, content: null });
  assert.equal(sourceState(deleted), "deleted");
  assert.deepEqual(changed, { id: "b", noteId: "n", title: "Titre", content: null });
  assert.equal(sourceState(changed), "changed");
  assert.equal(sourceState({ id: "x", noteId: "n", title: "T", content: "C" }), "ok");
});

test("aucun message : historique vide", () => {
  assert.deepEqual(toHistory([]), []);
});

test("à date égale, la question reste avant sa réponse (ordre d'insertion)", () => {
  const same = "2026-10-13T10:00:00.123+00:00";
  const desc: MessageRow[] = [
    { id: "a", role: "assistant", content: "R", created_at: same, message_citations: [] },
    { id: "q", role: "user", content: "Q", created_at: same, message_citations: [] },
  ];
  assert.deepEqual(toHistory(desc).map((m) => m.id), ["q", "a"]);
});

test("les fractions de seconde de longueur différente sont comparées comme des dates", () => {
  const out = toHistory([
    { id: "late", role: "user", content: "b", created_at: "2026-10-13T10:00:00.1+00:00", message_citations: [] },
    { id: "early", role: "user", content: "a", created_at: "2026-10-13T10:00:00.05+00:00", message_citations: [] },
  ]);
  assert.deepEqual(out.map((m) => m.id), ["early", "late"]);
});

test("la coupure des 100 derniers messages ne laisse jamais une réponse sans sa question en tête", () => {
  const rows: MessageRow[] = [
    { id: "a2", role: "assistant", content: "R2", created_at: "2026-10-13T10:00:04Z", message_citations: [] },
    { id: "q2", role: "user", content: "Q2", created_at: "2026-10-13T10:00:03Z", message_citations: [] },
    { id: "a1", role: "assistant", content: "R1 orpheline", created_at: "2026-10-13T10:00:02Z", message_citations: [] },
  ];
  assert.deepEqual(toHistory(rows).map((m) => m.id), ["q2", "a2"]);
  assert.deepEqual(toHistory([rows[0]]), [], "que des réponses : rien à montrer");
});
