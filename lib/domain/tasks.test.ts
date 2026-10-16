import assert from "node:assert/strict";
import test from "node:test";

import { taskProgress, taskProgressLabel, validateTaskTitle } from "./tasks.ts";

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
