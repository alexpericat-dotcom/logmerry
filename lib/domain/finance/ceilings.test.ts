import assert from "node:assert/strict";
import test from "node:test";

import { ceilingPeriod, computeCeilings, rollingStart, type CeilingGauge, type CeilingMissing, type CeilingPayment, type CeilingProfile } from "./ceilings.ts";
import type { RuleRow } from "./rules.ts";

const ASOF = "2026-10-23";
const eur = (n: number) => Math.round(n * 100);

// Les montants des cas A à E sont les valeurs DEMO d'Alex (non officielles, jamais vérifiées) : plafond de CA micro de 83 600 €, année civile, hors taxe.
// Les cas G à J sont FICTIFS : valeurs inventées pour vérifier la formule. Tous les attendus ont été calculés à la main avant le code.
const ceilingRule = (over: Partial<RuleRow> = {}, params: Record<string, unknown> = {}): RuleRow => ({
  id: "r1",
  rule_key: "ceiling_turnover_micro",
  activity_category: "bnc",
  description: null,
  params: { amount_cents: eur(83600), period: "calendar_year", revenue_category: "Prestations de services BIC/BNC", tax_basis: "excl_tax", ...params },
  effective_from: "2026-01-01",
  effective_to: null,
  source: "DEMO",
  verified_on: "2026-10-01",
  revalidate_after: "2027-10-01",
  status: "essai",
  previous_version_id: null,
  ...over,
});
const profile = (over: Record<string, unknown> = {}): NonNullable<CeilingProfile> => ({ activity_category: "bnc", activity_category_confirmed_at: "2026-10-01T00:00:00Z", activity_start_date: null, alert_thresholds: [90, 100], ...over });
const pay = (received_on: string, ht: number, tax: number | null = 0): CeilingPayment => ({ received_on, amount_ht_cents: eur(ht), tax_cents: tax === null ? null : eur(tax) });

const micro = (rules: RuleRow[], p: CeilingProfile, payments: CeilingPayment[], asOf = ASOF) => computeCeilings(rules, p, payments, asOf)[0];
const gauge = (r: ReturnType<typeof micro>): CeilingGauge => {
  assert.equal(r.status, "ok", JSON.stringify(r));
  return r as CeilingGauge;
};
const missing = (r: ReturnType<typeof micro>): CeilingMissing => {
  assert.equal(r.status, "missing_parameter", JSON.stringify(r));
  return r as CeilingMissing;
};

test("cas A : 55 000 € sur 83 600 € = 65 %, reste 28 600 € ; l'encaissement du 31 décembre 2025 est hors période", () => {
  const g = gauge(micro([ceilingRule()], profile(), [pay("2026-02-10", 20000), pay("2026-06-15", 30000), pay("2026-10-23", 5000), pay("2025-12-31", 10000)]));
  assert.deepEqual([g.consumedCents, g.percent, g.remainingCents, g.overCents, g.state, g.alertThreshold, g.lastUpdate], [eur(55000), 65, eur(28600), 0, "below", null, "2026-10-23"]);
  assert.deepEqual(g.period, { kind: "calendar_year", from: "2026-01-01", to: ASOF });
});

test("cas B, C : 90 % pile atteint le seuil ; 89,9999 % ne l'atteint pas", () => {
  const b = gauge(micro([ceilingRule()], profile(), [pay("2026-09-01", 75240)]));
  assert.deepEqual([b.percent, b.state, b.alertThreshold, b.remainingCents], [90, "threshold", 90, eur(8360)]);
  const c = gauge(micro([ceilingRule()], profile(), [pay("2026-09-01", 75239.99)]));
  assert.deepEqual([c.percent, c.state, c.alertThreshold, c.remainingCents], [89, "below", null, eur(8360.01)]);
});

test("cas D, E : plafond atteint pile, puis dépassé de 6 400 € (107 %)", () => {
  const d = gauge(micro([ceilingRule()], profile(), [pay("2026-09-01", 83600)]));
  assert.deepEqual([d.percent, d.state, d.overCents, d.remainingCents, d.alertThreshold], [100, "reached", 0, 0, 100]);
  const e = gauge(micro([ceilingRule()], profile(), [pay("2026-09-01", 90000)]));
  assert.deepEqual([e.percent, e.state, e.overCents, e.remainingCents, e.alertThreshold], [107, "exceeded", eur(6400), 0, 100]);
});

test("seuils actifs du profil : 100 % décoché, le dépassement reste dit ; seuils choisis ; aucun seuil", () => {
  const over = gauge(micro([ceilingRule()], profile({ alert_thresholds: [50, 75] }), [pay("2026-09-01", 90000)]));
  assert.deepEqual([over.state, over.overCents, over.alertThreshold], ["exceeded", eur(6400), 75], "un plafond franchi est un fait, pas une préférence");
  const mid = gauge(micro([ceilingRule()], profile({ alert_thresholds: [50, 75] }), [pay("2026-09-01", 70000)]));
  assert.deepEqual([mid.percent, mid.state, mid.alertThreshold], [83, "threshold", 75]);
  const none = gauge(micro([ceilingRule()], profile({ alert_thresholds: [] }), [pay("2026-09-01", 70000)]));
  assert.deepEqual([none.state, none.alertThreshold], ["below", null]);
  const junk = gauge(micro([ceilingRule()], profile({ alert_thresholds: [75, 75, 33, 999] }), [pay("2026-09-01", 70000)]));
  assert.equal(junk.alertThreshold, 75, "doublons et seuils inconnus ignorés");
});

