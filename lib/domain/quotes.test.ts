import assert from "node:assert/strict";
import test from "node:test";

import { quotesRefusal, MISSION_QUOTE_REFUSAL, canAcceptQuote, canDeleteQuote, canEditQuote, canRefuseQuote, canSendQuote, centsToInput, formatCents, parseAmountToCents, totalCents, validateQuoteInput, QUOTE_AMOUNT_MAX_CENTS } from "./quotes.ts";

const ok = { amount_ht: "1 250,50", tax: "250,10", sent_on: "2026-10-19", mission_id: "" };

test("montant : centimes entiers, virgule ou point, espaces (dont insécables), jamais de flottant", () => {
  assert.equal(parseAmountToCents("1250"), 125000);
  assert.equal(parseAmountToCents("1 250,50"), 125050);
  assert.equal(parseAmountToCents("1 250.5"), 125050);
  assert.equal(parseAmountToCents("0,07"), 7);
  assert.equal(parseAmountToCents("19,99"), 1999); // 19.99 * 100 vaut 1998.9999… en flottant
  assert.equal(parseAmountToCents("0,1"), 10);
});

test("montant : négatif, texte, trois décimales, deux séparateurs et vide refusés", () => {
  for (const bad of ["-5", "abc", "1,234", "1,2,3", "1.250,50", "", " ", "1e3", "12 €", "9999999999999"]) assert.equal(parseAmountToCents(bad), null, bad);
  // Écriture à la française avec point de milliers : jamais lue comme un petit montant (« 1.250 » n'est pas 1,25 €).
  for (const bad of ["1.250", "12.500", "1.250.000"]) assert.equal(parseAmountToCents(bad), null, bad);
  // Un point suivi d'un ou deux chiffres ne peut être qu'une décimale : aucune ambiguïté avec les milliers (groupes de trois).
  assert.equal(parseAmountToCents("1.25"), 125);
  assert.equal(parseAmountToCents("12.5"), 1250);
});

test("devis valide : valeurs en centimes, champs vides devenus absents, taxe inconnue = null et jamais 0", () => {
  assert.deepEqual(validateQuoteInput(ok, true), { ok: true, value: { amount_ht_cents: 125050, tax_cents: 25010, sent_on: "2026-10-19", mission_id: null } });
  const noTax = validateQuoteInput({ ...ok, tax: "  " }, true);
  assert.equal(noTax.ok && noTax.value.tax_cents, null);
  const zeroTax = validateQuoteInput({ ...ok, tax: "0" }, true);
  assert.equal(zeroTax.ok && zeroTax.value.tax_cents, 0, "0 saisi explicitement reste 0 : c'est une donnée");
});

test("devis : montant hors taxe obligatoire, positif, borné ; erreurs sur la bonne clé", () => {
  for (const amount_ht of ["", "0", "0,00", "abc", "-1"]) {
    const r = validateQuoteInput({ ...ok, amount_ht }, false);
    assert.deepEqual(!r.ok && Object.keys(r.errors), ["amount_ht"], amount_ht);
  }
  const top = (QUOTE_AMOUNT_MAX_CENTS / 100).toString();
  assert.equal(validateQuoteInput({ ...ok, amount_ht: top }, false).ok, true);
  assert.equal(validateQuoteInput({ ...ok, amount_ht: `${top},01` }, false).ok, false);
  const bigTax = validateQuoteInput({ ...ok, tax: `${QUOTE_AMOUNT_MAX_CENTS / 100},01` }, false);
  assert.deepEqual(!bigTax.ok && Object.keys(bigTax.errors), ["tax"], "taxe au-delà du plafond");
  const badTax = validateQuoteInput({ ...ok, tax: "x" }, false);
  assert.deepEqual(!badTax.ok && Object.keys(badTax.errors), ["tax"]);
});

test("devis : date d'envoi obligatoire seulement pour un devis envoyé ; une date saisie doit exister", () => {
  assert.equal(validateQuoteInput({ ...ok, sent_on: "" }, false).ok, true, "brouillon sans date");
  const r = validateQuoteInput({ ...ok, sent_on: "" }, true);
  assert.deepEqual(!r.ok && Object.keys(r.errors), ["sent_on"]);
  for (const bad of ["2026-02-30", "2027-02-29", "19/10/2026", "0000-01-01"]) assert.equal(validateQuoteInput({ ...ok, sent_on: bad }, false).ok, false, bad);
  assert.equal(validateQuoteInput({ ...ok, sent_on: "2028-02-29" }, false).ok, true, "29 février d'une année bissextile");
});

test("devis : mission facultative, mais un identifiant doit en être un", () => {
  const r = validateQuoteInput({ ...ok, mission_id: "pas-un-uuid" }, false);
  assert.deepEqual(!r.ok && Object.keys(r.errors), ["mission_id"]);
  const id = "3f2c1b4a-5d6e-4f70-8a9b-0c1d2e3f4a5b";
  const v = validateQuoteInput({ ...ok, mission_id: id }, false);
  assert.equal(v.ok && v.value.mission_id, id);
});

test("total : seulement si la taxe est connue", () => {
  assert.equal(totalCents({ amount_ht_cents: 1000, tax_cents: 200 }), 1200);
  assert.equal(totalCents({ amount_ht_cents: 1000, tax_cents: 0 }), 1000);
  assert.equal(totalCents({ amount_ht_cents: 1000, tax_cents: null }), null);
  assert.equal(totalCents({ amount_ht_cents: 1000 } as unknown as { amount_ht_cents: number; tax_cents: number | null }), null); // indéfini = inconnu, jamais NaN
});

test("affichage et préremplissage d'un montant font l'aller-retour", () => {
  assert.equal(centsToInput(125050), "1250,50");
  assert.equal(centsToInput(7), "0,07");
  for (const c of [1, 7, 100, 125050]) assert.equal(parseAmountToCents(centsToInput(c)), c);
  assert.match(formatCents(125050), /^1\s250,50\s€$/u);
});

test("actions permises par statut : brouillon -> envoyé ; envoyé -> refusé ou accepté ; refusé et accepté figés", () => {
  assert.deepEqual((["draft", "sent", "accepted", "refused"] as const).map((s) => [canEditQuote(s), canSendQuote(s), canRefuseQuote(s), canAcceptQuote(s), canDeleteQuote(s)]), [
    [true, true, false, false, true],
    [true, false, true, true, false],
    [false, false, false, false, false],
    [false, false, false, false, false],
  ]);
});

test("refus de suppression : fiche avec devis (singulier, pluriel) et mission liée", () => {
  assert.match(quotesRefusal(1), /1 devis : un devis envoyé/);
  assert.match(quotesRefusal(3), /3 devis : un devis envoyé/);
  assert.match(MISSION_QUOTE_REFUSAL, /liée à un devis/);
});
