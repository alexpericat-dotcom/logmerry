/**
 * Vider l'historique : un compte supprime tout SON historique (citations comprises) et rien de celui de l'autre.
 * Utilise le compte fictif B pour la suppression : le compte de test A n'est jamais vidé ; son nombre de messages doit rester identique.
 */
import assert from "node:assert/strict";
import { test } from "node:test";

import { createClient } from "@supabase/supabase-js";

import { testAccount } from "./helpers/accounts.ts";

import { clearHistory, listHistory, saveExchange } from "@/lib/db/history";

const env = (name: string) => {
  const v = process.env[name];
  if (!v) throw new Error(`TEST NON CONCLUANT : variable manquante ${name}`);
  return v;
};

async function signIn(who: "A" | "B") {
  const client = createClient(env("NEXT_PUBLIC_SUPABASE_URL"), env("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"), { auth: { persistSession: false, autoRefreshToken: false } });
  const { email, password } = testAccount(who);
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`TEST NON CONCLUANT : connexion ${who} impossible`);
  return client;
}

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
