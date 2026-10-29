import assert from "node:assert/strict";
import test from "node:test";

import { PAYMENT_AMOUNT_MAX_CENTS, invoiceBalance, overpaymentIfSaved, validatePaymentInput } from "./payments.ts";

const I = "3f2c1b4a-5d6e-4f70-8a9b-0c1d2e3f4a5b";
const TODAY = "2026-10-23";
const ok = { invoice_id: I, amount_ht: "1 000,00", tax: "200", received_on: "2026-10-20", note: "" };
const keys = (r: ReturnType<typeof validatePaymentInput>) => (r.ok ? [] : Object.keys(r.errors));

test("encaissement valide : centimes, champs vides absents, taxe inconnue = null et jamais 0", () => {
  assert.deepEqual(validatePaymentInput(ok, TODAY), { ok: true, value: { invoice_id: I, amount_ht_cents: 100000, tax_cents: 20000, received_on: "2026-10-20", note: null } });
  const noTax = validatePaymentInput({ ...ok, tax: " " }, TODAY);
  assert.equal(noTax.ok && noTax.value.tax_cents, null);
  const zero = validatePaymentInput({ ...ok, tax: "0" }, TODAY);
  assert.equal(zero.ok && zero.value.tax_cents, 0, "0 saisi reste 0 : c'est une donnée");
});

test("espaces autour de l'identifiant et du montant : retirés avant la validation", () => {
  const r = validatePaymentInput({ ...ok, invoice_id: ` ${I} `, amount_ht: " 100 ", received_on: " 2026-10-20 " }, TODAY);
  assert.deepEqual(r.ok && [r.value.invoice_id, r.value.amount_ht_cents, r.value.received_on], [I, 10000, "2026-10-20"]);
});

test("facture : identifiant valide obligatoire", () => {
  for (const bad of ["", "x"]) assert.deepEqual(keys(validatePaymentInput({ ...ok, invoice_id: bad }, TODAY)), ["invoice_id"], bad);
});

test("hors taxe : obligatoire, strictement positif, plafonné à 1 000 000 € ; taxe plafonnée aussi ; pas de négatif", () => {
  for (const amount_ht of ["", "0", "0,00", "abc", "-1"]) assert.deepEqual(keys(validatePaymentInput({ ...ok, amount_ht }, TODAY)), ["amount_ht"], amount_ht);
  const top = String(PAYMENT_AMOUNT_MAX_CENTS / 100);
  assert.equal(validatePaymentInput({ ...ok, amount_ht: top, tax: top }, TODAY).ok, true);
  assert.deepEqual(keys(validatePaymentInput({ ...ok, amount_ht: `${top},01` }, TODAY)), ["amount_ht"]);
  assert.deepEqual(keys(validatePaymentInput({ ...ok, tax: `${top},01` }, TODAY)), ["tax"]);
  for (const bad of ["x", "-1", "1,2,3", "1.250,50"]) assert.deepEqual(keys(validatePaymentInput({ ...ok, tax: bad }, TODAY)), ["tax"], bad);
  const nbsp = validatePaymentInput({ ...ok, amount_ht: "1 250,50", tax: "1 250" }, TODAY);
  assert.deepEqual(nbsp.ok && [nbsp.value.amount_ht_cents, nbsp.value.tax_cents], [125050, 125000]);
});

test("date : obligatoire, doit exister, jamais dans le futur, aujourd'hui permis", () => {
  assert.deepEqual(keys(validatePaymentInput({ ...ok, received_on: "" }, TODAY)), ["received_on"]);
  for (const bad of ["2026-02-30", "2027-02-29", "20/10/2026", "1899-12-31"]) assert.deepEqual(keys(validatePaymentInput({ ...ok, received_on: bad }, TODAY)), ["received_on"], bad);
  assert.equal(validatePaymentInput({ ...ok, received_on: TODAY }, TODAY).ok, true, "reçu aujourd'hui");
  assert.deepEqual(keys(validatePaymentInput({ ...ok, received_on: "2026-10-24" }, TODAY)), ["received_on"], "demain refusé");
  assert.equal(validatePaymentInput({ ...ok, received_on: "2028-02-29" }, "2028-03-01").ok, true, "29 février bissextile");
});

test("remarque : 500 caractères en points de code, NUL retiré, vide = absente", () => {
  assert.equal(validatePaymentInput({ ...ok, note: "n".repeat(500) }, TODAY).ok, true);
  assert.deepEqual(keys(validatePaymentInput({ ...ok, note: "n".repeat(501) }, TODAY)), ["note"]);
  assert.equal(validatePaymentInput({ ...ok, note: "😀".repeat(500) }, TODAY).ok, true, "500 émojis = 500 caractères pour la base");
  const r = validatePaymentInput({ ...ok, note: "  virement\u0000 du 3  " }, TODAY);
  assert.equal(r.ok && r.value.note, "virement du 3");
  const empty = validatePaymentInput({ ...ok, note: "\u0000 " }, TODAY);
  assert.equal(empty.ok && empty.value.note, null);
});

const inv = { amount_ht_cents: 100000, tax_cents: 20000 }; // 1 000 € HT + 200 € de taxe = 1 200 € TTC
const pay = (ht: number, tax: number | null) => ({ amount_ht_cents: ht, tax_cents: tax });

test("statut : sans encaissement, non payée", () => {
  assert.deepEqual(invoiceBalance(inv, []), { status: "unpaid", basis: "ttc", dueCents: 120000, paidCents: 0, remainingCents: 120000, overpaidCents: 0, paymentsMissingTax: 0 });
});

