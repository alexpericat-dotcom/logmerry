import assert from "node:assert/strict";
import test from "node:test";

import { describeParams, parseParams, paramsToForm, RULE_KEYS, visibleFields, ruleKeyDef } from "./rule-keys.ts";
import { canDeleteRule, canUnverify, canVerify, displayState, isOfficialLink, isStale, usableRule, validateRuleInput, validateVerification, type RuleRow } from "./rules.ts";

// FICTIF : valeurs inventées pour vérifier la FORMULE et la validation, jamais des valeurs réglementaires.
const rule = (over: Partial<RuleRow> = {}): RuleRow => ({
  id: "r1", rule_key: "acre_duration", activity_category: "bnc", description: null, params: { months: 7 },
  effective_from: "2026-01-01", effective_to: null, source: "https://example.org/x", verified_on: "2026-10-01", revalidate_after: "2027-10-01", status: "verifiee", previous_version_id: null, ...over,
});

test("le catalogue : six clés, dont trois plafonds ; aucune clé sans champ", () => {
  assert.equal(RULE_KEYS.length, 6);
  assert.equal(RULE_KEYS.filter((k) => k.key.startsWith("ceiling_")).length, 3);
  assert.ok(RULE_KEYS.every((k) => k.fields.length > 0));
});

test("aucune valeur réglementaire dans le catalogue : aucun champ n'a de valeur par défaut", () => {
  for (const k of RULE_KEYS) for (const f of k.fields) assert.equal("default" in f || "value" in f, false, `${k.key}.${f.name}`);
});

test("plafond : montant en centimes, période, catégorie de recettes, base ; « autre » exige sa précision", () => {
  const ok = parseParams("ceiling_turnover_micro", { amount_cents: "1 234,50", period: "calendar_year", revenue_category: "Prestations", tax_basis: "excl_tax" });
  assert.deepEqual(ok, { ok: true, params: { amount_cents: 123450, period: "calendar_year", revenue_category: "Prestations", tax_basis: "excl_tax" } });
  const other = parseParams("ceiling_turnover_micro", { amount_cents: "100", period: "other", revenue_category: "x", tax_basis: "incl_tax" });
  assert.equal(other.ok, false);
  assert.ok(!other.ok && other.errors.period_other);
  const other2 = parseParams("ceiling_turnover_micro", { amount_cents: "100", period: "other", period_other: "trimestre", revenue_category: "x", tax_basis: "incl_tax" });
  assert.ok(other2.ok && other2.params.period_other === "trimestre");
  // un champ conditionnel non applicable n'est pas stocké
  const hidden = parseParams("ceiling_turnover_micro", { amount_cents: "100", period: "calendar_year", period_other: "reste", revenue_category: "x", tax_basis: "excl_tax" });
  assert.ok(hidden.ok && !("period_other" in hidden.params));
});

test("tout est obligatoire, rien n'est deviné : champ vide, montant nul, base inconnue", () => {
  const r = parseParams("ceiling_vat_franchise", { amount_cents: "", period: "", revenue_category: "", tax_basis: "ttc" });
  assert.ok(!r.ok && Object.keys(r.errors).sort().join() === "amount_cents,period,revenue_category,tax_basis");
  assert.equal(parseParams("ceiling_vat_franchise", { amount_cents: "0", period: "calendar_year", revenue_category: "x", tax_basis: "excl_tax" }).ok, false);
});

test("entiers : bornes et format (pas de décimale, pas de négatif)", () => {
  assert.deepEqual(parseParams("acre_duration", { months: "12" }), { ok: true, params: { months: 12 } });
  for (const bad of ["0", "121", "-3", "1.5", "abc", ""]) assert.equal(parseParams("acre_duration", { months: bad }).ok, false, bad);
  assert.equal(parseParams("first_year_prorata", { day_basis: "400" }).ok, true);
  assert.equal(parseParams("first_year_prorata", { day_basis: "401" }).ok, false);
  assert.equal(parseParams("vat_switch", { delay: "3", unit: "years" }).ok, false);
  assert.equal(parseParams("vat_switch", { delay: "3", unit: "months" }).ok, true);
  assert.equal(parseParams("inconnue", {}).ok, false);
});

test("describeParams et paramsToForm : lecture humaine et reprise d'une version", () => {
  assert.deepEqual(describeParams("vat_switch", { delay: 3, unit: "months" }), ["Délai : 3", "Unité du délai : Mois"]);
  const form = paramsToForm("ceiling_vat_tolerance", { amount_cents: 123405, period: "rolling_12_months", revenue_category: "x", tax_basis: "excl_tax" });
  assert.equal(form.amount_cents, "1234,05");
  assert.equal(form.period, "rolling_12_months");
  assert.deepEqual(visibleFields(ruleKeyDef("ceiling_vat_tolerance")!, form).map((f) => f.name), ["amount_cents", "period", "revenue_category", "tax_basis"]);
});

