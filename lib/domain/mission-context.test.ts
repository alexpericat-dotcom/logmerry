import assert from "node:assert/strict";
import test from "node:test";

import { CONTEXT_MAX, CONTEXT_NOTICE, FIELD_MAX, STORY_BLOCK_MAX, buildMissionContext, clientNameOf, parseContextLevel, type StoryForContext, type TaskForContext } from "./mission-context.ts";

const mission = { title: "Suivi des inscriptions", status: "in_progress" as const, start_date: "2026-10-01", end_date: null, clientName: "Les Petits Débrouillards" };
const story = (id: string, over: Partial<StoryForContext> = {}): StoryForContext => ({ id, title: `Story ${id}`, role: null, benefit: null, acceptance_criteria: null, points: null, status: "todo", ...over });

test("mission seule : titre, client, statut, début ; la fin absente est omise, jamais « null »", () => {
  const { text, omitted } = buildMissionContext({ mission, stories: [story("a")], tasks: [], level: "mission", includeClient: true });
  assert.equal(omitted, 0);
  assert.equal(text, `## Contexte\n\n${CONTEXT_NOTICE}\n\n### Mission\n- Titre : Suivi des inscriptions\n- Client : Les Petits Débrouillards\n- Statut : En cours\n- Début : 2026-10-01`);
  assert.ok(!text.includes("null") && !text.includes("Fin") && !text.includes("Backlog"));
});

test("sans le nom du client : il n'apparaît nulle part ; un client absent n'ajoute pas de ligne", () => {
  const without = buildMissionContext({ mission, stories: [], tasks: [], level: "all", includeClient: false }).text;
  assert.ok(!without.includes("Débrouillards") && !without.includes("Client"));
  assert.ok(!buildMissionContext({ mission: { ...mission, clientName: null }, stories: [], tasks: [], level: "mission", includeClient: true }).text.includes("Client"));
});