test("statut : acompte puis solde, toutes taxes comprises ; payée quand le total atteint le TTC (égalité comprise)", () => {
  const partial = invoiceBalance(inv, [pay(50000, 10000)]);
  assert.deepEqual([partial.status, partial.paidCents, partial.remainingCents], ["partial", 60000, 60000]);
  const paid = invoiceBalance(inv, [pay(50000, 10000), pay(50000, 10000)]);
  assert.deepEqual([paid.status, paid.remainingCents, paid.overpaidCents], ["paid", 0, 0]);
  assert.equal(invoiceBalance(inv, [pay(50000, 10000), pay(49999, 10000)]).status, "partial", "un centime de moins : partielle");
});

test("décision 5 : taxe de l'encaissement vide = zéro dans le total, partiellement payée, signalée ; payée dès qu'elle est saisie", () => {
  const b = invoiceBalance(inv, [pay(100000, null)]);
  assert.deepEqual([b.status, b.paidCents, b.remainingCents, b.paymentsMissingTax], ["partial", 100000, 20000, 1]);
  const done = invoiceBalance(inv, [pay(100000, 20000)]);
  assert.deepEqual([done.status, done.paymentsMissingTax], ["paid", 0]);
  const zeroTax = invoiceBalance(inv, [pay(100000, 0)]);
  assert.deepEqual([zeroTax.status, zeroTax.paymentsMissingTax], ["partial", 0], "0 saisi est une donnée : pas signalé, mais le total reste inférieur");
});

test("taxe de la facture inconnue : le statut se calcule sur le hors taxe, la taxe des encaissements est ignorée", () => {
  const unknown = { amount_ht_cents: 100000, tax_cents: null };
  const part = invoiceBalance(unknown, [pay(40000, 99999)]);
  assert.deepEqual([part.status, part.basis, part.dueCents, part.paidCents, part.remainingCents, part.paymentsMissingTax], ["partial", "ht", 100000, 40000, 60000, 0]);
  assert.equal(invoiceBalance(unknown, [pay(100000, null)]).status, "paid");
  assert.equal(invoiceBalance(unknown, [pay(40000, null)]).paymentsMissingTax, 0, "taxe de la facture inconnue : la taxe vide d'un encaissement n'est pas signalée");
  assert.equal(invoiceBalance({ amount_ht_cents: 100000, tax_cents: 0 }, [pay(100000, null)]).status, "paid", "taxe de la facture à 0 saisie : base toutes taxes comprises, rien à encaisser en plus");
});

test("cas figé : 1 200 € saisis en hors taxe sur une facture de 1 000 € HT + 200 € de taxe, taxe vide : payée, taxe de l'encaissement à confirmer", () => {
  // Une confusion TTC/HT possible côté utilisateur : le code n'invente rien (taxe vide = zéro) et le signale.
  const b = invoiceBalance(inv, [pay(120000, null)]);
  assert.deepEqual([b.status, b.paymentsMissingTax], ["paid", 1]);
});

test("trop-perçu : calculé, le statut reste payée", () => {
  const b = invoiceBalance(inv, [pay(100000, 20000), pay(5000, 0)]);
  assert.deepEqual([b.status, b.overpaidCents, b.remainingCents], ["paid", 5000, 0]);
});

test("avertissement avant enregistrement : trop-perçu que ferait l'encaissement saisi", () => {
  const over = (others: ReturnType<typeof pay>[], amount_ht: string, tax: string) => overpaymentIfSaved(inv, others, { amount_ht, tax });
  assert.equal(over([], "1000", "200"), 0, "pile le TTC : aucun dépassement");
  assert.equal(over([], "1000", "200,01"), 1, "un centime de trop");
  assert.equal(over([], "1000", ""), 0, "taxe vide = zéro : rien ne dépasse");
  assert.equal(over([pay(100000, 20000)], "50", ""), 5000, "facture déjà soldée : tout l'encaissement dépasse");
  assert.equal(over([pay(60000, 12000)], "400", "80"), 0, "acompte de 720 € puis solde exact de 480 €");
  assert.equal(over([pay(60000, 12000)], "400", "80,50"), 50, "solde avec 50 centimes de trop");
  assert.equal(over([pay(100000, 20000), pay(5000, 0)], "10", ""), 1000, "déjà en trop-perçu : seul l'ajout du nouvel encaissement compte");
  for (const [ht, tax] of [["", ""], ["abc", ""], ["0", ""], ["-5", ""], ["10", "x"], ["1.250,50", ""], ["1000000,01", ""]]) assert.equal(over([], ht, tax), 0, `saisie incomplète ou invalide : ${ht}/${tax}`);
  const unknownTax = overpaymentIfSaved({ amount_ht_cents: 100000, tax_cents: null }, [], { amount_ht: "1000,01", tax: "999" });
  assert.equal(unknownTax, 1, "taxe de la facture inconnue : seul le hors taxe compte");
});

test("taxe indéfinie (et non `null`) = taxe inconnue : encaissement signalé, facture comptée hors taxe", () => {
  const undefPayment = { amount_ht_cents: 100000 } as unknown as { amount_ht_cents: number; tax_cents: number | null };
  assert.equal(invoiceBalance(inv, [undefPayment]).paymentsMissingTax, 1);
  const undefInvoice = { amount_ht_cents: 100000 } as unknown as { amount_ht_cents: number; tax_cents: number | null };
  const b = invoiceBalance(undefInvoice, [pay(100000, null)]);
  assert.deepEqual([b.basis, b.dueCents, b.status], ["ht", 100000, "paid"]);
});
