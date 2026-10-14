import assert from "node:assert/strict";
import test from "node:test";

import { CLIENT_NAME_MAX, clientsHref, countLabel, nextDir, parseClientView, validateClientInput } from "./clients.ts";

test("création : nom et origine obligatoires, nom nettoyé", () => {
  const ok = validateClientInput({ name: "  Atelier Brume \u0000 ", status: "prospect", origin: "demo" });
  assert.deepEqual(ok, { ok: true, value: { name: "Atelier Brume", status: "prospect", origin: "demo" } });
});

test("nom vide ou d'espaces, origine ou statut absents ou inconnus : erreurs nommant le champ", () => {
  const r = validateClientInput({ name: "   ", status: "autre", origin: "" });
  assert.ok(!r.ok);
  if (!r.ok) assert.deepEqual(Object.keys(r.errors).sort(), ["name", "origin", "status"]);
});

test("nom trop long refusé au décompte en points de code (comme la base)", () => {
  assert.ok(validateClientInput({ name: "é".repeat(CLIENT_NAME_MAX), status: "client", origin: "friend" }).ok);
  assert.ok(!validateClientInput({ name: "é".repeat(CLIENT_NAME_MAX + 1), status: "client", origin: "friend" }).ok);
  assert.ok(validateClientInput({ name: "😀".repeat(CLIENT_NAME_MAX), status: "client", origin: "friend" }).ok, "un émoji compte pour 1");
});

test("adresse de la liste : filtres connus gardés, valeurs inconnues ignorées, tri par défaut = création récente d'abord", () => {
  assert.deepEqual(parseClientView({}), { statut: null, origine: null, tri: "creee", ordre: "desc" });
  assert.deepEqual(parseClientView({ statut: "client", origine: "demo", tri: "nom", ordre: "desc" }), { statut: "client", origine: "demo", tri: "nom", ordre: "desc" });
  assert.deepEqual(parseClientView({ statut: "x", origine: "y", tri: "inconnu", ordre: "asc" }), { statut: null, origine: null, tri: "creee", ordre: "desc" });
  assert.equal(parseClientView({ tri: "toString" }).tri, "creee", "pas de clé héritée de Object");
  assert.equal(parseClientView({ tri: "nom" }).ordre, "asc");
});

test("liens : la vue par défaut n'écrit rien ; filtres et tri s'écrivent ; le prochain clic inverse l'ordre", () => {
  assert.equal(clientsHref({}), "/clients");
  assert.equal(clientsHref({ statut: "prospect", tri: "nom", ordre: "asc" }), "/clients?statut=prospect&tri=nom&ordre=asc");
  assert.equal(clientsHref({ tri: "creee", ordre: "desc" }), "/clients");
  assert.equal(clientsHref({ tri: "creee", ordre: "asc" }), "/clients?tri=creee&ordre=asc");
  const v = parseClientView({ tri: "nom", ordre: "asc" });
  assert.equal(nextDir(v, "nom"), "desc");
  assert.equal(nextDir(v, "statut"), "asc");
});

test("compteur : « 12 fiches sur 40 », singulier à 0 et 1", () => {
  assert.equal(countLabel(12, 40), "12 fiches sur 40");
  assert.equal(countLabel(1, 1), "1 fiche");
  assert.equal(countLabel(0, 0), "0 fiche");
  assert.equal(countLabel(1, 40), "1 fiche sur 40");
  assert.equal(countLabel(40, 40), "40 fiches");
});
