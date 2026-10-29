import assert from "node:assert/strict";
import test from "node:test";

import { calendarInvoiceInputs, calendarSections, overdueText, upcomingEmptyText, viewChangeAnnouncement } from "./calendar-panel.ts";
import type { CalendarLine } from "./deadlines.ts";

const TODAY = "2026-10-28"; // mercredi
const dl = (id: string, due_on: string, done = false) => ({ id, due_on, created_at: "2026-01-01T00:00:00Z", done_at: done ? "2026-10-20T10:00:00Z" : null });
const line = (key: string, due_on: string | null): CalendarLine => ({ kind: due_on ? "invoice_issue" : "to_confirm", key, title: key, due_on, href: "/factures", detail: "" });
const keys = (rows: { id?: string; key?: string }[]) => rows.map((r) => r.id ?? r.key);

const DEADLINES = [dl("retard", "2026-10-20"), dl("auj", "2026-10-28"), dl("sem", "2026-10-30"), dl("mois", "2026-11-02"), dl("loin", "2027-02-01"), dl("faite", "2026-10-10", true)];
const LINES = [line("f-retard", "2026-10-15"), line("f-auj", "2026-10-28"), line("f-loin", "2026-12-01"), line("confirmer", null)];

test("vue « Toutes » : tout est visible, les lignes sans date (« À confirmer ») aussi", () => {
  const s = calendarSections(DEADLINES, LINES, "toutes", TODAY);
  assert.equal(s.visible.length, 6);
  assert.deepEqual(keys(s.datedLines), ["f-retard", "f-auj", "f-loin"]);
  assert.deepEqual(keys(s.undatedLines), ["confirmer"]);
});

test("autres vues : filtrées par la période, faites exclues, jamais de ligne « À confirmer »", () => {
  const day = calendarSections(DEADLINES, LINES, "aujourd-hui", TODAY);
  assert.deepEqual(keys(day.visible), ["auj"]);
  assert.deepEqual(keys(day.datedLines), ["f-auj"]);
  assert.deepEqual(day.undatedLines, []);
  const late = calendarSections(DEADLINES, LINES, "retard", TODAY);
  assert.deepEqual(keys(late.visible), ["retard"]); // « faite » (ancienne) n'y est pas
  assert.deepEqual(keys(late.datedLines), ["f-retard"]);
  assert.deepEqual(keys(calendarSections(DEADLINES, LINES, "semaine", TODAY).visible), ["auj", "sem"]);
  assert.deepEqual(keys(calendarSections(DEADLINES, LINES, "mois", TODAY).visible), ["auj", "sem"]); // novembre n'est pas dans le mois d'octobre
});

test("sections de la Liste affichées selon la vue : Toutes = trois, Retard = En retard seule, autres = À venir seule", () => {
  const show = (view: "toutes" | "retard" | "aujourd-hui" | "semaine" | "mois") => calendarSections([], [], view, TODAY).show;
  assert.deepEqual(show("toutes"), { overdue: true, upcoming: true, done: true });
  assert.deepEqual(show("retard"), { overdue: true, upcoming: false, done: false });
  for (const v of ["aujourd-hui", "semaine", "mois"] as const) assert.deepEqual(show(v), { overdue: false, upcoming: true, done: false }, v);
});

test("compteur « en retard » : échéances non faites et lignes datées avant aujourd'hui, de toutes les vues", () => {
  const all = calendarSections(DEADLINES, LINES, "toutes", TODAY).overdueCount;
  assert.equal(all, 2); // « retard » + « f-retard » (la faite et le jour même ne comptent pas)
  for (const v of ["retard", "aujourd-hui", "semaine", "mois"] as const) assert.equal(calendarSections(DEADLINES, LINES, v, TODAY).overdueCount, all, v);
  assert.equal(calendarSections([], [], "toutes", TODAY).overdueCount, 0);
});

test("texte du compteur : 0, 1, 2 éléments", () => {
  assert.equal(overdueText(0), "Rien en retard.");
  assert.equal(overdueText(1), "1 élément en retard (échéances et factures).");
  assert.equal(overdueText(2), "2 éléments en retard (échéances et factures).");
});

