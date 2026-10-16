import assert from "node:assert/strict";
import test from "node:test";

import { nextPosition, progressLabel, reorder, storyProgress, storySentence, validateStoryInput } from "./user-stories.ts";

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

test("monter et descendre : échange avec la voisine, null aux extrémités ou pour un inconnu ; renvoie l'ordre complet", () => {
  const ids = ["a", "b", "c"];
  assert.deepEqual(reorder(ids, "b", "up"), ["b", "a", "c"]);
  assert.deepEqual(reorder(ids, "b", "down"), ["a", "c", "b"]);
  assert.equal(reorder(ids, "a", "up"), null);
  assert.equal(reorder(ids, "c", "down"), null);
  assert.equal(reorder(ids, "zz", "up"), null);
  assert.deepEqual(ids, ["a", "b", "c"], "la liste d'origine n'est pas modifiée");
});