test("cas G : 12 mois glissants, première et dernière journée incluses, la veille exclue", () => {
  const rule = ceilingRule({}, { amount_cents: eur(10000), period: "rolling_12_months" });
  const g = gauge(micro([rule], profile(), [pay("2025-10-23", 1000), pay("2025-10-24", 2000), pay("2026-10-23", 3000)]));
  assert.deepEqual(g.period, { kind: "rolling_12_months", from: "2025-10-24", to: ASOF });
  assert.deepEqual([g.consumedCents, g.percent], [eur(5000), 50]);
});

test("cas H : 12 mois glissants au 29 février 2028 commencent le 1er mars 2027", () => {
  assert.equal(rollingStart("2028-02-29"), "2027-03-01");
  assert.equal(rollingStart("2026-10-23"), "2025-10-24");
  assert.equal(rollingStart("2026-01-01"), "2025-01-02");
  assert.equal(rollingStart("2028-03-01"), "2027-03-02");
  assert.deepEqual(ceilingPeriod("calendar_year", "2028-02-29"), { from: "2028-01-01", to: "2028-02-29" });
  // La règle doit être en vigueur et non périmée en 2028, sinon le code la refuse à raison.
  const rule = ceilingRule({ effective_from: "2027-01-01", revalidate_after: "2029-01-01" }, { amount_cents: eur(10000), period: "rolling_12_months" });
  const g = gauge(micro([rule], profile(), [pay("2027-02-28", 1000), pay("2027-03-01", 2000)], "2028-02-29"));
  assert.deepEqual([g.period.from, g.consumedCents], ["2027-03-01", eur(2000)]);
});

test("cas I, I-bis, J : base taxe comprise avec une taxe vide = minimum signalé ; toutes taxes connues = exact ; base hors taxe ignore la taxe", () => {
  const incl = ceilingRule({}, { amount_cents: eur(10000), tax_basis: "incl_tax" });
  const i = gauge(micro([incl], profile({ alert_thresholds: [75, 90] }), [pay("2026-03-01", 4000, 800), pay("2026-04-01", 3000, null)]));
  assert.deepEqual([i.consumedCents, i.percent, i.minimum, i.paymentsMissingTax, i.alertThreshold], [eur(7800), 78, true, 1, 75], "une taxe vide compte pour zéro mais le montant est un minimum, et l'alerte joue quand même");
  const ib = gauge(micro([incl], profile(), [pay("2026-03-01", 4000, 800), pay("2026-04-01", 3000, 600)]));
  assert.deepEqual([ib.consumedCents, ib.percent, ib.minimum, ib.paymentsMissingTax], [eur(8400), 84, false, 0]);
  const excl = ceilingRule({}, { amount_cents: eur(10000), tax_basis: "excl_tax" });
  const j = gauge(micro([excl], profile(), [pay("2026-03-01", 4000, 800), pay("2026-04-01", 3000, null)]));
  assert.deepEqual([j.consumedCents, j.percent, j.minimum, j.paymentsMissingTax], [eur(7000), 70, false, 0]);
  const old = gauge(micro([incl], profile(), [pay("2025-03-01", 4000, null), pay("2026-04-01", 1000, 0)]));
  assert.equal(old.paymentsMissingTax, 0, "une taxe vide hors période n'est pas comptée");
});