test("lignes datées : avant aujourd'hui = En retard, le jour même ou après = À venir ; échéances groupées comme groupDeadlines", () => {
  const s = calendarSections(DEADLINES, LINES, "toutes", TODAY);
  assert.deepEqual(keys(s.overdueLines), ["f-retard"]);
  assert.deepEqual(keys(s.upcomingLines), ["f-auj", "f-loin"]);
  assert.deepEqual(keys(s.overdue), ["retard"]);
  assert.deepEqual(keys(s.upcoming), ["auj", "sem", "mois", "loin"]);
  assert.deepEqual(keys(s.finished), ["faite"]);
});

test("texte « À venir » vide : rien du tout ou seulement rien à venir", () => {
  assert.equal(upcomingEmptyText(true), "Aucune échéance pour l'instant.");
  assert.equal(upcomingEmptyText(false), "Rien à venir.");
  assert.equal(calendarSections([], [], "toutes", TODAY).upcomingEmpty, "Aucune échéance pour l'instant.");
  assert.equal(calendarSections([dl("retard", "2026-10-20")], [], "semaine", TODAY).upcomingEmpty, "Rien à venir.");
  assert.equal(calendarSections([], [line("confirmer", null)], "toutes", TODAY).upcomingEmpty, "Rien à venir."); // une ligne existe
});

test("factures de la page : forme attendue par invoiceLines, statut par le solde", () => {
  const inv = (id: string, paid: number) => ({
    id, reference: `F-${id}`, issued_on: id === "1" ? null : "2026-10-01", due_on: "2026-10-20", amount_ht_cents: 10_000, tax_cents: null, mission: { title: `M${id}` },
    payments: paid ? [{ amount_ht_cents: paid, tax_cents: null }] : [],
  });
  const out = calendarInvoiceInputs([inv("1", 0), inv("2", 4_000), inv("3", 10_000)]);
  assert.deepEqual(out.map((i) => i.status), ["unpaid", "partial", "paid"]);
  assert.deepEqual(out[0], { id: "1", reference: "F-1", issued_on: null, due_on: "2026-10-20", status: "unpaid", mission: { title: "M1" } });
  assert.ok(!("payments" in out[0]) && !("amount_ht_cents" in out[0]));
  assert.deepEqual(calendarInvoiceInputs([]), []);
});

test("bornes des périodes : dimanche dans la semaine, lundi suivant non ; dernier jour du mois dans le mois ; « Retard » exclut le jour même ; faite aujourd'hui seulement en Toutes", () => {
  const rows = [dl("dim", "2026-11-01"), dl("lun", "2026-11-02"), dl("fin-mois", "2026-10-31"), dl("hier", "2026-10-27"), dl("faite-auj", "2026-10-28", true)];
  assert.deepEqual(keys(calendarSections(rows, [], "semaine", TODAY).visible), ["dim", "fin-mois"]);
  assert.deepEqual(keys(calendarSections(rows, [], "mois", TODAY).visible), ["fin-mois"]);
  assert.deepEqual(keys(calendarSections(rows, [], "retard", TODAY).visible), ["hier"]);
  assert.deepEqual(keys(calendarSections(rows, [], "aujourd-hui", TODAY).visible), []);
  assert.ok(keys(calendarSections(rows, [], "toutes", TODAY).visible).includes("faite-auj"));
});

test("annonce d'un changement de vue : affichage, période, ou les deux ; rien si rien n'a changé", () => {
  const base = { view: "toutes", display: "liste" } as const;
  assert.equal(viewChangeAnnouncement(base, base), null);
  assert.equal(viewChangeAnnouncement(base, { ...base, display: "kanban" }), "Affichage : Kanban");
  assert.equal(viewChangeAnnouncement(base, { ...base, view: "mois" }), "Période : Ce mois-ci");
  assert.equal(viewChangeAnnouncement(base, { view: "semaine", display: "gantt" }), "Affichage : Gantt. Période : Cette semaine", "les deux changent : les deux sont annoncées");
});
