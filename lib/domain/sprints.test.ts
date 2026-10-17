import assert from "node:assert/strict";
import test from "node:test";

import { SPRINT_GOAL_MAX, SPRINT_NAME_MAX, acceptsStories, daysBetween, parisToday, parseSprintStatus, sprintProgress, sprintProgressLabel, sprintTimeLabel, validateSprintInput } from "./sprints.ts";

const ok = { name: "Sprint 1", goal: "Premier tableau des inscriptions", start_date: "2026-10-19", end_date: "2026-10-30" };

test("sprint valide : nom nettoyé, objectif vide devenu absent", () => {
  assert.deepEqual(validateSprintInput({ ...ok, name: "  Sprint 1  ", goal: "   " }), { ok: true, value: { name: "Sprint 1", goal: null, start_date: "2026-10-19", end_date: "2026-10-30" } });
  assert.equal(validateSprintInput(ok).ok, true);
});

test("sprint : nom obligatoire (nul et espaces seuls refusés), 120 acceptés et 121 refusés en points de code, erreurs sur la bonne clé", () => {
  for (const name of ["", "   ", "\u0000", undefined as unknown as string]) {
    const r = validateSprintInput({ ...ok, name });
    assert.deepEqual(!r.ok && Object.keys(r.errors), ["name"], String(name));
  }
  assert.equal(validateSprintInput({ ...ok, name: "😀".repeat(SPRINT_NAME_MAX) }).ok, true);
  assert.equal(validateSprintInput({ ...ok, name: "😀".repeat(SPRINT_NAME_MAX + 1) }).ok, false);
  assert.equal(validateSprintInput({ ...ok, goal: "g".repeat(SPRINT_GOAL_MAX) }).ok, true);
  const long = validateSprintInput({ ...ok, goal: "g".repeat(SPRINT_GOAL_MAX + 1) });
  assert.deepEqual(!long.ok && Object.keys(long.errors), ["goal"]);
});

test("sprint : deux dates obligatoires et réelles, fin jamais avant début (même jour accepté)", () => {
  assert.equal(validateSprintInput({ ...ok, start_date: "", end_date: "" }).ok, false);
  const noStart = validateSprintInput({ ...ok, start_date: "" });
  assert.deepEqual(!noStart.ok && Object.keys(noStart.errors), ["start_date"]);
  for (const bad of ["2026-02-30", "2026-13-01", "19/10/2026", "0000-01-01", "abc"]) {
    const r = validateSprintInput({ ...ok, start_date: bad });
    assert.deepEqual(!r.ok && Object.keys(r.errors), ["start_date"], bad);
  }
  const inverted = validateSprintInput({ ...ok, start_date: "2026-10-30", end_date: "2026-10-19" });
  assert.deepEqual(!inverted.ok && Object.keys(inverted.errors), ["end_date"]);
  assert.equal(validateSprintInput({ ...ok, start_date: "2026-10-19", end_date: "2026-10-19" }).ok, true, "un sprint d'un jour");
});

test("avancement : stories et points ; une story sans points compte 0 ; points des terminées seulement", () => {
  const p = sprintProgress([{ status: "done", points: 5 }, { status: "todo", points: 8 }, { status: "done", points: null }, { status: "in_progress", points: 3 }]);
  assert.deepEqual(p, { done: 2, total: 4, pointsDone: 5, pointsTotal: 16 });
  assert.equal(sprintProgressLabel(p), "2 sur 4 stories terminées · 5 sur 16 points");
});

test("avancement : sprint vide jamais « 0 sur 0 », une story au singulier, sans points la partie points est omise", () => {
  assert.equal(sprintProgressLabel(sprintProgress([])), "Aucune story dans ce sprint");
  assert.equal(sprintProgressLabel(sprintProgress([{ status: "done", points: null }])), "1 sur 1 story terminée");
  assert.equal(sprintProgressLabel(sprintProgress([{ status: "todo", points: null }, { status: "done", points: null }])), "1 sur 2 stories terminées");
});

test("date du jour à Paris : l'heure d'hiver et d'été, et le changement de jour à minuit de Paris (pas UTC)", () => {
  assert.equal(parisToday(new Date("2026-10-17T10:00:00Z")), "2026-10-17");
  assert.equal(parisToday(new Date("2026-10-17T22:30:00Z")), "2026-10-18", "00 h 30 à Paris (été) : déjà le lendemain");
  assert.equal(parisToday(new Date("2026-01-15T23:30:00Z")), "2026-01-16", "00 h 30 à Paris (hiver)");
  assert.equal(parisToday(new Date("2026-01-15T22:30:00Z")), "2026-01-15", "23 h 30 à Paris (hiver)");
});

test("jours entre deux dates : changement d'heure sans effet, mois et années", () => {
  assert.equal(daysBetween("2026-10-24", "2026-10-26"), 2, "le 25 octobre 2026 est le changement d'heure");
  assert.equal(daysBetween("2026-03-28", "2026-03-30"), 2);
  assert.equal(daysBetween("2026-12-30", "2027-01-02"), 3);
  assert.equal(daysBetween("2026-10-20", "2026-10-17"), -3);
  assert.equal(daysBetween("2026-10-17", "2026-10-17"), 0);
});

test("phrase de temps d'un sprint en cours : dans N jours, demain, aujourd'hui, en retard", () => {
  const s = (end_date: string) => ({ status: "active" as const, start_date: "2026-10-01", end_date });
  assert.equal(sprintTimeLabel(s("2026-10-20"), "2026-10-17"), "Se termine dans 3 jours");
  assert.equal(sprintTimeLabel(s("2026-10-18"), "2026-10-17"), "Se termine demain");
  assert.equal(sprintTimeLabel(s("2026-10-17"), "2026-10-17"), "Se termine aujourd'hui");
  assert.equal(sprintTimeLabel(s("2026-10-16"), "2026-10-17"), "Terminé depuis 1 jour : à clore");
  assert.equal(sprintTimeLabel(s("2026-10-10"), "2026-10-17"), "Terminé depuis 7 jours : à clore");
});

test("phrase de temps : sprint planifié (commence dans N jours, demain, à démarrer) et sprint clos", () => {
  const p = (start_date: string) => ({ status: "planned" as const, start_date, end_date: "2026-12-31" });
  assert.equal(sprintTimeLabel(p("2026-10-20"), "2026-10-17"), "Commence dans 3 jours");
  assert.equal(sprintTimeLabel(p("2026-10-18"), "2026-10-17"), "Commence demain");
  assert.equal(sprintTimeLabel(p("2026-10-17"), "2026-10-17"), "À démarrer");
  assert.equal(sprintTimeLabel(p("2026-10-01"), "2026-10-17"), "À démarrer", "date de début dépassée");
  assert.equal(sprintTimeLabel({ status: "closed", start_date: "2026-09-01", end_date: "2026-09-12" }, "2026-10-17"), "Sprint clos");
});

test("statuts : seuls trois états ; un sprint clos n'accepte plus de story", () => {
  assert.equal(parseSprintStatus("active"), "active");
  for (const bad of ["", "done", null, undefined, 1]) assert.equal(parseSprintStatus(bad), null);
  assert.equal(acceptsStories("planned"), true);
  assert.equal(acceptsStories("active"), true);
  assert.equal(acceptsStories("closed"), false);
});