test("« périmée » est dérivée : en vigueur seulement ; une version close ne l'est jamais ; le jour même n'est pas périmé", () => {
  assert.equal(displayState(rule(), "2027-10-01"), "verifiee");
  assert.equal(displayState(rule(), "2027-10-02"), "perimee");
  assert.equal(displayState(rule({ effective_to: "2026-07-01" }), "2030-01-01"), "verifiee");
  assert.equal(displayState(rule({ status: "a_verifier" }), "2030-01-01"), "a_verifier");
  assert.equal(displayState(rule({ status: "essai", source: "DEMO" }), "2030-01-01"), "essai");
});

test("usableRule : absente, à vérifier et périmée ne sont jamais utilisées ; vérifiée oui ; essai oui avec le drapeau demo", () => {
  const asOf = "2026-10-18";
  assert.deepEqual(usableRule([], "acre_duration", "bnc", asOf), { status: "missing_parameter", reason: "absente" });
  assert.deepEqual(usableRule([rule({ status: "a_verifier" })], "acre_duration", "bnc", asOf), { status: "missing_parameter", reason: "non_verifiee" });
  assert.deepEqual(usableRule([rule({ revalidate_after: "2026-10-17" })], "acre_duration", "bnc", asOf), { status: "missing_parameter", reason: "perimee" });
  const ok = usableRule([rule()], "acre_duration", "bnc", asOf);
  assert.ok(ok.status === "ok" && !ok.demo);
  const demo = usableRule([rule({ status: "essai", source: "DEMO" })], "acre_duration", "bnc", asOf);
  assert.ok(demo.status === "ok" && demo.demo);
  // mauvaise catégorie ou pas encore en vigueur
  assert.equal(usableRule([rule()], "acre_duration", "bic", asOf).status, "missing_parameter");
  assert.equal(usableRule([rule({ effective_from: "2026-11-01" })], "acre_duration", "bnc", asOf).status, "missing_parameter");
});

test("période passée : la version close qui s'appliquait alors est utilisée, et ne bloque pas", () => {
  const v1 = rule({ id: "v1", effective_to: "2026-07-01", params: { months: 1 } });
  const v2 = rule({ id: "v2", effective_from: "2026-07-01", params: { months: 2 }, status: "a_verifier" });
  const past = usableRule([v1, v2], "acre_duration", "bnc", "2026-03-01");
  assert.ok(past.status === "ok" && past.rule.id === "v1");
  assert.equal(usableRule([v1, v2], "acre_duration", "bnc", "2026-07-01").status, "missing_parameter"); // la 2 est en vigueur, non vérifiée
});

test("liens officiels : https seulement, sans espace", () => {
  assert.equal(isOfficialLink("https://www.service-public.fr/x"), true);
  for (const bad of ["http://x.org", "https://", "https://x .org", "DEMO", "x.org", ""]) assert.equal(isOfficialLink(bad), false, bad);
  assert.equal(canVerify(rule({ status: "a_verifier", source: "texte" })), false);
  assert.equal(canVerify(rule({ status: "a_verifier" })), true);
  assert.equal(canDeleteRule(rule()), false);
});

const TODAY = "2026-10-18";

test("validateRuleInput : tout est obligatoire, DEMO refusée, revérification pas avant la vérification", () => {
  const base = { rule_key: "acre_duration", activity_category: "bnc", effective_from: "2026-01-01", source: "https://example.org", verified_on: "2026-10-01", revalidate_after: "2027-10-01", description: "", params: { months: "6" } };
  assert.ok(validateRuleInput(base, TODAY).ok);
  const bad = validateRuleInput({ ...base, source: "", effective_from: "2026-02-30", verified_on: "", activity_category: "x", params: {} }, TODAY);
  assert.ok(!bad.ok && ["source", "effective_from", "verified_on", "activity_category", "param:months"].every((k) => k in bad.errors));
  assert.ok(!validateRuleInput({ ...base, source: "DEMO" }, TODAY).ok);
  assert.ok(!validateRuleInput({ ...base, revalidate_after: "2026-09-30" }, TODAY).ok);
  assert.ok(validateRuleInput({ ...base, revalidate_after: "2026-10-01" }, TODAY).ok);
  assert.ok(!validateRuleInput({ ...base, rule_key: "zzz" }, TODAY).ok);
  assert.ok(!validateRuleInput({ ...base, source: "x".repeat(501) }, TODAY).ok);
  assert.ok(!validateRuleInput({ ...base, description: "x".repeat(501) }, TODAY).ok);
});

