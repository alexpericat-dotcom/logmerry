import assert from "node:assert/strict";
import test from "node:test";

import {
  INVALID_CREDENTIALS_MESSAGE,
  accessDecision,
  frenchAuthError,
  safeNext,
  validateEmail,
  validateNewPassword,
} from "./auth.ts";

test("safeNext : chemin interne conservé, le reste renvoie /", () => {
  assert.equal(safeNext("/auth/update-password"), "/auth/update-password");
  assert.equal(safeNext(null), "/");
  assert.equal(safeNext("https://evil.example"), "/");
  assert.equal(safeNext("//evil.example"), "/");
  assert.equal(safeNext("/\\evil.example"), "/");
  assert.equal(safeNext("/\t/evil.example"), "/");
  assert.equal(safeNext("/\n/evil.example"), "/");
});

test("mauvais mot de passe : message français sous le champ mot de passe", () => {
  const r = frenchAuthError({
    code: "invalid_credentials",
    message: "Invalid login credentials",
  });
  assert.deepEqual(r, { field: "password", message: INVALID_CREDENTIALS_MESSAGE });
});

test("erreur inconnue : jamais le texte brut de Supabase", () => {
  const r = frenchAuthError({ code: "boom", message: "Raw English text" });
  assert.ok(!r.message.includes("Raw English"));
});

test("lien expiré (session absente) : message dédié", () => {
  const r = frenchAuthError({ name: "AuthSessionMissingError" });
  assert.match(r.message, /lien/);
});

test("champs vides ou mal formés : message qui nomme le champ", () => {
  assert.match(validateEmail("")!, /e-mail/);
  assert.match(validateEmail("abc")!, /e-mail/);
  assert.equal(validateEmail("a@b.fr"), null);
  assert.match(validateNewPassword("court")!, /12 caractères/);
  assert.equal(validateNewPassword("un-mot-de-passe-long"), null);
});

const to = (to: string) => ({ action: "redirect", to });
const NEXT = { action: "next" };

test("garde d'accès : la racine mène au cockpit (connecté) ou à la connexion", () => {
  assert.deepEqual(accessDecision("/", true), to("/aujourd-hui"));
  assert.deepEqual(accessDecision("/", false), to("/auth/login"));
});

test("garde d'accès : page privée sans session = connexion, avec session = passe", () => {
  for (const path of ["/clients", "/missions/abc", "/aujourd-hui", "/notes/nouvelle"]) {
    assert.deepEqual(accessDecision(path, false), to("/auth/login"), path);
    assert.deepEqual(accessDecision(path, true), NEXT, path);
  }
});

test("garde d'accès : pages de connexion publiques sans session, et avec", () => {
  for (const path of ["/auth/login", "/auth/confirm", "/auth/error", "/auth/forgot-password", "/auth/update-password", "/login"]) {
    assert.deepEqual(accessDecision(path, false), NEXT, path);
    assert.deepEqual(accessDecision(path, true), NEXT, path);
  }
});

test("garde d'accès, FIGÉ TEL QUEL : les préfixes `/login` et `/auth` n'ont pas de barre finale, `/authors` et `/login-x` passent sans session (à resserrer : dette)", () => {
  assert.deepEqual(accessDecision("/authors", false), NEXT);
  assert.deepEqual(accessDecision("/login-x", false), NEXT);
});
