import assert from "node:assert/strict";
import test from "node:test";

import { CLIENT_NAME_MAX, clientsHref, countLabel, nextDir, parseClientView, validateClientInput, matchClients, viewClients, type ClientRow } from "./clients.ts";

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

const row = (id: string, name: string, status: ClientRow["status"], origin: ClientRow["origin"], created_at: string): ClientRow => ({ id, name, status, origin, created_at });
const ROWS = [
  row("1", "Atelier Brume", "client", "real_client", "2026-10-01T10:00:00Z"),
  row("2", "école Lanterne", "prospect", "demo", "2026-10-03T10:00:00Z"),
  row("3", "Coopérative Aval", "prospect", "training", "2026-10-02T10:00:00Z"),
  row("4", "Zélie", "client", "friend", "2026-10-04T10:00:00Z"),
];
const ids = (rows: ClientRow[]) => rows.map((r) => r.id).join(",");

test("liste : par défaut la plus récente d'abord, total = toutes les fiches", () => {
  const v = viewClients(ROWS, parseClientView({}));
  assert.equal(ids(v.rows), "4,2,3,1");
  assert.equal(v.total, 4);
});

test("filtres : statut, origine, les deux ; le total ignore les filtres ; aucun résultat possible", () => {
  assert.equal(ids(viewClients(ROWS, parseClientView({ statut: "prospect" })).rows), "2,3");
  assert.equal(ids(viewClients(ROWS, parseClientView({ origine: "friend" })).rows), "4");
  const both = viewClients(ROWS, parseClientView({ statut: "client", origine: "demo" }));
  assert.deepEqual([both.rows.length, both.total], [0, 4]);
});

test("tri par nom : alphabétique, accents et casse ignorés (« école » entre Coopérative et Zélie), les deux sens", () => {
  assert.equal(ids(viewClients(ROWS, parseClientView({ tri: "nom", ordre: "asc" })).rows), "1,3,2,4");
  assert.equal(ids(viewClients(ROWS, parseClientView({ tri: "nom", ordre: "desc" })).rows), "4,2,3,1");
});

test("tri par statut et par origine : par libellé français, pas dans l'ordre des enums de la base", () => {
  // Client < Prospect ; à égalité, la plus récente d'abord
  assert.equal(ids(viewClients(ROWS, parseClientView({ tri: "statut", ordre: "asc" })).rows), "4,1,2,3");
  // Ami < Client réel < Démo < Formation
  assert.equal(ids(viewClients(ROWS, parseClientView({ tri: "origine", ordre: "asc" })).rows), "4,1,2,3");
});

test("tri par date de création : croissant et décroissant", () => {
  assert.equal(ids(viewClients(ROWS, parseClientView({ tri: "creee", ordre: "asc" })).rows), "1,3,2,4");
});

test("liste vide : total 0, aucune erreur", () => {
  assert.deepEqual(viewClients([], parseClientView({ statut: "client" })), { rows: [], total: 0 });
});

test("recherche de fiches : accents et casse ignorés, tous les mots requis, début de nom d'abord, limite", () => {
  const all = [{ name: "Coopérative Aval" }, { name: "École Lanterne" }, { name: "Atelier Brume" }, { name: "Brume & Fils" }, { name: "Zélie" }];
  assert.deepEqual(matchClients(all, "ecole").map((c) => c.name), ["École Lanterne"]);
  assert.deepEqual(matchClients(all, "LANTERNE école").map((c) => c.name), ["École Lanterne"], "ordre des mots libre");
  assert.deepEqual(matchClients(all, "brume").map((c) => c.name), ["Brume & Fils", "Atelier Brume"], "le nom qui commence par la saisie passe d'abord");
  assert.deepEqual(matchClients(all, "brume lanterne"), [], "tous les mots sont requis");
  assert.deepEqual(matchClients(all, "   "), []);
  assert.equal(matchClients(Array.from({ length: 20 }, (_, i) => ({ name: `Client ${i}` })), "client").length, 8);
  assert.equal(matchClients(Array.from({ length: 20 }, (_, i) => ({ name: `Client ${i}` })), "client", 3).length, 3);
  assert.deepEqual(matchClients(all, "%"), [], "les caractères spéciaux n'ont aucun effet");
});
