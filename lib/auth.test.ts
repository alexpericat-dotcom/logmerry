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
  for (const path of ["/auth", "/auth/", "/auth/login", "/auth/login/", "/auth/confirm", "/auth/error", "/auth/forgot-password", "/auth/update-password"]) {
    assert.deepEqual(accessDecision(path, false), NEXT, path);
    assert.deepEqual(accessDecision(path, true), NEXT, path);
  }
});

test("garde d'accès : un préfixe sans barre n'est pas public (/authors, /auth-x), ni /login (aucune route), ni la casse (/AUTH/login)", () => {
  for (const path of ["/authors", "/auth-x", "/authx/login", "/authentification", "/login", "/login/x", "/login-x", "/AUTH/login"]) {
    assert.deepEqual(accessDecision(path, false), to("/auth/login"), path);
    assert.deepEqual(accessDecision(path, true), NEXT, path); // connecté : rien ne change
  }
});

test("garde d'accès : l'API sans session reçoit un refus (pas une redirection), avec session elle passe ; un faux ami d'/api est une page", () => {
  for (const path of ["/api", "/api/chat", "/api/x/y"]) {
    assert.deepEqual(accessDecision(path, false), { action: "unauthorized" }, path);
    assert.deepEqual(accessDecision(path, true), NEXT, path);
  }
  for (const path of ["/apiary", "/api-x", "/API/chat"]) assert.deepEqual(accessDecision(path, false), to("/auth/login"), path);
  assert.deepEqual(accessDecision("/auth/api/x", false), NEXT); // sous /auth : public, jamais une API
});

test("garde d'accès : le chemin d'une vraie adresse (`new URL`) est normalisé avant la décision ; ce qui reste étrange n'est jamais public", () => {
  const path = (url: string) => new URL(url, "http://localhost").pathname;
  assert.deepEqual(accessDecision(path("/auth/../clients?x=1"), false), to("/auth/login")); // `..` résolu : /clients, requête retirée
  assert.deepEqual(accessDecision(path("/auth/login?next=/clients"), false), NEXT); // la requête ne compte pas
  assert.deepEqual(accessDecision(path("//auth/login"), false), to("/auth/login")); // double barre : pas un chemin /auth/
  assert.deepEqual(accessDecision(path("/%61uth/login"), false), to("/auth/login")); // encodé : jamais public (redirigé vers la vraie page de connexion)
});

test("garde d'accès : /portfolio et /portfolio/qui-suis-je sont publics (sans session comme avec), mais ni les autres sous-chemins ni un faux ami", () => {
  assert.deepEqual(accessDecision("/portfolio/qui-suis-je", false), NEXT);
  assert.deepEqual(accessDecision("/portfolio/qui-suis-je/x", false), to("/auth/login"));
  assert.deepEqual(accessDecision("/portfolio", false), NEXT);
  assert.deepEqual(accessDecision("/portfolio", true), NEXT);
  for (const path of ["/portfolio/x", "/portfolio/", "/portfolios", "/portfolio-x", "/Portfolio", "/realisations"]) assert.deepEqual(accessDecision(path, false), to("/auth/login"), path);
});

test("garde d'accès : l'API reste fermée même sous un nom de portfolio ; chemins encodés ou doublés jamais publics", () => {
  assert.deepEqual(accessDecision("/api/portfolio", false), { action: "unauthorized" });
  for (const path of ["/%70ortfolio", "//portfolio", "/portfolio//", "/portfolio%2F"]) assert.deepEqual(accessDecision(path, false), to("/auth/login"), path);
});
