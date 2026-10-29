import assert from "node:assert/strict";
import test from "node:test";

import type { CalendarLine } from "./deadlines.ts";

import { GANTT_DONE_DAYS, KANBAN_COLUMNS, assignLanes, ganttMarks, calendarHref, ganttScale, kanbanColumn, kanbanColumns, monthTicks, parseDisplay, urgency } from "./deadline-boards.ts";

const TODAY = "2026-10-28"; // mercredi

test("parseDisplay : valeur inconnue ou absente = liste", () => {
  assert.equal(parseDisplay("kanban"), "kanban");
  assert.equal(parseDisplay(["gantt", "x"]), "gantt");
  assert.equal(parseDisplay("tableau"), "liste");
  assert.equal(parseDisplay(undefined), "liste");
});

test("urgency : en retard, urgent (0 à 3 jours), cette semaine (4 à 7), plus tard, faite", () => {
  assert.equal(urgency("2026-10-27", false, TODAY), "overdue");
  assert.equal(urgency("2026-10-28", false, TODAY), "urgent");
  assert.equal(urgency("2026-10-30", false, TODAY), "urgent");
  assert.equal(urgency("2026-10-31", false, TODAY), "urgent");
  assert.equal(urgency("2026-11-01", false, TODAY), "week");
  assert.equal(urgency("2026-11-04", false, TODAY), "week");
  assert.equal(urgency("2026-11-18", false, TODAY), "later");
  assert.equal(urgency("2026-10-01", true, TODAY), "done"); // faite, même ancienne
});

test("kanban : retard, semaine (jusqu'au dimanche), mois, plus tard, faites", () => {
  assert.equal(kanbanColumn({ due_on: "2026-10-27", done: false }, TODAY), "overdue");
  assert.equal(kanbanColumn({ due_on: "2026-11-01", done: false }, TODAY), "week"); // dimanche
  assert.equal(kanbanColumn({ due_on: "2026-10-31", done: false }, TODAY), "week");
  assert.equal(kanbanColumn({ due_on: "2026-11-02", done: false }, TODAY), "later"); // lundi, mois suivant
  assert.equal(kanbanColumn({ due_on: "2026-10-28", done: true }, TODAY), "done");
  assert.equal(kanbanColumn({ due_on: "2026-12-01", done: false }, "2026-10-14"), "later");
  assert.equal(kanbanColumn({ due_on: "2026-10-30", done: false }, "2026-10-14"), "month");
});

test("kanbanColumns : une carte par colonne, triée par date ; calendrier vide = colonnes vides", () => {
  const cols = kanbanColumns([{ due_on: "2026-12-01", done: false }, { due_on: "2026-11-20", done: false }, { due_on: "2026-10-01", done: false }], TODAY);
  assert.deepEqual(cols.later.map((i) => i.due_on), ["2026-11-20", "2026-12-01"]);
  assert.equal(cols.overdue.length, 1);
  const empty = kanbanColumns([], TODAY);
  assert.ok(KANBAN_COLUMNS.every((c) => empty[c].length === 0));
});

test("ganttScale : une seule date, jamais de division par zéro ; positions de 0 à 100", () => {
  const one = ganttScale(["2026-10-28"], TODAY);
  assert.ok(one.days >= 30);
  const p = one.position("2026-10-28");
  assert.ok(p > 0 && p < 100);
  const wide = ganttScale(["2026-09-01", "2027-03-01"], TODAY);
  assert.equal(wide.position(wide.start), 0);
  assert.equal(wide.position(wide.end), 100);
  assert.ok(wide.position("2026-10-28") > wide.position("2026-09-01"));
  assert.equal(wide.position("2030-01-01"), 100); // hors axe : borné
});

test("monthTicks : premiers jours de mois dans l'axe", () => {
  const s = ganttScale(["2026-10-28", "2027-01-20"], TODAY);
  const ticks = monthTicks(s).map((t) => t.day);
  assert.ok(ticks.includes("2026-11-01") && ticks.includes("2027-01-01"));
  assert.ok(ticks.every((d) => d > s.start && d <= s.end));
});

test("assignLanes : deux jalons proches sur deux niveaux, deux jalons éloignés sur le même", () => {
  assert.deepEqual(assignLanes([0, 100, 400], 220), { lanes: [0, 1, 0], count: 2 }); // le 3e (400) retrouve le niveau 0, libre dès 220
  assert.deepEqual(assignLanes([0, 300], 220), { lanes: [0, 0], count: 1 });
  assert.deepEqual(assignLanes([], 220), { lanes: [], count: 1 });
});

test("calendarHref : période et affichage se gardent ; les valeurs par défaut s'effacent", () => {
  assert.equal(calendarHref("toutes", "liste"), "/calendrier");
  assert.equal(calendarHref("semaine", "liste"), "/calendrier?vue=semaine");
  assert.equal(calendarHref("toutes", "gantt"), "/calendrier?affichage=gantt");
  assert.equal(calendarHref("semaine", "kanban"), "/calendrier?vue=semaine&affichage=kanban");
});

const dl = (id: string, due_on: string, done = false) => ({ id, title: `Échéance ${id}`, due_on, category: "tax" as never, done_at: done ? "2026-10-20T10:00:00Z" : null });
const line = (key: string, due_on: string | null, kind: CalendarLine["kind"] = "invoice_issue"): CalendarLine => ({ kind, key, title: `Ligne ${key}`, due_on, href: "/factures", detail: "" });
const keys = (marks: { key: string }[]) => marks.map((m) => m.key);

test("gantt : une échéance à faire figure toujours (toute date), avec son niveau d'urgence et la fiche pour action", () => {
  const marks = ganttMarks([dl("a", "2026-01-05"), dl("b", "2026-10-28"), dl("c", "2027-06-01")], [], TODAY);
  assert.deepEqual(marks.map((m) => [m.key, m.level, m.kind]), [["a", "overdue", "deadline"], ["b", "urgent", "deadline"], ["c", "later", "deadline"]]);
});

test("gantt : une échéance faite figure si sa date limite est dans les 30 derniers jours ou à venir, grise (« faite »)", () => {
  assert.equal(GANTT_DONE_DAYS, 30);
  const marks = ganttMarks([dl("j30", "2026-09-28", true), dl("hier", "2026-10-27", true), dl("futur", "2026-12-01", true)], [], TODAY);
  assert.deepEqual(keys(marks), ["j30", "hier", "futur"]);
  assert.ok(marks.every((m) => m.level === "done"));
});

test("gantt : une échéance faite dont la date limite a 31 jours ou plus est absente ; une à faire du même âge reste (en retard)", () => {
  const marks = ganttMarks([dl("j31", "2026-09-27", true), dl("vieille", "2025-01-01", true), dl("retard", "2026-09-27")], [], TODAY);
  assert.deepEqual(keys(marks), ["retard"]);
  assert.equal(marks[0].level, "overdue");
});

test("gantt : lignes de facture = liens vers /factures sur la ligne « Factures » ; sans date, jamais de jalon", () => {
  const marks = ganttMarks([], [line("issue-1", "2026-11-03"), line("confirm-1", null, "to_confirm")], TODAY);
  assert.deepEqual(marks, [{ key: "issue-1", title: "Ligne issue-1", due_on: "2026-11-03", level: "week", row: "Factures", kind: "invoice", href: "/factures" }]);
});

test("gantt : rien à afficher = liste vide", () => {
  assert.deepEqual(ganttMarks([], [], TODAY), []);
});
