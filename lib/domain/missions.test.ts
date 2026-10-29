import assert from "node:assert/strict";
import test from "node:test";

import { matchMissions, countLabel, missionDeletionNotice, missionsHref, selectableMissions, missionsRefusal, nextDir, parseMissionView, validateMissionInput, viewMissions, type MissionRow } from "./missions.ts";

const CLIENT = "11111111-2222-3333-4444-555555555555";
const ok = { client_id: CLIENT, title: "Audit", status: "in_progress", start_date: "", end_date: "" };

test("client et titre obligatoires ; le reste est facultatif et vide devient null", () => {
  const r = validateMissionInput({ ...ok, title: "  Audit des processus  " });
  assert.deepEqual(r, { ok: true, value: { client_id: CLIENT, title: "Audit des processus", status: "in_progress", start_date: null, end_date: null } });
  const bad = validateMissionInput({ ...ok, client_id: "", title: "   " });
  assert.equal(bad.ok, false);
  if (!bad.ok) assert.ok(bad.errors.client_id && bad.errors.title);
});

test("titre de plus de 200 caractères refusé ; 200 acceptés (points de code)", () => {
  assert.equal(validateMissionInput({ ...ok, title: "é".repeat(200) }).ok, true);
  assert.equal(validateMissionInput({ ...ok, title: "é".repeat(201) }).ok, false);
});

test("dates : format et calendrier vérifiés, la fin ne précède jamais le début", () => {
  assert.equal(validateMissionInput({ ...ok, start_date: "2026-02-31" }).ok, false);
  assert.equal(validateMissionInput({ ...ok, end_date: "demain" }).ok, false);
  const inverse = validateMissionInput({ ...ok, start_date: "2026-10-20", end_date: "2026-10-10" });
  assert.equal(inverse.ok, false);
  if (!inverse.ok) assert.match(inverse.errors.end_date!, /précéder/);
  assert.equal(validateMissionInput({ ...ok, start_date: "2026-10-10", end_date: "2026-10-10" }).ok, true);
  assert.equal(validateMissionInput({ ...ok, end_date: "2026-10-10" }).ok, true); // fin seule acceptée
});

test("statut inconnu refusé", () => {
  const r = validateMissionInput({ ...ok, status: "bientôt" });
  assert.equal(r.ok, false);
});

test("adresse de la liste : valeurs inconnues ignorées, par défaut la plus récente d'abord, slugs français", () => {
  assert.deepEqual(parseMissionView({ statut: "nimporte", tri: "x" }), { statut: null, tri: "creee", ordre: "desc" });
  assert.deepEqual(parseMissionView({ statut: "terminee", tri: "titre" }), { statut: "done", tri: "titre", ordre: "asc" });
  assert.equal(missionsHref({ statut: "done", tri: "creee", ordre: "desc" }), "/missions?statut=terminee");
  assert.equal(missionsHref({}), "/missions");
  assert.equal(countLabel(1, 1), "1 mission");
  assert.equal(countLabel(2, 5), "2 missions sur 5");
});

const row = (id: string, title: string, status: MissionRow["status"], start: string | null, created: string, client = "Zèbre"): MissionRow => ({ id, title, status, start_date: start, end_date: null, created_at: created, client: { name: client } });

test("filtre par statut, tri alphabétique sans accents, dates absentes toujours en dernier", () => {
  const all = [
    row("a", "Étude", "done", "2026-10-02", "2026-10-01T10:00:00Z"),
    row("b", "audit", "in_progress", null, "2026-10-02T10:00:00Z"),
    row("c", "Bilan", "in_progress", "2026-10-01", "2026-10-03T10:00:00Z"),
  ];
  const ids = (view: Parameters<typeof viewMissions>[1]) => viewMissions(all, view).rows.map((m) => m.id).join("");
  assert.equal(ids({ statut: "in_progress", tri: "creee", ordre: "desc" }), "cb");
  assert.equal(ids({ statut: null, tri: "titre", ordre: "asc" }), "bca"); // audit, Bilan, Étude
  assert.equal(ids({ statut: null, tri: "debut", ordre: "asc" }), "cab");
  assert.equal(ids({ statut: null, tri: "debut", ordre: "desc" }), "acb"); // « b » sans date reste dernier
  assert.equal(viewMissions(all, { statut: "done", tri: "creee", ordre: "desc" }).total, 3);
});