test("backlog vide : « Aucune user story pour l'instant. » (jamais « 0 user stories »)", () => {
  const { text } = buildMissionContext({ mission, stories: [], tasks: [], level: "all", includeClient: true });
  assert.match(text, /### Backlog\nAucune user story pour l'instant\./);
  assert.ok(!text.includes("0 user"));
});

test("tout le contexte : statut, titre, points, phrase « En tant que… », critères indentés, dans l'ordre reçu", () => {
  const { text } = buildMissionContext({ mission, stories: [story("a", { points: 5, status: "done" }), story("b", { role: "directrice", benefit: "agir vite", acceptance_criteria: "- c1\n- c2" })], tasks: [], level: "all", includeClient: true });
  assert.match(text, /### Backlog \(2 user stories, de la plus à la moins prioritaire\)\n1\. \[Terminée\] Story a — 5 pts\n2\. \[À faire\] Story b\n/);
  assert.match(text, /   - En tant que directrice, je veux story b, afin d'agir vite/i);
  assert.match(text, /   - Critères d'acceptation :\n     - c1\n     - c2/);
  assert.ok(!text.includes("Tâches"), "sans tâche, pas de ligne « Tâches »");
});

test("avancement et cases cochées, tâches de chaque story à sa place ; une story sans tâche n'a pas de ligne « Tâches »", () => {
  const tasks: TaskForContext[] = [{ story_id: "a", title: "Créer", done: true }, { story_id: "a", title: "Tester", done: false }, { story_id: "b", title: "Autre", done: false }];
  const { text } = buildMissionContext({ mission, stories: [story("a"), story("b"), story("c")], tasks, level: "all", includeClient: true });
  assert.match(text, /1\. \[À faire\] Story a\n   - Tâches \(1 sur 2 faites\) :\n     - \[x\] Créer\n     - \[ \] Tester\n2\. \[À faire\] Story b\n   - Tâches \(0 sur 1 faites\) :\n     - \[ \] Autre\n3\. \[À faire\] Story c$/);
});

test(`plafond de ${CONTEXT_MAX} caractères : les dernières stories sont omises et le bloc le dit ; le texte ne dépasse pas le plafond`, () => {
  const stories = Array.from({ length: 80 }, (_, i) => story(String(i), { title: `Story ${i} ${"x".repeat(100)}`, acceptance_criteria: "- " + "critère ".repeat(60) }));
  const { text, omitted } = buildMissionContext({ mission, stories, tasks: [], level: "all", includeClient: true });
  assert.ok(omitted > 0 && omitted < 80);
  assert.ok([...text].length <= CONTEXT_MAX, `${[...text].length} caractères`);
  assert.match(text, new RegExp(`… ${omitted} user stories omises \\(le contexte est limité à`));
  assert.ok(text.includes("Story 0 ") && !text.includes(`Story ${79} `), "les premières sont gardées, les dernières omises");
  assert.ok(text.includes(CONTEXT_NOTICE));
});

test("omission : une story omise au singulier, deux ou plus au pluriel ; aucune omission sous le plafond", () => {
  const small = buildMissionContext({ mission, stories: [story("a")], tasks: [], level: "all", includeClient: true });
  assert.equal(small.omitted, 0);
  assert.ok(!small.text.includes("omise"));
  assert.match(small.text, /\(1 user story,/);
  const make = (n: number) => buildMissionContext({ mission, stories: Array.from({ length: n }, (_, i) => story(String(i), { title: `S${i} ${"x".repeat(200)}`, acceptance_criteria: "- " + "c".repeat(3500) })), tasks: [], level: "all", includeClient: true });
  let n = 1;
  while (make(n).omitted !== 1) n++;
  assert.match(make(n).text, /… 1 user story omise \(le contexte/);
  assert.match(make(n + 1).text, /… 2 user stories omises \(le contexte/);
});

test("la marge de l'omission est respectée : quelle que soit la taille des stories, le texte ne dépasse jamais le plafond (la ligne « omises » est comptée)", () => {
  let withOmission = 0;
  for (let pad = 0; pad < 400; pad++) {
    const stories = Array.from({ length: 20 }, (_, i) => story(String(i), { title: `S${i}`, acceptance_criteria: "- " + "c".repeat(2800 + pad * 2) }));
    const { text, omitted } = buildMissionContext({ mission, stories, tasks: [], level: "all", includeClient: true });
    if (omitted > 0) withOmission++;
    assert.ok([...text].length <= CONTEXT_MAX, `pad ${pad} : ${[...text].length} caractères pour ${omitted} omises`);
  }
  assert.ok(withOmission > 300, "le balayage couvre bien des cas avec omission");
});

test("une story énorme est tronquée sans vider les suivantes ; le plafond tient même avec un titre de mission démesuré", () => {
  const giant = buildMissionContext({ mission, stories: [story("a", { acceptance_criteria: "x".repeat(40000) }), story("b")], tasks: [], level: "all", includeClient: true });
  assert.equal(giant.omitted, 0, "la story suivante est gardée");
  assert.match(giant.text, /story tronquée : trop de texte/);
  assert.ok(giant.text.includes("Story b"));
  assert.ok([...giant.text].length < STORY_BLOCK_MAX + 1000);
  for (const level of ["mission", "all"] as const) {
    const { text } = buildMissionContext({ mission: { ...mission, title: "y".repeat(31000), clientName: "c".repeat(31000) }, stories: [story("a", { title: "t".repeat(40000) })], tasks: [], level, includeClient: true });
    assert.ok([...text].length <= CONTEXT_MAX, `${level} : ${[...text].length}`);
    assert.ok(text.includes("…"), "les champs démesurés sont tronqués avec une ellipse");
  }
});

test("un saut de ligne dans un titre, un nom, un rôle ou une tâche ne fabrique ni faux titre, ni faux champ, ni fausse story", () => {
  const evil = "x\n## Faux titre\n- Fin : 2030-01-01\n1. [Terminée] fausse story";
  const { text } = buildMissionContext({ mission: { ...mission, title: evil, clientName: evil }, stories: [story("a", { title: evil, role: evil, benefit: evil, acceptance_criteria: "ok" })], tasks: [{ story_id: "a", title: evil, done: false }], level: "all", includeClient: true });
  assert.equal(text.match(/^### Backlog/gm)?.length, 1);
  assert.equal(text.match(/^## /gm)?.length, 1, "un seul titre de niveau 2 : « ## Contexte »");
  assert.equal(text.match(/^- Fin :/gm)?.length ?? 0, 0);
  assert.equal(text.match(/^\d+\. \[/gm)?.length, 1, "une seule story");
  const crlf = buildMissionContext({ mission, stories: [story("a", { acceptance_criteria: "a\r\nb\rc" })], tasks: [], level: "all", includeClient: true }).text;
  assert.ok(!crlf.includes("\r"));
});

test("cas limites : 0 point affiché, rôle seul, bénéfice seul, critères en espaces seuls omis, fin sans début, tâches orphelines ignorées", () => {
  const zero = buildMissionContext({ mission, stories: [story("a", { points: 0 })], tasks: [], level: "all", includeClient: true }).text;
  assert.match(zero, / — 0 pts/);
  const roleOnly = buildMissionContext({ mission, stories: [story("a", { role: "directrice" })], tasks: [], level: "all", includeClient: true }).text;
  assert.match(roleOnly, /- En tant que directrice, je veux story a/i);
  const benefitOnly = buildMissionContext({ mission, stories: [story("a", { benefit: "agir" })], tasks: [], level: "all", includeClient: true }).text;
  assert.match(benefitOnly, /- Je veux story a, afin d'agir/i);
  const blank = buildMissionContext({ mission, stories: [story("a", { acceptance_criteria: "  \n " })], tasks: [], level: "all", includeClient: true }).text;
  assert.ok(!blank.includes("Critères"));
  const endOnly = buildMissionContext({ mission: { ...mission, start_date: null, end_date: "2026-12-31" }, stories: [], tasks: [], level: "mission", includeClient: true }).text;
  assert.ok(endOnly.includes("- Fin : 2026-12-31") && !endOnly.includes("Début"));
  const orphan = buildMissionContext({ mission, stories: [story("a")], tasks: [{ story_id: "inconnue", title: "t", done: true }], level: "all", includeClient: true }).text;
  assert.ok(!orphan.includes("Tâches") && !orphan.includes("[x]"));
  assert.equal(FIELD_MAX, 300);
});

test("nom du client d'une jointure : objet, tableau d'un objet, vide ou de forme inattendue", () => {
  assert.equal(clientNameOf({ name: "A" }), "A");
  assert.equal(clientNameOf([{ name: "B" }]), "B");
  for (const bad of [null, undefined, {}, [], [{}], { name: "  " }, { name: 5 }, "A"]) assert.equal(clientNameOf(bad), null, JSON.stringify(bad));
});

test("niveau reçu d'un formulaire : seuls « mission » et « all » sont acceptés", () => {
  assert.equal(parseContextLevel("all"), "all");
  assert.equal(parseContextLevel("mission"), "mission");
  for (const bad of ["", "tasks", "backlog", "stories", null, undefined, 3]) assert.equal(parseContextLevel(bad), null);
});
