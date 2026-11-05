import assert from "node:assert/strict";
import test from "node:test";

import { checkContactMessage, MESSAGE_MAX, MESSAGE_MIN, MESSAGE_NAME_MAX, MIN_FILL_MS, type ContactMessageInput } from "./contact-message.ts";

const NOW = 1_800_000_000_000;
const ok: ContactMessageInput = { name: "Claire Martin", email: "claire@exemple.fr", message: "Nous perdons du temps sur nos devis.", website: "", openedAt: String(NOW - 20_000) };

test("un message valide passe, nettoyé (espaces, nom sur une ligne)", () => {
  const r = checkContactMessage({ ...ok, name: "  Claire\nMartin ", message: "  Nous perdons du temps.  " }, NOW);
  assert.ok(r.ok);
  if (r.ok) assert.deepEqual(r.value, { name: "Claire Martin", email: "claire@exemple.fr", message: "Nous perdons du temps." });
});

test("champ piège rempli, formulaire trop rapide, date absente ou illisible : spam, rien n'est écrit", () => {
  for (const bad of [{ website: "http://spam.example" }, { openedAt: String(NOW - (MIN_FILL_MS - 1)) }, { openedAt: String(NOW + 5000) }, { openedAt: "" }, { openedAt: "abc" }]) {
    const r = checkContactMessage({ ...ok, ...bad }, NOW);
    assert.ok(!r.ok && "spam" in r, JSON.stringify(bad));
  }
  assert.ok(checkContactMessage({ ...ok, openedAt: String(NOW - MIN_FILL_MS) }, NOW).ok, "à la limite : accepté");
});

test("erreurs par champ, au vouvoiement ; mêmes bornes que la base", () => {
  const r = checkContactMessage({ ...ok, name: " ", email: "pas-un-mail", message: "court" }, NOW);
  assert.ok(!r.ok && "errors" in r);
  if (!r.ok && "errors" in r) assert.deepEqual(Object.keys(r.errors).sort(), ["email", "message", "name"]);
  const long = (n: number) => "é".repeat(n);
  assert.ok(checkContactMessage({ ...ok, name: long(MESSAGE_NAME_MAX) }, NOW).ok);
  assert.ok(!checkContactMessage({ ...ok, name: long(MESSAGE_NAME_MAX + 1) }, NOW).ok);
  assert.ok(checkContactMessage({ ...ok, message: long(MESSAGE_MIN) }, NOW).ok);
  assert.ok(!checkContactMessage({ ...ok, message: long(MESSAGE_MIN - 1) }, NOW).ok);
  assert.ok(checkContactMessage({ ...ok, message: long(MESSAGE_MAX) }, NOW).ok);
  assert.ok(!checkContactMessage({ ...ok, message: long(MESSAGE_MAX + 1) }, NOW).ok);
});

test("le caractère nul est retiré (Postgres le refuse)", () => {
  const r = checkContactMessage({ ...ok, message: "Bonjour\u0000, un long message." }, NOW);
  assert.ok(r.ok);
  if (r.ok) assert.ok(!r.value.message.includes("\u0000"));
});
