import assert from "node:assert/strict";
import test from "node:test";

import { HINT_MAX, TASKS_ADD_MAX, showTaskProgress, taskProgress, taskProgressLabel, validateHint, validateTaskBatch, validateTaskTitle } from "./tasks.ts";

test("titre : espaces retirés, vide ou nul seul refusé, 200 acceptés et 201 refusés (points de code)", () => {
  assert.deepEqual(validateTaskTitle("  écrire le mail  "), { ok: true, value: "écrire le mail" });
  assert.equal(validateTaskTitle("   ").ok, false);
  assert.equal(validateTaskTitle("\u0000").ok, false);
  assert.deepEqual(validateTaskTitle("a\u0000b"), { ok: true, value: "ab" });
  assert.equal(validateTaskTitle("é".repeat(200)).ok, true);
  assert.equal(validateTaskTitle("é".repeat(201)).ok, false);
  assert.equal(validateTaskTitle("😀".repeat(200)).ok, true, "200 émojis = 200 points de code, comme char_length côté base");
});

test("avancement : « N sur M tâches faites », singulier à une tâche, rien sans tâche", () => {
  assert.equal(taskProgressLabel(taskProgress([])), "");
  assert.equal(taskProgressLabel(taskProgress([{ done: true }])), "1 sur 1 tâche faite");
  assert.equal(taskProgressLabel(taskProgress([{ done: true }, { done: false }, { done: true }, { done: true }])), "3 sur 4 tâches faites");
});

test("titre : pas du texte = vide ; le caractère nul est retiré avant les espaces (« a \u0000 » donne « a », « \u0000 » seul est refusé)", () => {
  for (const bad of [undefined, null, 5, {}, ["a"]]) assert.equal(validateTaskTitle(bad).ok, false, String(bad));
  assert.deepEqual(validateTaskTitle("a \u0000"), { ok: true, value: "a" });
  assert.equal(validateTaskTitle(" \u0000 ").ok, false);
});

test("avancement : exactement deux tâches, aucune faite, et une valeur seulement « vraie » ne compte pas comme faite", () => {
  assert.equal(taskProgressLabel(taskProgress([{ done: false }, { done: false }])), "0 sur 2 tâches faites");
  assert.equal(taskProgressLabel(taskProgress([{ done: true }, { done: true }])), "2 sur 2 tâches faites");
});

test("lot de titres : 1 à 50 titres valides, nettoyés ; 0, 51, un non-tableau ou un titre invalide sont refusés", () => {
  assert.deepEqual(validateTaskBatch([" a ", "b"]), { ok: true, value: ["a", "b"] });
  const fifty = Array.from({ length: TASKS_ADD_MAX }, (_, i) => `t${i}`);
  assert.equal(validateTaskBatch(fifty).ok, true);
  assert.equal(validateTaskBatch([...fifty, "de trop"]).ok, false, "51 refusés");
  assert.equal(validateTaskBatch([]).ok, false);
  for (const bad of ["abc", undefined, null, 5, {}]) assert.equal(validateTaskBatch(bad).ok, false, String(bad));
  for (const title of ["x".repeat(201), "\u0000", "   ", 5, null]) assert.equal(validateTaskBatch(["ok", title]).ok, false, `un titre invalide fait tout refuser : ${String(title).slice(0, 5)}`);
  assert.equal(validateTaskBatch(["é".repeat(200)]).ok, true);
});

test("précision : 1 000 points de code acceptés, 1 001 refusés ; émojis comptés en points de code ; vide ou absente acceptée ; non-texte refusé", () => {
  assert.deepEqual(validateHint(undefined), { ok: true, value: "" });
  assert.deepEqual(validateHint(null), { ok: true, value: "" });
  assert.deepEqual(validateHint(""), { ok: true, value: "" });
  assert.equal(validateHint("a".repeat(HINT_MAX)).ok, true);
  assert.equal(validateHint("a".repeat(HINT_MAX + 1)).ok, false);
  assert.equal(validateHint("😀".repeat(HINT_MAX)).ok, true, "1 000 émojis = 2 000 unités UTF-16 mais 1 000 points de code");
  assert.equal(validateHint("😀".repeat(HINT_MAX + 1)).ok, false);
  assert.equal(validateHint(" ".repeat(HINT_MAX)).ok, true);
  for (const bad of [5, {}, ["a"], true]) assert.equal(validateHint(bad).ok, false, String(bad));
});

test("compteur : masqué pour une story terminée et sans tâche, visible sinon (même à 0 tâche faite)", () => {
  const some = taskProgress([{ done: false }, { done: false }]);
  assert.equal(showTaskProgress("done", some), false);
  assert.equal(showTaskProgress("todo", some), true);
  assert.equal(showTaskProgress("in_progress", some), true);
  assert.equal(showTaskProgress("todo", taskProgress([])), false);
  assert.equal(showTaskProgress("done", taskProgress([])), false);
});
