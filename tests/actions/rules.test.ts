import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { createRule, updateRule } from "../../app/(app)/regles/actions.ts";
import { fake, filterValue, form, toLogin, withHarness } from "../helpers/harness.ts";

const ID = "30303030-3030-4030-8030-303030303030";
const VALID = { activity_category: "bnc", effective_from: "2026-01-01", source: "https://www.urssaf.fr/regles", verified_on: "2026-10-01", revalidate_after: "2027-10-01", description: "", p_months: "12" };

withHarness();

describe("createRule", () => {
  test("une seule fonction SQL (`create_rule_version`) ferme l'ancienne version et insère ; toujours « à vérifier » ; page revalidée", async () => {
    fake.respond = () => ({ data: null });
    assert.deepEqual(await createRule("acre_duration", {}, form(VALID)), { saved: true });
    const [rpc] = fake.on("create_rule_version");
    // chaque champ de la saisie arrive au bon argument (une date permutée ferait un calcul faux)
    assert.deepEqual(rpc.payload, {
      p_rule_key: "acre_duration",
      p_activity_category: "bnc",
      p_effective_from: "2026-01-01",
      p_params: { months: 12 },
      p_source: "https://www.urssaf.fr/regles",
      p_verified_on: "2026-10-01",
      p_revalidate_after: "2027-10-01",
      p_description: undefined,
      p_status: "a_verifier", // jamais « vérifiée » à la création
    });
    assert.equal(fake.ops.filter((o) => o.op !== "rpc").length, 0); // aucune écriture directe : tout passe par la fonction transactionnelle
    assert.deepEqual(fake.revalidated, ["/regles"]);
  });

  test("« DEMO » est réservée au compte de démonstration : refusée comme source (aussi avec des espaces), aucune requête", async () => {
    for (const source of ["DEMO", "  DEMO "]) assert.ok((await createRule("acre_duration", {}, form({ ...VALID, source }))).errors?.source);
    assert.equal(fake.ops.length, 0);
  });

  test("dates incohérentes (revérification avant la vérification), catégorie hors liste, durée nulle : erreurs, aucune requête", async () => {
    assert.ok((await createRule("acre_duration", {}, form({ ...VALID, revalidate_after: "2026-01-01" }))).errors?.revalidate_after);
    assert.ok((await createRule("acre_duration", {}, form({ ...VALID, activity_category: "xyz" }))).errors?.activity_category);
    assert.ok((await createRule("acre_duration", {}, form({ ...VALID, p_months: "0" }))).errors?.["param:months"]);
    assert.equal(fake.ops.length, 0);
  });

  test("règle inconnue, paramètre invalide : erreurs par champ, aucune requête", async () => {
    assert.ok((await createRule("inconnue", {}, form(VALID))).errors?.rule_key);
    assert.ok((await createRule("acre_duration", {}, form({ ...VALID, p_months: "abc" }))).errors?.["param:months"]);
    assert.equal(fake.ops.length, 0);
  });

  test("23P01 (chevauchement de dates) : erreur sur la date d'effet ; autre erreur : message général ; le journal ne reçoit que le code", async (t) => {
    const log = t.mock.method(console, "error", () => {});
    fake.respond = () => ({ error: { code: "23P01", message: "SENTINELLE-ERREUR" } });
    assert.ok((await createRule("acre_duration", {}, form(VALID))).errors?.effective_from);
    fake.respond = () => ({ error: { code: "XX000", message: "SENTINELLE-ERREUR" } });
    assert.match((await createRule("acre_duration", {}, form({ ...VALID, source: "https://exemple.fr/SENTINELLE-SOURCE", description: "SENTINELLE-DESCRIPTION" }))).message ?? "", /Enregistrement impossible/);
    for (const call of log.mock.calls) assert.deepEqual(call.arguments.length, 2); // message + code, rien d'autre
    assert.ok(!JSON.stringify(log.mock.calls).includes("SENTINELLE"));
    assert.deepEqual(fake.revalidated, []);
  });
});