test("dates de vérification : pas dans le futur, revérification ensuite et au plus 5 ans plus tard (bornes incluses)", () => {
  assert.deepEqual(validateVerification("2026-10-18", "2031-10-18", TODAY), {});
  assert.ok(validateVerification("2026-10-19", "2027-01-01", TODAY).verified_on);
  assert.ok(validateVerification("2026-10-18", "2031-10-19", TODAY).revalidate_after);
  assert.ok(validateVerification("2026-10-18", "9999-12-31", TODAY).revalidate_after);
  assert.ok(validateVerification("2026-10-18", "2026-10-17", TODAY).revalidate_after);
  assert.deepEqual(validateVerification("2026-10-18", "2026-10-18", TODAY), {});
  assert.ok(validateVerification("", "", TODAY).verified_on && validateVerification("", "", TODAY).revalidate_after);
  assert.ok(!validateRuleInput({ rule_key: "acre_duration", activity_category: "bnc", effective_from: "2026-01-01", source: "https://e.org", verified_on: "2026-10-19", revalidate_after: "2027-01-01", description: "", params: { months: "6" } }, TODAY).ok);
  assert.ok(validateRuleInput({ rule_key: "acre_duration", activity_category: "bnc", effective_from: "2026-01-01", source: "x".repeat(500), verified_on: "2026-10-01", revalidate_after: "2027-01-01", description: "x".repeat(500), params: { months: "6" } }, TODAY).ok, "500 caractères acceptés");
});

test("bornes de usableRule : le jour d'effet est inclus, le jour de fin est exclu ; la raison est précise", () => {
  const v1 = rule({ id: "v1", effective_to: "2026-07-01", params: { months: 1 } });
  const v2 = rule({ id: "v2", effective_from: "2026-07-01", params: { months: 2 } });
  const first = usableRule([v1, v2], "acre_duration", "bnc", "2026-07-01");
  assert.ok(first.status === "ok" && first.rule.id === "v2", "le 1er juillet, la version 2 s'applique");
  const last = usableRule([v1, v2], "acre_duration", "bnc", "2026-06-30");
  assert.ok(last.status === "ok" && last.rule.id === "v1", "la veille, la version 1");
  const pending = usableRule([v1, rule({ id: "v2", effective_from: "2026-07-01", status: "a_verifier" })], "acre_duration", "bnc", "2026-07-01");
  assert.deepEqual(pending, { status: "missing_parameter", reason: "non_verifiee" });
  // trou entre deux versions : absente
  const gap = usableRule([rule({ id: "v1", effective_to: "2026-07-01" }), rule({ id: "v3", effective_from: "2026-09-01" })], "acre_duration", "bnc", "2026-08-01");
  assert.deepEqual(gap, { status: "missing_parameter", reason: "absente" });
});

test("une règle d'essai périmée n'est plus utilisable ; une règle « à vérifier » n'est jamais « périmée » mais « non vérifiée »", () => {
  const demo = rule({ status: "essai", source: "DEMO", revalidate_after: "2026-10-17" });
  assert.equal(isStale(demo, "2026-10-18"), true);
  assert.deepEqual(usableRule([demo], "acre_duration", "bnc", "2026-10-18"), { status: "missing_parameter", reason: "perimee" });
  assert.equal(isStale(rule({ status: "a_verifier", revalidate_after: "2020-01-01" }), "2026-10-18"), false);
  assert.equal(isStale(rule({ effective_to: "2026-07-01", revalidate_after: "2020-01-01" }), "2026-10-18"), false, "une version close n'est jamais périmée");
});

test("une version close et vérifiée ne repasse pas « à vérifier »", () => {
  assert.equal(canUnverify(rule()), true);
  assert.equal(canUnverify(rule({ effective_to: "2026-07-01" })), false);
  assert.equal(canUnverify(rule({ status: "a_verifier" })), false);
});

test("valeurs nettoyées avant de décider des champs visibles : « other » avec espace ou NUL reste « other »", () => {
  const base = { amount_cents: "100", revenue_category: "x", tax_basis: "excl_tax" };
  for (const period of [" other", "other\u0000", "other "]) {
    const r = parseParams("ceiling_turnover_micro", { ...base, period });
    assert.ok(!r.ok && r.errors.period_other, JSON.stringify(period));
  }
});
