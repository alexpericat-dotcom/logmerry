import assert from "node:assert/strict";
import test from "node:test";

import { CONTEXT_MAX, buildMissionContext, parseContextLevel, type StoryForContext, type TaskForContext } from "./mission-context.ts";

const mission = { title: "Suivi des inscriptions", status: "in_progress" as const, start_date: "2026-10-01", end_date: null, clientName: "Les Petits Débrouillards" };
const story = (id: string, over: Partial<StoryForContext> = {}): StoryForContext => ({ id, title: `Story ${id}`, role: null, benefit: null, acceptance_criteria: null, points: null, status: "todo", ...over });

test("mission seule : titre, client, statut, début ; la fin absente est omise, jamais « null »", () => {
  const { text, omitted } = buildMissionContext({ mission, stories: [story("a")], tasks: [], level: "mission", includeClient: true });
  assert.equal(omitted, 0);
  assert.equal(text, "## Contexte\n\n### Mission\n- Titre : Suivi des inscriptions\n- Client : Les Petits Débrouillards\n- Statut : En cours\n- Début : 2026-10-01");
  assert.ok(!text.includes("null") && !text.includes("Fin") && !text.includes("Backlog"));
});

test("sans le nom du client : il n'apparaît nulle part ; un client absent n'ajoute pas de ligne", () => {
  const without = buildMissionContext({ mission, stories: [], tasks: [], level: "backlog", includeClient: false }).text;
  assert.ok(!without.includes("Débrouillards") && !without.includes("Client"));
  assert.ok(!buildMissionContext({ mission: { ...mission, clientName: null }, stories: [], tasks: [], level: "mission", includeClient: true }).text.includes("Client"));
});

test("backlog vide : « Aucune user story pour l'instant. » (jamais « 0 user stories »)", () => {
  const { text } = buildMissionContext({ mission, stories: [], tasks: [], level: "tasks", includeClient: true });
  assert.match(text, /### Backlog\nAucune user story pour l'instant\./);
  assert.ok(!text.includes("0 user"));
});

test("niveau backlog : statut, titre et points seulement, dans l'ordre reçu", () => {
  const { text } = buildMissionContext({ mission, stories: [story("a", { points: 5, status: "done" }), story("b", { role: "directrice", benefit: "agir", acceptance_criteria: "- c1" })], tasks: [{ story_id: "a", title: "t", done: true }], level: "backlog", includeClient: true });
  assert.match(text, /### Backlog \(2 user stories, de la plus à la moins prioritaire\)\n1\. \[Terminée\] Story a — 5 pts\n2\. \[À faire\] Story b$/);
  assert.ok(!text.includes("directrice") && !text.includes("Critères") && !text.includes("Tâches"));
});

test("niveau stories : phrase « En tant que… » et critères indentés, sans les tâches", () => {
  const { text } = buildMissionContext({ mission, stories: [story("a", { role: "directrice", benefit: "agir vite", acceptance_criteria: "- c1\n- c2" })], tasks: [{ story_id: "a", title: "t", done: false }], level: "stories", includeClient: true });
  assert.match(text, /   - En tant que directrice, je veux story a, afin d'agir vite/i);
  assert.match(text, /   - Critères d'acceptation :\n     - c1\n     - c2/);
  assert.ok(!text.includes("Tâches"));
});

test("niveau tâches : avancement et cases cochées, tâches de chaque story à sa place ; une story sans tâche n'a pas de ligne « Tâches »", () => {
  const tasks: TaskForContext[] = [{ story_id: "a", title: "Créer", done: true }, { story_id: "a", title: "Tester", done: false }, { story_id: "b", title: "Autre", done: false }];
  const { text } = buildMissionContext({ mission, stories: [story("a"), story("b"), story("c")], tasks, level: "tasks", includeClient: true });
  assert.match(text, /1\. \[À faire\] Story a\n   - Tâches \(1 sur 2 faites\) :\n     - \[x\] Créer\n     - \[ \] Tester\n2\. \[À faire\] Story b\n   - Tâches \(0 sur 1 faites\) :\n     - \[ \] Autre\n3\. \[À faire\] Story c$/);
});

test(`plafond de ${CONTEXT_MAX} caractères : les dernières stories sont omises et le bloc le dit ; le texte ne dépasse pas le plafond`, () => {
  const stories = Array.from({ length: 80 }, (_, i) => story(String(i), { title: `Story ${i} ${"x".repeat(100)}`, acceptance_criteria: "- " + "critère ".repeat(60) }));
  const { text, omitted } = buildMissionContext({ mission, stories, tasks: [], level: "stories", includeClient: true });
  assert.ok(omitted > 0 && omitted < 80);
  assert.ok([...text].length <= CONTEXT_MAX, `${[...text].length} caractères`);
  assert.match(text, new RegExp(`… ${omitted} user stories omises \\(le contexte est limité à`));
  assert.ok(text.includes("Story 0 ") && !text.includes(`Story ${79} `), "les premières sont gardées, les dernières omises");
});

test("une seule story omise : singulier ; aucune omission sous le plafond", () => {
  const small = buildMissionContext({ mission, stories: [story("a")], tasks: [], level: "stories", includeClient: true });
  assert.equal(small.omitted, 0);
  assert.ok(!small.text.includes("omise"));
  assert.match(small.text, /\(1 user story,/);
});

test("niveau reçu d'un formulaire : seuls les quatre niveaux sont acceptés", () => {
  assert.equal(parseContextLevel("tasks"), "tasks");
  for (const bad of ["", "all", null, undefined, 3]) assert.equal(parseContextLevel(bad), null);
});