test("« paramètre manquant » : jamais un chiffre, avec la raison et le lien qui débloque", () => {
  const rules = [ceilingRule()];
  assert.deepEqual(computeCeilings([], profile(), [], ASOF).map((r) => [r.status, (r as CeilingMissing).reason, (r as CeilingMissing).link]), [
    ["missing_parameter", "rule_absent", "/regles"],
    ["missing_parameter", "rule_absent", "/regles"],
    ["missing_parameter", "rule_absent", "/regles"],
  ], "les trois jauges sont toujours là");
  for (const category of [null, "", undefined, "other"]) {
    const m = missing(micro(rules, profile({ activity_category: category }), [pay("2026-02-01", 100)]));
    assert.deepEqual([m.reason, m.link], ["category_missing", "/profil"], String(category));
  }
  assert.equal(missing(micro(rules, null, [])).reason, "category_missing");
  assert.equal(missing(micro([ceilingRule({ status: "a_verifier" })], profile(), [])).reason, "rule_unverified");
  assert.equal(missing(micro([ceilingRule({ status: "verifiee", revalidate_after: "2026-10-22" })], profile(), [])).reason, "rule_stale");
  assert.equal(micro([ceilingRule({ status: "verifiee", revalidate_after: "2026-10-23" })], profile(), []).status, "ok", "revérifiable jusqu'au jour dit inclus");
  assert.equal(missing(micro([ceilingRule({}, { period: "other", period_other: "trimestre" })], profile(), [pay("2026-02-01", 100)])).reason, "period_other");
  assert.equal(missing(micro([ceilingRule({ activity_category: "bic" })], profile(), [])).reason, "rule_absent", "règle d'une autre catégorie d'activité");
  assert.equal(missing(micro([ceilingRule({ effective_to: "2026-10-23" })], profile(), [])).reason, "rule_absent", "version close : la date de fin est exclue");
  assert.equal(missing(micro([ceilingRule({ effective_from: "2026-10-24" })], profile(), [])).reason, "rule_absent", "pas encore en vigueur");
  for (const params of [{ amount_cents: 0 }, { amount_cents: -5 }, { amount_cents: 1.5 }, { amount_cents: "100" }, { tax_basis: "ttc" }, { period: "x" }, { revenue_category: 3 }]) {
    assert.equal(missing(micro([ceilingRule({}, params)], profile(), [])).reason, "params_invalid", JSON.stringify(params));
  }
});

test("règle d'essai : un chiffre avec l'étiquette DEMO ; règle vérifiée : sans étiquette ; source et date d'effet reprises de la règle", () => {
  const demo = gauge(micro([ceilingRule()], profile(), []));
  assert.deepEqual([demo.demo, demo.source, demo.effectiveFrom, demo.revenueCategory, demo.basis], [true, "DEMO", "2026-01-01", "Prestations de services BIC/BNC", "excl_tax"]);
  const real = gauge(micro([ceilingRule({ status: "verifiee", source: "https://example.org/x" })], profile(), []));
  assert.deepEqual([real.demo, real.source], [false, "https://example.org/x"]);
  assert.equal(demo.lastUpdate, null, "aucun encaissement pris en compte : pas de date de mise à jour");
  assert.deepEqual([demo.consumedCents, demo.percent, demo.state], [0, 0, "below"]);
});

test("catégorie d'activité « Déclaré » non confirmée : calcul fait, bandeau demandé ; confirmée : pas de bandeau", () => {
  assert.equal(gauge(micro([ceilingRule()], profile({ activity_category_confirmed_at: null }), [])).declaredNotConfirmed, true);
  assert.equal(gauge(micro([ceilingRule()], profile(), [])).declaredNotConfirmed, false);
});

test("début d'activité dans la période : note « sans prorata » ; hors période ou inconnu : aucune note", () => {
  const at = (start: unknown, rolling = false) => gauge(micro([ceilingRule({}, rolling ? { period: "rolling_12_months" } : {})], profile({ activity_start_date: start }), [])).firstYearNotProrated;
  assert.equal(at("2026-03-15"), true);
  assert.equal(at("2026-01-01"), true, "premier jour de la période inclus");
  assert.equal(at("2025-12-31"), false);
  assert.equal(at(null), false);
  assert.equal(at("pas-une-date"), false);
  assert.equal(at("2026-12-01"), false, "début prévu après la date de référence : hors période");
  assert.equal(at("2025-10-24", true), true);
  assert.equal(at("2025-10-23", true), false);
});

test("les trois jauges prennent chacune leur propre règle : le même montant n'est jamais réutilisé", () => {
  const rules = [
    ceilingRule({ id: "a" }, { amount_cents: eur(1000) }),
    ceilingRule({ id: "b", rule_key: "ceiling_vat_franchise" }, { amount_cents: eur(2000), tax_basis: "incl_tax" }),
    ceilingRule({ id: "c", rule_key: "ceiling_vat_tolerance" }, { amount_cents: eur(4000), period: "rolling_12_months" }),
  ];
  const [a, b, c] = computeCeilings(rules, profile(), [pay("2026-05-01", 500, 100)], ASOF) as CeilingGauge[];
  assert.deepEqual([a.key, a.ceilingCents, a.consumedCents, a.percent], ["ceiling_turnover_micro", eur(1000), eur(500), 50]);
  assert.deepEqual([b.key, b.ceilingCents, b.consumedCents, b.percent], ["ceiling_vat_franchise", eur(2000), eur(600), 30]);
  assert.deepEqual([c.key, c.ceilingCents, c.consumedCents, c.percent, c.period.kind], ["ceiling_vat_tolerance", eur(4000), eur(500), 12, "rolling_12_months"]);
});

test("rien n'est modifié : les entrées ne bougent pas", () => {
  const rules = [ceilingRule()];
  const payments = [pay("2026-02-10", 20000)];
  const snapshot = JSON.stringify([rules, payments]);
  computeCeilings(rules, profile(), payments, ASOF);
  assert.equal(JSON.stringify([rules, payments]), snapshot);
});
