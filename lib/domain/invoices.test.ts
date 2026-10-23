import assert from "node:assert/strict";
import test from "node:test";

import { INVOICE_AMOUNT_MAX_CENTS, daysLate, invoicesRefusal, isOverdue, linkableQuotes, parseInvoiceFilter, validateInvoiceInput, viewInvoices } from "./invoices.ts";

const M = "3f2c1b4a-5d6e-4f70-8a9b-0c1d2e3f4a5b";
const TODAY = "2026-10-23";
const ok = { mission_id: M, quote_id: "", amount_ht: "1 250,50", tax: "250,10", due_on: "2026-11-15", issued_on: "", reference: "", note: "" };
const keys = (r: ReturnType<typeof validateInvoiceInput>) => (r.ok ? [] : Object.keys(r.errors));

test("facture valide : centimes, champs vides absents, taxe inconnue = null et jamais 0", () => {
  assert.deepEqual(validateInvoiceInput(ok, TODAY), { ok: true, value: { mission_id: M, quote_id: null, amount_ht_cents: 125050, tax_cents: 25010, due_on: "2026-11-15", issued_on: null, reference: null, note: null } });
  const noTax = validateInvoiceInput({ ...ok, tax: " " }, TODAY);
  assert.equal(noTax.ok && noTax.value.tax_cents, null);
  const zero = validateInvoiceInput({ ...ok, tax: "0" }, TODAY);
  assert.equal(zero.ok && zero.value.tax_cents, 0, "0 saisi reste 0 : c'est une donnée");
});

test("mission obligatoire ; devis facultatif mais un identifiant doit en être un", () => {
  assert.deepEqual(keys(validateInvoiceInput({ ...ok, mission_id: "" }, TODAY)), ["mission_id"]);
  assert.deepEqual(keys(validateInvoiceInput({ ...ok, mission_id: "x" }, TODAY)), ["mission_id"]);
  assert.deepEqual(keys(validateInvoiceInput({ ...ok, quote_id: "x" }, TODAY)), ["quote_id"]);
  const q = validateInvoiceInput({ ...ok, quote_id: M }, TODAY);
  assert.equal(q.ok && q.value.quote_id, M);
});

test("hors taxe : obligatoire, strictement positif, plafonné à 1 000 000 € ; taxe plafonnée aussi", () => {
  for (const amount_ht of ["", "0", "0,00", "abc", "-1"]) assert.deepEqual(keys(validateInvoiceInput({ ...ok, amount_ht }, TODAY)), ["amount_ht"], amount_ht);
  const top = String(INVOICE_AMOUNT_MAX_CENTS / 100);
  assert.equal(validateInvoiceInput({ ...ok, amount_ht: top, tax: top }, TODAY).ok, true);
  assert.deepEqual(keys(validateInvoiceInput({ ...ok, amount_ht: `${top},01` }, TODAY)), ["amount_ht"]);
  assert.deepEqual(keys(validateInvoiceInput({ ...ok, tax: `${top},01` }, TODAY)), ["tax"]);
  assert.deepEqual(keys(validateInvoiceInput({ ...ok, tax: "x" }, TODAY)), ["tax"]);
  assert.deepEqual(keys(validateInvoiceInput({ ...ok, tax: "-1" }, TODAY)), ["tax"]);
});

test("échéance : obligatoire, doit exister, possible dans le passé", () => {
  assert.deepEqual(keys(validateInvoiceInput({ ...ok, due_on: "" }, TODAY)), ["due_on"]);
  for (const bad of ["2026-02-30", "2027-02-29", "15/11/2026"]) assert.deepEqual(keys(validateInvoiceInput({ ...ok, due_on: bad }, TODAY)), ["due_on"], bad);
  assert.equal(validateInvoiceInput({ ...ok, due_on: "2020-01-01" }, TODAY).ok, true, "déjà échue à la saisie");
  assert.equal(validateInvoiceInput({ ...ok, due_on: "2028-02-29" }, TODAY).ok, true, "29 février bissextile");
});