describe("updateRule", () => {
  const ok = () => ({ data: [{ id: ID }] });

  test("vérifier : seulement une règle « à vérifier » (statut attendu dans la requête), relue, page revalidée", async () => {
    fake.respond = ok;
    assert.deepEqual(await updateRule(ID, {}, form({ intent: "verify" })), { done: true });
    const [op] = fake.on("regulatory_rules", "update");
    assert.deepEqual(op.payload, { status: "verifiee" });
    assert.equal(filterValue(op, "eq", "id"), ID);
    assert.equal(filterValue(op, "eq", "status"), "a_verifier");
    assert.equal(op.returning, true);
    assert.deepEqual(fake.revalidated, ["/regles"]);
  });

  test("repasser à vérifier : seulement depuis « vérifiée »", async () => {
    fake.respond = ok;
    await updateRule(ID, {}, form({ intent: "unverify" }));
    const [op] = fake.on("regulatory_rules", "update");
    assert.deepEqual(op.payload, { status: "a_verifier" });
    assert.equal(filterValue(op, "eq", "status"), "verifiee");
  });

  test("supprimer : seulement une règle « à vérifier » (une règle vérifiée ne se supprime pas)", async () => {
    fake.respond = ok;
    assert.deepEqual(await updateRule(ID, {}, form({ intent: "delete" })), { done: true });
    const [op] = fake.on("regulatory_rules", "delete");
    assert.equal(filterValue(op, "eq", "id"), ID);
    assert.equal(filterValue(op, "eq", "status"), "a_verifier");
    assert.equal(op.returning, true);
  });

  test("revérifier : nouvelles dates validées, statut « vérifiée » exigé ; format invalide ou revérification avant la vérification : message, aucune requête", async () => {
    fake.respond = ok;
    await updateRule(ID, {}, form({ intent: "revalidate", verified_on: "2026-10-01", revalidate_after: "2027-10-01" }));
    const [op] = fake.on("regulatory_rules", "update");
    assert.deepEqual(op.payload, { verified_on: "2026-10-01", revalidate_after: "2027-10-01" });
    assert.equal(filterValue(op, "eq", "status"), "verifiee");
    fake.reset();
    assert.ok((await updateRule(ID, {}, form({ intent: "revalidate", verified_on: "pas une date", revalidate_after: "" }))).message);
    assert.ok((await updateRule(ID, {}, form({ intent: "revalidate", verified_on: "2026-10-01", revalidate_after: "2026-09-01" }))).message);
    assert.equal(fake.ops.length, 0);
  });

  test("règle changée entre-temps (aucune ligne) : « a changé » ; 23514 en vérifiant : il faut un lien https (seulement là) ; autre erreur : message général ; journal sans valeur", async (t) => {
    const log = t.mock.method(console, "error", () => {});
    assert.match((await updateRule(ID, {}, form({ intent: "verify" }))).message ?? "", /a changé entre-temps/);
    fake.respond = () => ({ error: { code: "23514" } });
    assert.match((await updateRule(ID, {}, form({ intent: "verify" }))).message ?? "", /lien officiel https/);
    for (const intent of ["unverify", "delete"]) assert.match((await updateRule(ID, {}, form({ intent }))).message ?? "", /Enregistrement impossible/); // le motif « lien https » ne vaut que pour « vérifier »
    fake.respond = () => ({ error: { code: "XX000", message: "SENTINELLE-ERREUR" } });
    assert.match((await updateRule(ID, {}, form({ intent: "delete" }))).message ?? "", /Enregistrement impossible/);
    assert.deepEqual(fake.revalidated, []);
    assert.ok(!JSON.stringify(log.mock.calls).includes("SENTINELLE"));
  });

  test("identifiant invalide et action inconnue : refus sans requête", async () => {
    assert.match((await updateRule("x", {}, form({ intent: "verify" }))).message ?? "", /n'existe plus/);
    assert.equal((await updateRule(ID, {}, form({ intent: "nimporte" }))).message, "Action inconnue.");
    assert.equal(fake.ops.length, 0);
  });
});

test("sans session : redirection vers la connexion, aucune requête ; session impossible à ouvrir : message", async () => {
  fake.claims = null;
  await assert.rejects(() => createRule("acre_duration", {}, form(VALID)), toLogin);
  await assert.rejects(() => updateRule(ID, {}, form({ intent: "verify" })), toLogin);
  assert.equal(fake.ops.length, 0);
  fake.reset();
  fake.failCreate = true;
  assert.match((await updateRule(ID, {}, form({ intent: "verify" }))).message ?? "", /Enregistrement impossible/);
});
