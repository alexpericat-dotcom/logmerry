import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { saveProfile } from "../../app/(app)/profil/actions.ts";
import { fake, form, toLogin, withHarness } from "../helpers/harness.ts";

withHarness();

const saved = () => ({ data: [{ owner_id: "x" }] });

describe("saveProfile : enregistrer", () => {
  test("valeur de liste : mise à jour du profil, page revalidée, message « enregistré »", async () => {
    fake.respond = saved;
    const r = await saveProfile("activity_category", {}, form({ intent: "save", value: "bnc" }));
    assert.deepEqual(r, { message: "Catégorie : enregistré." });
    const [op] = fake.on("professional_profile", "update");
    assert.deepEqual(op.payload, { activity_category: "bnc" });
    // Supabase refuse un UPDATE sans filtre (21000) : le filtre « owner_id non nul » est de pure forme, la RLS limite déjà à ma ligne
    assert.deepEqual(op.filters.find((f) => f.kind === "filter")?.args, ["owner_id", "not.is", null]);
    assert.deepEqual(op.filters.find((f) => f.kind === "match")?.args, [{}]);
    assert.equal(op.returning, true);
    assert.deepEqual(fake.revalidated, ["/profil"]);
  });

  test("modifier un champ qui était confirmé : l'annonce le dit (la base remet la date de confirmation à zéro)", async () => {
    fake.respond = saved;
    const r = await saveProfile("activity_category", {}, form({ intent: "save", value: "bic", was_confirmed: "1" }));
    assert.match(r.message ?? "", /repassé en Déclaré/);
  });

  test("valeur vidée : le champ revient à « À confirmer » (null), jamais une valeur préremplie", async () => {
    fake.respond = saved;
    await saveProfile("legal_status", {}, form({ intent: "save", value: "" }));
    assert.deepEqual(fake.on("professional_profile", "update")[0].payload, { legal_status: null, legal_status_other: null });
  });

  test("valeur « Autre » : le texte est exigé, puis enregistré avec elle", async () => {
    assert.match((await saveProfile("legal_status", {}, form({ value: "other", other: "  " }))).error ?? "", /Précise la valeur/);
    assert.equal(fake.ops.length, 0);
    fake.respond = saved;
    await saveProfile("legal_status", {}, form({ value: "other", other: "Association" }));
    assert.deepEqual(fake.on("professional_profile", "update")[0].payload, { legal_status: "other", legal_status_other: "Association" });
  });

  test("valeur inconnue, champ inconnu : refus sans requête", async () => {
    assert.match((await saveProfile("activity_category", {}, form({ value: "autre" }))).error ?? "", /Choisis une valeur/);
    assert.equal((await saveProfile("inconnu", {}, form({ value: "x" }))).error, "Champ inconnu.");
    assert.equal(fake.ops.length, 0);
  });

  test("seuils d'alerte : sous-ensemble trié sans doublon ; seuil inconnu refusé", async () => {
    fake.respond = saved;
    const picked = new FormData();
    for (const t of ["100", "50", "100"]) picked.append("threshold", t);
    await saveProfile("alert_thresholds", {}, picked);
    assert.deepEqual(fake.on("professional_profile", "update")[0].payload, { alert_thresholds: [50, 100] });
    fake.reset();
    const bad = new FormData();
    bad.append("threshold", "42");
    assert.equal((await saveProfile("alert_thresholds", {}, bad)).error, "Seuil inconnu.");
    assert.equal(fake.ops.length, 0);
  });

  test("aucune ligne (profil absent) : « n'existe pas encore »", async () => {
    assert.match((await saveProfile("activity_category", {}, form({ value: "bnc" }))).error ?? "", /n'existe pas encore/);
  });

  test("erreur de la base : message général ; le journal ne reçoit ni la valeur saisie ni le texte de l'erreur (champ et code seulement)", async (t) => {
    const log = t.mock.method(console, "error", () => {});
    fake.respond = () => ({ error: { code: "XX000", message: "SENTINELLE-ERREUR" } });
    assert.equal((await saveProfile("financial_goals", {}, form({ value: "SENTINELLE-SAISIE" }))).error, "Enregistrement impossible. Réessaie.");
    assert.equal(log.mock.callCount(), 1);
    assert.deepEqual(log.mock.calls[0].arguments, ["Profil : écriture refusée", "financial_goals", "XX000"]);
  });
});

describe("saveProfile : confirmer", () => {
  test("ne confirme que la valeur vue : filtre sur la valeur attendue et sur la date de confirmation vide", async () => {
    fake.respond = saved;
    const r = await saveProfile("activity_category", {}, form({ intent: "confirm", expected: "bnc" }));
    assert.deepEqual(r, { message: "Catégorie : confirmé." });
    const [op] = fake.on("professional_profile", "update");
    assert.ok("activity_category_confirmed_at" in (op.payload as object));
    assert.deepEqual(op.filters.find((f) => f.kind === "filter")?.args, ["activity_category_confirmed_at", "is", null]);
    assert.deepEqual(op.filters.find((f) => f.kind === "match")?.args, [{ activity_category: "bnc" }]);
  });

  test("valeur « Autre » : le texte vu est aussi exigé", async () => {
    fake.respond = saved;
    await saveProfile("legal_status", {}, form({ intent: "confirm", expected: "other", expected_other: "Association" }));
    assert.deepEqual(fake.on("professional_profile", "update")[0].filters.find((f) => f.kind === "match")?.args, [{ legal_status: "other", legal_status_other: "Association" }]);
  });

  test("confirmer « Autre » sans texte vu : le texte vide est exigé tel quel (rien d'inventé)", async () => {
    fake.respond = saved;
    await saveProfile("legal_status", {}, form({ intent: "confirm", expected: "other" }));
    assert.deepEqual(fake.on("professional_profile", "update")[0].filters.find((f) => f.kind === "match")?.args, [{ legal_status: "other", legal_status_other: "" }]);
  });

  test("rien à confirmer (valeur vide, « je ne sais pas ») : refus sans requête ; valeur changée entre-temps : « a changé »", async () => {
    assert.match((await saveProfile("activity_category", {}, form({ intent: "confirm", expected: "" }))).error ?? "", /Enregistre une valeur/);
    assert.match((await saveProfile("acre", {}, form({ intent: "confirm", expected: "unknown" }))).error ?? "", /Enregistre une valeur/);
    assert.equal(fake.ops.length, 0);
    assert.match((await saveProfile("activity_category", {}, form({ intent: "confirm", expected: "bnc" }))).error ?? "", /a changé ou est déjà confirmée/);
  });
});

test("sans session : redirection vers la connexion ; session impossible à ouvrir : message", async () => {
  fake.claims = null;
  await assert.rejects(() => saveProfile("activity_category", {}, form({ value: "bnc" })), toLogin);
  assert.equal(fake.ops.length, 0);
  fake.reset();
  fake.failCreate = true;
  assert.equal((await saveProfile("activity_category", {}, form({ value: "bnc" }))).error, "Enregistrement impossible. Réessaie.");
});
