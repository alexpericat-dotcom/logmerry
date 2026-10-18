import assert from "node:assert/strict";
import test from "node:test";

import { fieldState, missingFields, parseFieldInput, parseThresholds, PROFILE_FIELDS } from "./profile.ts";

test("fieldState : vide, déclaré, confirmé", () => {
  assert.equal(fieldState(null, null), "missing");
  assert.equal(fieldState("", null), "missing");
  assert.equal(fieldState("bnc", null), "declared");
  assert.equal(fieldState("bnc", "2026-10-18T10:00:00Z"), "confirmed");
  // une date de confirmation sans valeur ne rend pas le champ « confirmé »
  assert.equal(fieldState(null, "2026-10-18T10:00:00Z"), "missing");
});

test("choix : valeur de la liste, vide, inconnue, Autre", () => {
  assert.deepEqual(parseFieldInput("legal_status", { value: "company" }), { ok: true, patch: { legal_status: "company", legal_status_other: null } });
  assert.deepEqual(parseFieldInput("legal_status", { value: "" }), { ok: true, patch: { legal_status: null, legal_status_other: null } });
  assert.equal(parseFieldInput("legal_status", { value: "invented" }).ok, false);
  assert.deepEqual(parseFieldInput("legal_status", { value: "other", other: "  Association  " }), { ok: true, patch: { legal_status: "other", legal_status_other: "Association" } });
  assert.equal(parseFieldInput("legal_status", { value: "other", other: "   " }).ok, false);
  assert.equal(parseFieldInput("legal_status", { value: "other", other: "x".repeat(201) }).ok, false);
  assert.equal(parseFieldInput("legal_status", { value: "other", other: "x".repeat(200) }).ok, true);
});

test("changer de valeur efface le texte « Autre » précédent", () => {
  const r = parseFieldInput("vat_regime", { value: "normal", other: "reste" });
  assert.deepEqual(r, { ok: true, patch: { vat_regime: "normal", vat_regime_other: null } });
});

test("catégorie et ACRE n'ont pas de « Autre »", () => {
  assert.equal(parseFieldInput("activity_category", { value: "other", other: "x" }).ok, false);
  assert.equal(parseFieldInput("acre", { value: "other", other: "x" }).ok, false);
  assert.deepEqual(parseFieldInput("acre", { value: "unknown" }), { ok: true, patch: { acre: "unknown" } });
});

test("date : existe au calendrier, future permise, vide permis", () => {
  assert.equal(parseFieldInput("activity_start_date", { value: "2026-02-30" }).ok, false);
  assert.equal(parseFieldInput("activity_start_date", { value: "2027-01-15" }).ok, true);
  assert.equal(parseFieldInput("activity_start_date", { value: "15/01/2027" }).ok, false);
  assert.deepEqual(parseFieldInput("activity_start_date", { value: "" }), { ok: true, patch: { activity_start_date: null } });
});

test("texte libre : plafond de 2 000 caractères, caractère nul retiré", () => {
  assert.equal(parseFieldInput("financial_goals", { value: "x".repeat(2000) }).ok, true);
  assert.equal(parseFieldInput("financial_goals", { value: "x".repeat(2001) }).ok, false);
  assert.deepEqual(parseFieldInput("reserve_rates", { value: "a\u0000b" }), { ok: true, patch: { reserve_rates: "ab" } });
});

test("champ inconnu refusé (aucune colonne arbitraire écrite)", () => {
  assert.equal(parseFieldInput("owner_id", { value: "x" }).ok, false);
  assert.equal(parseFieldInput("legal_status_confirmed_at", { value: "2026-01-01" }).ok, false);
});

test("seuils : sous-ensemble trié sans doublon, aucun permis", () => {
  assert.deepEqual(parseThresholds(["100", "50", "100"]), { ok: true, value: [50, 100] });
  assert.deepEqual(parseThresholds([]), { ok: true, value: [] });
  assert.equal(parseThresholds(["60"]).ok, false);
  assert.equal(parseThresholds(["abc"]).ok, false);
});

test("missingFields : tout manque sans ligne, sauf ce qui est rempli", () => {
  assert.equal(missingFields(null).length, PROFILE_FIELDS.length);
  const row = { alert_thresholds: [90, 100], legal_status: "micro_enterprise", activity_category: "bnc" };
  assert.deepEqual(missingFields(row).includes("legal_status"), false);
  assert.equal(missingFields(row).length, PROFILE_FIELDS.length - 2);
});

test("« Je ne sais pas » (ACRE) reste « À confirmer » : jamais Déclaré, jamais Confirmé, signalé comme manquant", () => {
  assert.equal(fieldState("unknown", null, "acre"), "missing");
  assert.equal(fieldState("unknown", "2026-10-18T10:00:00Z", "acre"), "missing");
  assert.equal(fieldState("eligible", null, "acre"), "declared");
  assert.ok(missingFields({ alert_thresholds: [], acre: "unknown" }).includes("acre"));
});

test("longueur en points de code, comme char_length : 2 000 émojis passent, 2 001 non ; NUL seul = champ vidé ; NUL retiré d'« Autre »", () => {
  assert.equal(parseFieldInput("financial_goals", { value: "😀".repeat(2000) }).ok, true);
  assert.equal(parseFieldInput("financial_goals", { value: "😀".repeat(2001) }).ok, false);
  assert.equal(parseFieldInput("legal_status", { value: "other", other: "😀".repeat(200) }).ok, true);
  assert.equal(parseFieldInput("legal_status", { value: "other", other: "😀".repeat(201) }).ok, false);
  assert.deepEqual(parseFieldInput("financial_goals", { value: "\u0000" }), { ok: true, patch: { financial_goals: null } });
  assert.deepEqual(parseFieldInput("legal_status", { value: "other", other: "As\u0000so" }), { ok: true, patch: { legal_status: "other", legal_status_other: "Asso" } });
});