test("refus de supprimer une fiche : accord au singulier et au pluriel", () => {
  assert.match(missionsRefusal(1), /1 mission : supprime-la/);
  assert.match(missionsRefusal(3), /3 missions : supprime-les/);
});

test("longueur du titre en points de code : 200 émoji acceptés, 201 refusés (un émoji vaut 2 unités UTF-16)", () => {
  assert.equal(validateMissionInput({ ...ok, title: "😀".repeat(200) }).ok, true);
  assert.equal(validateMissionInput({ ...ok, title: "😀".repeat(201) }).ok, false);
});

test("identifiant de client mal formé refusé ; dates nettoyées des espaces ; année 0000 refusée ; statut en erreur nommée", () => {
  const bad = validateMissionInput({ ...ok, client_id: "abc" });
  assert.equal(bad.ok, false);
  if (!bad.ok) assert.ok(bad.errors.client_id);
  const trimmed = validateMissionInput({ ...ok, start_date: " 2026-10-10 ", end_date: " 2026-10-12 " });
  assert.deepEqual(trimmed.ok && [trimmed.value.start_date, trimmed.value.end_date], ["2026-10-10", "2026-10-12"]);
  assert.equal(validateMissionInput({ ...ok, start_date: "0000-01-01" }).ok, false);
  const status = validateMissionInput({ ...ok, status: "x" });
  assert.equal(!status.ok && Boolean(status.errors.status), true);
});

test("adresse : tri décroissant et tableau lus, sens suivant d'un en-tête, tri par défaut écrit quand il est croissant", () => {
  assert.deepEqual(parseMissionView({ tri: ["fin", "titre"], ordre: ["desc"] }), { statut: null, tri: "fin", ordre: "desc" });
  assert.deepEqual(parseMissionView({ ordre: "desc" }), { statut: null, tri: "creee", ordre: "desc" }); // « ordre » seul est ignoré
  const view = { statut: null, tri: "titre" as const, ordre: "asc" as const };
  assert.equal(nextDir(view, "titre"), "desc");
  assert.equal(nextDir({ ...view, ordre: "desc" }, "titre"), "asc");
  assert.equal(nextDir(view, "client"), "asc");
  assert.equal(missionsHref({ tri: "creee", ordre: "asc" }), "/missions?tri=creee&ordre=asc");
});

test("tris par fin, client et statut ; départage par date de création ; accents ignorés", () => {
  const m = (id: string, title: string, status: MissionRow["status"], end: string | null, created: string, client: string): MissionRow => ({
    id, title, status, start_date: null, end_date: end, created_at: created, client: { name: client },
  });
  const all = [
    m("a", "x", "done", "2026-12-01", "2026-10-01T10:00:00Z", "Étoile"),
    m("b", "y", "cancelled", "2026-11-01", "2026-10-02T10:00:00Z", "Zèbre"),
    m("c", "z", "in_progress", null, "2026-10-03T10:00:00Z", "etoile"),
  ];
  const ids = (view: Parameters<typeof viewMissions>[1]) => viewMissions(all, view).rows.map((r) => r.id).join("");
  assert.equal(ids({ statut: null, tri: "fin", ordre: "asc" }), "bac"); // sans date en dernier
  assert.equal(ids({ statut: null, tri: "statut", ordre: "asc" }), "bca"); // Annulée (b) < En cours (c) < Terminée (a)
  assert.equal(ids({ statut: null, tri: "client", ordre: "asc" }), "cab"); // « Étoile » = « etoile » (égalité) : la plus récente (c) d'abord
  assert.equal(ids({ statut: null, tri: "client", ordre: "desc" }), "bca");
});

const mk = (id: string, title: string, client: string | null) => ({ id, title, client: client === null ? null : { name: client } });