test("émission : jamais dans le futur, échéance jamais avant elle (égalité permise)", () => {
  assert.equal(validateInvoiceInput({ ...ok, issued_on: TODAY, due_on: TODAY }, TODAY).ok, true, "émise aujourd'hui, due aujourd'hui");
  assert.deepEqual(keys(validateInvoiceInput({ ...ok, issued_on: "2026-10-24" }, TODAY)), ["issued_on"]);
  assert.deepEqual(keys(validateInvoiceInput({ ...ok, issued_on: "2026-12-01", due_on: "2026-11-15" }, TODAY)), ["issued_on"], "futur : seule l'émission est signalée");
  assert.deepEqual(keys(validateInvoiceInput({ ...ok, issued_on: "2026-10-20", due_on: "2026-10-19" }, TODAY)), ["due_on"]);
  assert.deepEqual(keys(validateInvoiceInput({ ...ok, issued_on: "2026-02-30" }, TODAY)), ["issued_on"]);
});

test("référence (60) et remarque (500) : comptées en points de code, nettoyées, vides = absentes", () => {
  assert.equal(validateInvoiceInput({ ...ok, reference: "a".repeat(60) }, TODAY).ok, true);
  assert.deepEqual(keys(validateInvoiceInput({ ...ok, reference: "a".repeat(61) }, TODAY)), ["reference"]);
  assert.equal(validateInvoiceInput({ ...ok, reference: "😀".repeat(60) }, TODAY).ok, true, "60 émojis = 60 caractères pour la base");
  assert.deepEqual(keys(validateInvoiceInput({ ...ok, note: "n".repeat(501) }, TODAY)), ["note"]);
  const r = validateInvoiceInput({ ...ok, reference: "  F-2026-01  ", note: "   " }, TODAY);
  assert.deepEqual(r.ok && [r.value.reference, r.value.note], ["F-2026-01", null]);
});

test("échue : strictement avant aujourd'hui ; jours de retard", () => {
  assert.equal(isOverdue("2026-10-22", TODAY), true);
  assert.equal(isOverdue(TODAY, TODAY), false, "le jour même, pas encore échue");
  assert.equal(isOverdue("2026-10-24", TODAY), false);
  assert.equal(daysLate("2026-10-22", TODAY), 1);
  assert.equal(daysLate("2026-09-30", TODAY), 23);
  assert.equal(daysLate(TODAY, TODAY), 0);
  assert.equal(daysLate("2026-11-01", TODAY), 0);
  assert.equal(daysLate("2026-02-27", "2026-03-01"), 2, "fin février");
});

test("liste : tri par échéance croissante et départage stable ; filtre Échues ; filtre inconnu = Toutes", () => {
  const rows = [
    { id: "c", due_on: "2026-11-01", created_at: "2026-10-01" },
    { id: "b", due_on: "2026-10-01", created_at: "2026-10-02" },
    { id: "a", due_on: "2026-10-01", created_at: "2026-10-01" },
    { id: "d", due_on: TODAY, created_at: "2026-10-03" },
  ];
  assert.deepEqual(viewInvoices(rows, "toutes", TODAY).map((r) => r.id), ["a", "b", "d", "c"]);
  assert.deepEqual(viewInvoices(rows, "echues", TODAY).map((r) => r.id), ["a", "b"], "d est due aujourd'hui : pas échue");
  assert.deepEqual(viewInvoices(rows, "non-payees", TODAY).length, 4, "sans encaissement, tout est non payé");
  assert.equal(rows[0].id, "c", "l'entrée n'est pas modifiée");
  assert.equal(parseInvoiceFilter("echues"), "echues");
  for (const bad of ["x", undefined, ["echues"], ""]) assert.equal(parseInvoiceFilter(bad as string), "toutes");
});

test("devis proposés : acceptés et du même client seulement", () => {
  const qs = [
    { id: 1, client_id: "A", status: "accepted" },
    { id: 2, client_id: "A", status: "sent" },
    { id: 3, client_id: "A", status: "refused" },
    { id: 4, client_id: "A", status: "draft" },
    { id: 5, client_id: "B", status: "accepted" },
  ];
  assert.deepEqual(linkableQuotes(qs, "A").map((q) => q.id), [1]);
  assert.deepEqual(linkableQuotes(qs, "Z"), []);
});

test("refus de supprimer une mission avec factures : singulier et pluriel", () => {
  assert.match(invoicesRefusal(1), /1 facture :/);
  assert.match(invoicesRefusal(2), /2 factures :/);
});
