import assert from "node:assert/strict";
import test from "node:test";

import { AnswerRejected } from "./citations.ts";
import { CHAT_GENERIC_ERROR, NOT_FOUND, SESSION_EXPIRED, answerQuestion, chatErrorMessage, isRefusal, offersDraftNote, type ChunkLike } from "./chat-flow.ts";

const chunk = (id: string, content = `texte ${id}`): ChunkLike => ({ id, noteId: `n-${id}`, title: `Note ${id}`, content });

test("aucun extrait : réponse fixe et Claude n'est jamais appelé", async () => {
  let asked = false;
  const out = await answerQuestion("q", {
    retrieve: async () => [],
    ask: async () => {
      asked = true;
      return { answer: "x", citations: [] };
    },
  });
  assert.deepEqual(out, { answer: NOT_FOUND, found: false, sources: [] });
  assert.equal(asked, false);
});

test("des extraits : Claude reçoit la question et exactement ces extraits ; les sources sont les extraits cités, texte relu en base", async () => {
  let received: unknown[] = [];
  const chunks = [chunk("c1", "Texte lu en base."), chunk("c2")];
  const out = await answerQuestion("Quelle est la procédure ?", {
    retrieve: async () => chunks,
    ask: async (q, cs) => {
      received = [q, cs];
      return { answer: "Réponse.", citations: ["c1"] };
    },
  });
  assert.deepEqual(received, ["Quelle est la procédure ?", chunks]);
  assert.deepEqual(out, {
    answer: "Réponse.",
    found: true,
    sources: [{ id: "c1", noteId: "n-c1", title: "Note c1", content: "Texte lu en base." }],
  });
});

test("une citation d'un extrait non envoyé : réponse rejetée, rien n'est rendu", async () => {
  await assert.rejects(
    answerQuestion("q", { retrieve: async () => [chunk("c1")], ask: async () => ({ answer: "Oui.", citations: ["c1", "inconnu"] }) }),
    (e: unknown) => e instanceof AnswerRejected && /non vérifiée/.test((e as Error).message),
  );
});

test("un nombre inventé : réponse rejetée ; un nombre présent dans un extrait : acceptée", async () => {
  const deps = (answer: string) => ({ retrieve: async () => [chunk("c1", "Relance à 15 jours.")], ask: async () => ({ answer, citations: ["c1"] }) });
  await assert.rejects(answerQuestion("q", deps("Relance à 20 jours.")), (e: unknown) => e instanceof AnswerRejected);
  assert.equal((await answerQuestion("q", deps("Relance à 15 jours."))).found, true);
});

test("réponse sans citation (les notes ne répondent pas) : acceptée, aucune source", async () => {
  const out = await answerQuestion("q", { retrieve: async () => [chunk("c1")], ask: async () => ({ answer: "Tes notes ne répondent pas.", citations: [] }) });
  assert.deepEqual(out.sources, []);
});

test("une panne de la recherche ou de Claude remonte (la route la traduit en 502)", async () => {
  await assert.rejects(answerQuestion("q", { retrieve: async () => { throw new Error("match_chunks"); }, ask: async () => ({ answer: "", citations: [] }) }), /match_chunks/);
  await assert.rejects(answerQuestion("q", { retrieve: async () => [chunk("c1")], ask: async () => { throw new Error("Claude a répondu 500."); } }), /500/);
});

test("un refus est reconnu, aussi avec l'ancienne formulation de l'historique, pas une vraie réponse", () => {
  assert.equal(isRefusal(NOT_FOUND), true);
  assert.equal(isRefusal(`  ${NOT_FOUND}\n`), true);
  assert.equal(isRefusal("Je n'ai trouvé aucune note correspondant à cette question."), true);
  assert.equal(isRefusal("- Le prospect veut automatiser les quittances."), false);
  assert.equal(isRefusal(""), false);
});

test("le message du refus est celui de la conception (Voice and Tone)", () => {
  assert.equal(NOT_FOUND, "Je n'ai trouvé aucune procédure documentée correspondant à cette requête.");
});

test("le bouton « note à documenter » : refus fixe ou réponse sans source ; jamais pour une question ni une réponse sourcée", () => {
  assert.equal(offersDraftNote({ role: "assistant", text: NOT_FOUND, sources: [] }), true);
  assert.equal(offersDraftNote({ role: "assistant", text: NOT_FOUND }), true, "refus d'un message sans liste de sources");
  assert.equal(offersDraftNote({ role: "assistant", text: "- Tes notes ne décrivent aucune procédure de transfert.", sources: [] }), true, "Claude dit que les notes ne répondent pas");
  assert.equal(offersDraftNote({ role: "assistant", text: "- Le prospect veut des quittances.", sources: [{}] }), false);
  assert.equal(offersDraftNote({ role: "assistant", text: "Réponse sans information de sources." }), false);
  assert.equal(offersDraftNote({ role: "user", text: NOT_FOUND, sources: [] }), false);
});

test("message d'erreur du chat : 401 = session expirée (même avec un message du serveur) ; sinon le message du serveur ; sinon le message général", () => {
  assert.equal(chatErrorMessage(401, null), SESSION_EXPIRED);
  assert.equal(chatErrorMessage(401, { error: "Connecte-toi pour utiliser l'assistant." }), SESSION_EXPIRED);
  assert.equal(chatErrorMessage(502, { error: "Réponse non vérifiée." }), "Réponse non vérifiée.");
  assert.equal(chatErrorMessage(502, null), CHAT_GENERIC_ERROR);
  assert.equal(chatErrorMessage(200, {}), CHAT_GENERIC_ERROR);
  assert.equal(chatErrorMessage(500, { error: "" }), CHAT_GENERIC_ERROR);
  assert.equal(chatErrorMessage(500, { error: "  " }), CHAT_GENERIC_ERROR); // message blanc : jamais affiché
  assert.equal(chatErrorMessage(500, { error: 42 }), CHAT_GENERIC_ERROR);
});
