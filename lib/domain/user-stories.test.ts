import assert from "node:assert/strict";
import test from "node:test";

import { nextPosition, isPermutation, progressLabel, storyProgress, storySentence, validateStoryInput } from "./user-stories.ts";

const ok = { title: "ajouter une story", role: "", benefit: "", acceptance_criteria: "", points: "", status: "todo" };

test("seul le titre est obligatoire ; les champs facultatifs vides deviennent null", () => {
  assert.deepEqual(validateStoryInput({ ...ok, title: "  suivre mes inscriptions  " }), {
    ok: true,
    value: { title: "suivre mes inscriptions", role: null, benefit: null, acceptance_criteria: null, points: null, status: "todo" },
  });
  const bad = validateStoryInput({ ...ok, title: "  " });
  assert.equal(bad.ok, false);
  if (!bad.ok) assert.match(bad.errors.title!, /titre/);
});

test("longueurs en points de code : 200 émoji acceptés, 201 refusés ; bénéfice à 300, critères à 4 000", () => {
  assert.equal(validateStoryInput({ ...ok, title: "😀".repeat(200) }).ok, true);
  assert.equal(validateStoryInput({ ...ok, title: "😀".repeat(201) }).ok, false);
  assert.equal(validateStoryInput({ ...ok, benefit: "b".repeat(300) }).ok, true);
  assert.equal(validateStoryInput({ ...ok, benefit: "b".repeat(301) }).ok, false);
  assert.equal(validateStoryInput({ ...ok, role: "r".repeat(201) }).ok, false);
  assert.equal(validateStoryInput({ ...ok, acceptance_criteria: "c".repeat(4000) }).ok, true);
  assert.equal(validateStoryInput({ ...ok, acceptance_criteria: "c".repeat(4001) }).ok, false);
});

test("points : suite de Fibonacci seulement ; statut inconnu refusé", () => {
  for (const p of ["1", "2", "3", "5", "8", "13"]) assert.equal(validateStoryInput({ ...ok, points: p }).ok, true, p);
  for (const p of ["4", "0", "21", "-3", "2.5", "abc"]) assert.equal(validateStoryInput({ ...ok, points: p }).ok, false, p);
  const r = validateStoryInput({ ...ok, points: "5" });
  assert.equal(r.ok && r.value.points, 5);
  const bad = validateStoryInput({ ...ok, status: "bientôt" });
  assert.equal(!bad.ok && Boolean(bad.errors.status), true);
});

test("phrase « En tant que… je veux… afin de… » : parties absentes omises", () => {
  assert.equal(storySentence({ title: "voir mes tâches", role: "consultant", benefit: "gagner du temps" }), "En tant que consultant, je veux voir mes tâches, afin de gagner du temps");
  assert.equal(storySentence({ title: "voir mes tâches", role: "consultant", benefit: null }), "En tant que consultant, je veux voir mes tâches");
  assert.equal(storySentence({ title: "voir mes tâches", role: null, benefit: "gagner du temps" }), "Je veux voir mes tâches, afin de gagner du temps");
  assert.equal(storySentence({ title: "voir mes tâches", role: null, benefit: null }), "Je veux voir mes tâches");
});

test("progression : « N sur M stories terminées », accord au singulier, jamais « 0 sur 0 »", () => {
  const rows = [{ id: "a", status: "done" as const }, { id: "b", status: "todo" as const }, { id: "c", status: "in_progress" as const }, { id: "d", status: "done" as const }, { id: "e", status: "todo" as const }];
  assert.deepEqual(storyProgress(rows), { done: 2, total: 5 });
  assert.equal(progressLabel({ done: 2, total: 5 }), "2 sur 5 stories terminées");
  assert.equal(progressLabel({ done: 1, total: 1 }), "1 sur 1 story terminée");
  assert.equal(progressLabel({ done: 0, total: 0 }), "Aucune user story");
});

test("position suivante : la dernière place", () => {
  assert.equal(nextPosition([]), 0);
  assert.equal(nextPosition([0, 1, 4]), 5);
});

test("réordonnancement : mêmes identifiants, chacun une fois, dans n'importe quel ordre ; un ajout, un retrait, un doublon ou un inconnu sont refusés", () => {
  const ids = ["a", "b", "c"];
  assert.equal(isPermutation(ids, ["c", "a", "b"]), true);
  assert.equal(isPermutation(ids, ids), true);
  assert.equal(isPermutation([], []), true);
  assert.equal(isPermutation(ids, ["a", "b"]), false, "un retrait");
  assert.equal(isPermutation(ids, ["a", "b", "c", "d"]), false, "un ajout");
  assert.equal(isPermutation(ids, ["a", "a", "b"]), false, "un doublon");
  assert.equal(isPermutation(ids, ["a", "b", "z"]), false, "un inconnu");
  assert.equal(isPermutation(["a", "a"], ["a", "a"]), false, "l'état courant doit lui-même être sans doublon");
});

