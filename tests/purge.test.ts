/**
 * Vider l'historique : un compte supprime tout SON historique (citations comprises) et rien de celui de l'autre.
 * Utilise le compte fictif B pour la suppression : le compte de test A n'est jamais vidé ; son nombre de messages doit rester identique.
 */
import assert from "node:assert/strict";
import { test } from "node:test";

import { signInTestAccount } from "./helpers/accounts.ts";

import { clearHistory, listHistory, saveExchange } from "@/lib/db/history";

const signIn = async (who: "A" | "B") => (await signInTestAccount(who, "TEST NON CONCLUANT : ")).client;

test("vider l'historique supprime tout l'historique du compte B et laisse celui de A intact", async () => {
  const [a, b] = [await signIn("A"), await signIn("B")];
  await saveExchange(b, "Question de purge (test)", "Réponse de purge (test).", []);
  const aBefore = (await listHistory(a)).map((m) => m.id);
  assert.ok((await listHistory(b)).length >= 2, "B a un historique avant la purge");

  const removed = await clearHistory(b);
  assert.ok(removed >= 2, "des messages ont été supprimés");
  assert.equal((await listHistory(b)).length, 0, "l'historique de B est vide");
  assert.deepEqual((await listHistory(a)).map((m) => m.id), aBefore, "l'historique de A a changé");
});