test("recherche de missions : titre ou nom du client, casse et accents ignorés, tous les mots requis", () => {
  const all = [mk("1", "Refonte du site", "Société Étoile"), mk("2", "Atelier n8n", "Dupont"), mk("3", "Dupont — devis du 18/10/2026", "Dupont")];
  assert.deepEqual(matchMissions(all, "REFONTE").map((m) => m.id), ["1"]);
  assert.deepEqual(matchMissions(all, "etoile").map((m) => m.id), ["1"], "nom du client, sans accent");
  assert.deepEqual(matchMissions(all, "dupont atelier").map((m) => m.id), ["2"], "un mot dans le titre, l'autre dans le nom du client");
  assert.deepEqual(matchMissions(all, "refonte etoile").map((m) => m.id), ["1"]);
  assert.deepEqual(matchMissions(all, "refonte zzz"), [], "un mot absent exclut");
  assert.deepEqual(matchMissions(all, "dupont refonte"), [], "mots de deux missions différentes : aucune ne les a tous");
  assert.deepEqual(matchMissions(all, "   "), []);
  assert.deepEqual(matchMissions(all, ""), []);
});

test("recherche de missions : accents ignorés dans le titre comme dans la saisie, espaces multiples du titre sans effet sur le rang", () => {
  const all = [mk("1", "Étude de marché", "X"), mk("2", "Etude de site", "X"), mk("3", "Mon  étude", "X"), mk("4", "Site  web", "Y"), mk("5", "Mon site web", "Y")];
  assert.deepEqual(matchMissions(all, "etude").map((m) => m.id), ["1", "2", "3"], "saisie sans accent, titres accentués ou non");
  assert.deepEqual(matchMissions(all, "ÉTUDE").map((m) => m.id), ["1", "2", "3"], "saisie accentuée et en majuscules");
  assert.deepEqual(matchMissions(all, "site web").map((m) => m.id), ["4", "5"], "« Site  web » (deux espaces) commence par la saisie : rang 0, avant « Mon site web »");
});

test("recherche de missions : titre qui commence, puis titre qui contient, puis nom du client ; alphabétique à égalité ; huit au plus", () => {
  const all = [mk("a", "Site de Zoé", "Zoé"), mk("b", "Audit", "Site Web SA"), mk("c", "Mon site", "Léa"), mk("d", "Site de Alice", "Alice")];
  assert.deepEqual(matchMissions(all, "site").map((m) => m.id), ["d", "a", "c", "b"]);
  const many = Array.from({ length: 12 }, (_, i) => mk(String(i), `Mission ${String(i).padStart(2, "0")}`, "X"));
  assert.equal(matchMissions(many, "mission").length, 8);
  assert.deepEqual(matchMissions(many, "mission", 3).map((m) => m.id), ["0", "1", "2"]);
});

test("recherche de missions : une mission sans client lisible se trouve par son titre", () => {
  assert.deepEqual(matchMissions([mk("1", "Orpheline", null)], "orph").map((m) => m.id), ["1"]);
  assert.deepEqual(matchMissions([mk("1", "Orpheline", null)], "x"), []);
});

test("mission liée à un devis : seulement les missions ouvertes, plus celle déjà liée (même terminée)", () => {
  const all = [
    { id: "a", status: "planned" },
    { id: "b", status: "in_progress" },
    { id: "c", status: "done" },
    { id: "d", status: "cancelled" },
  ];
  assert.deepEqual(selectableMissions(all, "").map((m) => m.id), ["a", "b"]);
  assert.deepEqual(selectableMissions(all, "c").map((m) => m.id), ["a", "b", "c"]);
  assert.deepEqual(selectableMissions(all, "d").map((m) => m.id), ["a", "b", "d"]);
  assert.deepEqual(selectableMissions([], "x"), []);
});

test("confirmation de suppression d'une mission : stories et sprints, pluriels français, rien si rien", () => {
  assert.equal(missionDeletionNotice(0, 0), null);
  assert.equal(missionDeletionNotice(1, 0), "Son backlog sera supprimé aussi : 1 user story.");
  assert.equal(missionDeletionNotice(3, 0), "Son backlog sera supprimé aussi : 3 user stories.");
  assert.equal(missionDeletionNotice(3, 1), "Son backlog sera supprimé aussi : 3 user stories, 1 sprint.");
  assert.equal(missionDeletionNotice(1, 2), "Son backlog sera supprimé aussi : 1 user story, 2 sprints.");
  assert.equal(missionDeletionNotice(0, 2), "Ses sprints seront supprimés aussi : 2 sprints.");
  assert.equal(missionDeletionNotice(0, 1), "Ses sprints seront supprimés aussi : 1 sprint.");
});