test("caractère nul retiré ; rôle, bénéfice et critères nettoyés des espaces et tabulations ; rôle à 200 accepté ; erreurs sur la bonne clé", () => {
  const nul = validateStoryInput({ ...ok, title: "a\u0000b" });
  assert.equal(nul.ok && nul.value.title, "ab");
  assert.equal(validateStoryInput({ ...ok, title: "\u0000" }).ok, false);
  const blanks = validateStoryInput({ ...ok, role: " \t\n ", benefit: "  ", acceptance_criteria: "\n " });
  assert.deepEqual(blanks.ok && [blanks.value.role, blanks.value.benefit, blanks.value.acceptance_criteria], [null, null, null]);
  assert.equal(validateStoryInput({ ...ok, role: "r".repeat(200) }).ok, true);
  const role = validateStoryInput({ ...ok, role: "r".repeat(201) });
  const benefit = validateStoryInput({ ...ok, benefit: "b".repeat(301) });
  const criteria = validateStoryInput({ ...ok, acceptance_criteria: "c".repeat(4001) });
  assert.deepEqual(!role.ok && Object.keys(role.errors), ["role"]);
  assert.deepEqual(!benefit.ok && Object.keys(benefit.errors), ["benefit"]);
  assert.deepEqual(!criteria.ok && Object.keys(criteria.errors), ["acceptance_criteria"]);
});

test("points : seulement des chiffres ; « 5.0 », « 0x5 », « 5e0 », « 1e1 », « +5 » refusés ; « 05 » et espaces autour acceptés", () => {
  for (const p of ["5.0", "0x5", "5e0", "1e1", "+5", "0b101"]) assert.equal(validateStoryInput({ ...ok, points: p }).ok, false, p);
  for (const p of ["05", " 5 "]) assert.equal(validateStoryInput({ ...ok, points: p }).ok, true, p);
});

test("phrase : élision française devant voyelle (qu', d'), pas devant consonne", () => {
  assert.equal(storySentence({ title: "agir", role: "administrateur", benefit: "agir vite" }), "En tant qu'administrateur, je veux agir, afin d'agir vite");
  assert.equal(storySentence({ title: "x", role: "élève", benefit: "économiser" }), "En tant qu'élève, je veux x, afin d'économiser");
  assert.equal(storySentence({ title: "x", role: "parent", benefit: "gagner" }), "En tant que parent, je veux x, afin de gagner");
});

test("mots de liaison : « en tant que » et « afin de » écrits par l'utilisateur ou l'IA ne sont pas doublés dans la phrase ; majuscule initiale du titre abaissée sauf sigle", () => {
  const r = validateStoryInput({ ...ok, title: "Suivre les inscriptions", role: "En tant que parent", benefit: "afin de ne rien oublier" });
  assert.deepEqual(r.ok && [r.value.role, r.value.benefit], ["parent", "ne rien oublier"]);
  assert.equal(validateStoryInput({ ...ok, role: "En tant qu'élève", benefit: "d'agir" }).ok && true, true);
  const e = validateStoryInput({ ...ok, role: "En tant qu'élève", benefit: "d'agir vite" });
  assert.deepEqual(e.ok && [e.value.role, e.value.benefit], ["élève", "agir vite"]);
  const de = validateStoryInput({ ...ok, benefit: "de connaître l'état" });
  assert.equal(de.ok && de.value.benefit, "connaître l'état");
  assert.equal(storySentence({ title: "Suivre les inscriptions", role: "parent", benefit: "ne rien oublier" }), "En tant que parent, je veux suivre les inscriptions, afin de ne rien oublier");
  assert.equal(storySentence({ title: "Exporter en PDF", role: null, benefit: null }), "Je veux exporter en PDF");
  assert.equal(storySentence({ title: "PDF à exporter", role: null, benefit: null }), "Je veux PDF à exporter");
});

test("normalisation du bénéfice : seulement devant un infinitif ; « de Gaulle », « d'abord », « d'autres », « dépenser » intacts ; « afin que » gardé", () => {
  const b = (benefit: string) => { const r = validateStoryInput({ ...ok, benefit }); return r.ok ? r.value.benefit : "ERREUR"; };
  assert.equal(b("de connaître l'état"), "connaître l'état");
  assert.equal(b("d'agir vite"), "agir vite");
  assert.equal(b("de ne rien oublier"), "ne rien oublier");
  assert.equal(b("afin de repérer les retards"), "repérer les retards");
  for (const intact of ["de Gaulle est cité", "d'abord les urgences", "d'autres clients", "dépenser moins", "Quentin suit"]) assert.equal(b(intact), intact);
  assert.equal(b("afin que les familles soient relancées"), "que les familles soient relancées");
  assert.equal(storySentence({ title: "x", role: null, benefit: "que les familles soient relancées" }), "Je veux x, afin que les familles soient relancées");
  const t = validateStoryInput({ ...ok, title: "Je veux suivre les inscriptions" });
  assert.equal(t.ok && t.value.title, "suivre les inscriptions");
});

test("majuscule initiale : abaissée devant un infinitif seulement ; noms propres, marques et sigles gardés ; bénéfice abaissé, rôle gardé", () => {
  const sentence = (title: string) => storySentence({ title, role: null, benefit: null });
  assert.equal(sentence("Suivre les inscriptions"), "Je veux suivre les inscriptions");
  assert.equal(sentence("Se connecter à Notion"), "Je veux se connecter à Notion");
  for (const keep of ["Notion synchronisé avec Airtable", "Excel vers CRM", "Mailchimp pour les rappels", "API REST", "PDF à exporter"]) assert.equal(sentence(keep), `Je veux ${keep}`);
  // Le bénéfice qui commence par un infinitif est abaissé ; le rôle est gardé tel qu'écrit (un nom commun ne se distingue pas d'un nom propre).
  assert.equal(storySentence({ title: "suivre", role: "Responsable", benefit: "Relancer" }), "En tant que Responsable, je veux suivre, afin de relancer");
});
