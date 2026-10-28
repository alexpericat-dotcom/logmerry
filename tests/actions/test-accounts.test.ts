import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";

import { testAccount } from "../helpers/accounts.ts";

const KEYS = ["TEST_A_EMAIL", "TEST_A_PASSWORD", "TEST_B_EMAIL", "TEST_B_PASSWORD", "DEMO_A_EMAIL", "DEMO_B_EMAIL"] as const;
let saved: Record<string, string | undefined> = {};
beforeEach(() => {
  saved = Object.fromEntries(KEYS.map((k) => [k, process.env[k]]));
  for (const k of KEYS) delete process.env[k];
});
afterEach(() => {
  for (const k of KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
});

test("les tests qui écrivent dans la vraie base exigent un compte de test défini (e-mail ET mot de passe non vide), pour A comme pour B", () => {
  for (const who of ["A", "B"] as const) {
    assert.throws(() => testAccount(who), new RegExp(`Compte de test ${who} manquant`));
    process.env[`TEST_${who}_EMAIL`] = `test-${who.toLowerCase()}@example.com`;
    assert.throws(() => testAccount(who), /manquant/); // mot de passe absent
    process.env[`TEST_${who}_PASSWORD`] = "";
    assert.throws(() => testAccount(who), /manquant/); // mot de passe vide (comme dans le modèle)
    process.env[`TEST_${who}_PASSWORD`] = "x";
    assert.deepEqual(testAccount(who), { email: `test-${who.toLowerCase()}@example.com`, password: "x" });
  }
});

test("un compte réel ou une adresse mal formée est refusé (hors @example.com, deux arobases)", () => {
  process.env.TEST_A_PASSWORD = "x";
  for (const bad of ["alex@gmail.com", "a@evil.com@example.com", "x@sub@example.com", "pas-un-email"]) {
    process.env.TEST_A_EMAIL = bad;
    assert.throws(() => testAccount("A"), /compte fictif @example\.com/, bad);
  }
  process.env.TEST_A_EMAIL = "  Test-A@EXAMPLE.com ";
  assert.equal(testAccount("A").email, "test-a@example.com"); // espaces et casse normalisés
});

test("un compte de démonstration ne sert jamais de compte de test : celui de l'environnement, et les adresses connues même sans variable DEMO_*", () => {
  process.env.TEST_A_PASSWORD = "x";
  process.env.TEST_B_PASSWORD = "x";
  for (const demo of ["demo-a@example.com", " DEMO-B@example.com", "demo-a@example.com"]) {
    process.env.TEST_A_EMAIL = demo; // aucune variable DEMO_* chargée : les adresses connues suffisent
    assert.throws(() => testAccount("A"), /compte de démonstration/, demo);
  }
  process.env.DEMO_A_EMAIL = "ma-demo@example.com";
  process.env.TEST_A_EMAIL = "MA-DEMO@example.com";
  assert.throws(() => testAccount("A"), /compte de démonstration/);
  process.env.TEST_B_EMAIL = "ma-demo@example.com";
  assert.throws(() => testAccount("B"), /compte de démonstration/);
});

test("les comptes A et B doivent être deux comptes différents", () => {
  process.env.TEST_A_EMAIL = "test-a@example.com";
  process.env.TEST_A_PASSWORD = "x";
  process.env.TEST_B_EMAIL = " TEST-A@example.com";
  process.env.TEST_B_PASSWORD = "y";
  assert.throws(() => testAccount("B"), /identiques/);
  process.env.TEST_B_EMAIL = "test-b@example.com";
  assert.equal(testAccount("B").email, "test-b@example.com");
});
