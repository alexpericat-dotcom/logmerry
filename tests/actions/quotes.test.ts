import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { acceptQuote, createQuote, deleteQuote, refuseQuote, sendQuote, updateQuote } from "../../app/(app)/clients/quote-actions.ts";
import { fake, filterValue, form, toLogin, withHarness } from "../helpers/harness.ts";

const CLIENT = "88888888-8888-4888-8888-888888888888";
const ID = "99999999-9999-4999-8999-999999999999";
const MISSION = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

const VALID = { amount_ht: "1200,00", tax: "", sent_on: "", mission_id: "" };
const REFRESHED = ["/clients", "/missions", `/clients/${CLIENT}`];

withHarness();

describe("createQuote", () => {
  test("vérifie la fiche, puis insère un devis rattaché à elle (jamais de statut envoyé à la création)", async () => {
    fake.respond = (op) => (op.table === "clients" ? { data: [{ id: CLIENT }] } : { data: [] });
    assert.deepEqual(await createQuote(CLIENT, {}, form(VALID)), { saved: true });
    assert.equal(filterValue(fake.on("clients", "select")[0], "eq", "id"), CLIENT);
    const [op] = fake.on("quotes", "insert");
    assert.equal((op.payload as { client_id: string }).client_id, CLIENT);
    assert.equal((op.payload as { amount_ht_cents: number }).amount_ht_cents, 120000);
    assert.equal("status" in (op.payload as object), false);
    assert.deepEqual(fake.revalidated, REFRESHED);
  });

  test("fiche disparue : « n'existe plus », aucun devis créé", async () => {
    assert.match((await createQuote(CLIENT, {}, form(VALID))).message ?? "", /fiche n'existe plus/);
    assert.equal(fake.on("quotes").length, 0);
  });

  test("erreur d'insertion ou de lecture de la fiche : message général, rien de revalidé", async () => {
    fake.respond = (op) => (op.table === "quotes" ? { error: { code: "XX000" } } : { data: [{ id: CLIENT }] });
    assert.match((await createQuote(CLIENT, {}, form(VALID))).message ?? "", /Enregistrement impossible/);
    fake.respond = () => ({ error: { code: "XX000" } });
    assert.match((await createQuote(CLIENT, {}, form(VALID))).message ?? "", /Enregistrement impossible/);
    assert.deepEqual(fake.revalidated, []);
  });

  test("montant invalide : erreurs par champ, aucune requête", async () => {
    assert.ok((await createQuote(CLIENT, {}, form({ ...VALID, amount_ht: "abc" }))).errors?.amount_ht);
    assert.equal(fake.ops.length, 0);
  });
});

describe("updateQuote", () => {
  test("met à jour en gardant le statut lu comme condition (un devis qui change d'état entre-temps n'est pas écrasé)", async () => {
    fake.respond = (op) => (op.op === "select" && !op.returning ? { data: [{ client_id: CLIENT, status: "draft" }] } : { data: [{ id: ID }] });
    assert.deepEqual(await updateQuote(ID, {}, form(VALID)), { saved: true });
    const [op] = fake.on("quotes", "update");
    assert.equal(filterValue(op, "eq", "id"), ID);
    assert.equal(filterValue(op, "eq", "status"), "draft");
    assert.equal(op.returning, true);
    assert.deepEqual(fake.revalidated, REFRESHED);
  });

  test("refusé ou accepté : jamais d'écriture, message « plus modifiable »", async () => {
    for (const status of ["refused", "accepted"]) {
      fake.reset();
      fake.respond = () => ({ data: [{ client_id: CLIENT, status }] });
      assert.match((await updateQuote(ID, {}, form(VALID))).message ?? "", /plus modifiable/);
      assert.equal(fake.on("quotes", "update").length, 0);
    }
  });

  test("changé d'état entre la lecture et l'écriture (aucune ligne touchée) : « plus modifiable »", async () => {
    fake.respond = (op) => (op.returning ? { data: [] } : { data: [{ client_id: CLIENT, status: "sent" }] });
    assert.match((await updateQuote(ID, {}, form({ ...VALID, sent_on: "2026-10-01" }))).message ?? "", /plus modifiable/);
    assert.deepEqual(fake.revalidated, []);
  });

  test("envoyé sans date d'envoi : erreur de champ, aucune écriture", async () => {
    fake.respond = () => ({ data: [{ client_id: CLIENT, status: "sent" }] });
    assert.ok((await updateQuote(ID, {}, form(VALID))).errors?.sent_on);
    assert.equal(fake.on("quotes", "update").length, 0);
  });

  test("devis introuvable : « n'existe plus »", async () => {
    assert.match((await updateQuote(ID, {}, form(VALID))).message ?? "", /n'existe plus/);
  });
});

describe("sendQuote / refuseQuote", () => {
  test("envoyer : passe de brouillon à envoyé avec sa date, seulement depuis « brouillon »", async () => {
    fake.respond = () => ({ data: [{ client_id: CLIENT }] });
    assert.deepEqual(await sendQuote(ID, "2026-10-20"), {});
    const [op] = fake.on("quotes", "update");
    assert.deepEqual(op.payload, { status: "sent", sent_on: "2026-10-20" });
    assert.equal(filterValue(op, "eq", "status"), "draft");
    assert.equal(op.returning, true);
    assert.deepEqual(fake.revalidated, REFRESHED);
  });

  test("date d'envoi vide ou invalide : message, aucune requête", async () => {
    assert.match((await sendQuote(ID, "  ")).message ?? "", /Saisis la date/);
    assert.match((await sendQuote(ID, "31/12/2026")).message ?? "", /date d'envoi valide/);
    assert.equal(fake.ops.length, 0);
  });

  test("refuser avec succès : statut « refused », relu, pages revalidées ; erreur de la base : message général", async () => {
    fake.respond = () => ({ data: [{ client_id: CLIENT }] });
    assert.deepEqual(await refuseQuote(ID), {});
    assert.deepEqual(fake.revalidated, REFRESHED);
    fake.reset();
    fake.respond = () => ({ error: { code: "XX000" } });
    assert.match((await refuseQuote(ID)).message ?? "", /Enregistrement impossible/);
    assert.match((await sendQuote(ID, "2026-10-20")).message ?? "", /Enregistrement impossible/);
    assert.deepEqual(fake.revalidated, []);
  });

  test("envoyer un devis qui n'est plus un brouillon : « n'est plus un brouillon », rien de revalidé", async () => {
    assert.match((await sendQuote(ID, "2026-10-20")).message ?? "", /n'est plus un brouillon/);
    assert.deepEqual(fake.revalidated, []);
  });

  test("refuser : seulement depuis « envoyé » ; aucune ligne touchée = « n'est plus envoyé »", async () => {
    assert.match((await refuseQuote(ID)).message ?? "", /n'est plus « envoyé »/);
    const [op] = fake.on("quotes", "update");
    assert.deepEqual(op.payload, { status: "refused" });
    assert.equal(filterValue(op, "eq", "status"), "sent");
    assert.deepEqual(fake.revalidated, []);
  });
});

describe("acceptQuote", () => {
  test("accepter passe par la fonction tout-ou-rien `accept_quote` et renvoie la mission ouverte", async () => {
    fake.respond = (op) => (op.op === "rpc" ? { data: MISSION } : { data: [{ client_id: CLIENT }] });
    assert.deepEqual(await acceptQuote(ID), { missionId: MISSION });
    assert.deepEqual(fake.on("accept_quote")[0].payload, { p_quote_id: ID });
    assert.equal(fake.on("quotes", "update").length, 0); // jamais d'écriture directe du statut « accepté »
    assert.deepEqual(fake.revalidated, REFRESHED);
  });

  test("codes de la base : P0002 = disparu ; 23514 « quote not sent / frozen » = n'est plus envoyé ; tout autre = échec", async () => {
    fake.respond = () => ({ error: { code: "P0002", message: "" } });
    assert.match((await acceptQuote(ID)).message ?? "", /n'existe plus/);
    fake.respond = () => ({ error: { code: "23514", message: "quote not sent" } });
    assert.match((await acceptQuote(ID)).message ?? "", /n'est plus « envoyé »/);
    fake.respond = () => ({ error: { code: "23514", message: "quote frozen" } });
    assert.match((await acceptQuote(ID)).message ?? "", /n'est plus « envoyé »/);
    fake.respond = () => ({ error: { code: "23514", message: "check constraint of another write" } });
    assert.match((await acceptQuote(ID)).message ?? "", /Acceptation impossible/);
    assert.deepEqual(fake.revalidated, []);
  });
});

describe("deleteQuote", () => {
  test("seul un brouillon se supprime : filtre sur le statut, relu", async () => {
    fake.respond = () => ({ data: [{ client_id: CLIENT }] });
    assert.deepEqual(await deleteQuote(ID), {});
    const [op] = fake.on("quotes", "delete");
    assert.equal(filterValue(op, "eq", "id"), ID);
    assert.equal(filterValue(op, "eq", "status"), "draft");
    assert.equal(op.returning, true);
    assert.deepEqual(fake.revalidated, REFRESHED);
  });

  test("facture liée (23503) : refus dédié ; aucune ligne : « seul un brouillon… » ; autre erreur : « conservé »", async () => {
    fake.respond = () => ({ error: { code: "23503" } });
    assert.match((await deleteQuote(ID)).message ?? "", /facture/i);
    fake.respond = () => ({ data: [] });
    assert.match((await deleteQuote(ID)).message ?? "", /Seul un brouillon se supprime/);
    fake.respond = () => ({ error: { code: "XX000" } });
    assert.match((await deleteQuote(ID)).message ?? "", /conservé/);
  });
});

test("identifiant invalide : « n'existe plus » et aucune requête pour chaque action sur un devis", async () => {
  for (const r of [await updateQuote("x", {}, form(VALID)), await sendQuote("x", "2026-10-20"), await refuseQuote("x"), await acceptQuote("x"), await deleteQuote("x"), await createQuote("x", {}, form(VALID))]) {
    assert.match(r.message ?? "", /n'existe plus/);
  }
  assert.equal(fake.ops.length, 0);
});

test("session impossible à ouvrir : messages d'échec, pas de plantage", async () => {
  fake.failCreate = true;
  assert.match((await deleteQuote(ID)).message ?? "", /conservé/);
  assert.match((await acceptQuote(ID)).message ?? "", /Acceptation impossible/);
});

test("sans session : redirection vers la connexion, aucune requête, pour toutes les actions", async () => {
  fake.claims = null;
  await assert.rejects(() => createQuote(CLIENT, {}, form(VALID)), toLogin);
  await assert.rejects(() => updateQuote(ID, {}, form(VALID)), toLogin);
  await assert.rejects(() => sendQuote(ID, "2026-10-20"), toLogin);
  await assert.rejects(() => refuseQuote(ID), toLogin);
  await assert.rejects(() => acceptQuote(ID), toLogin);
  await assert.rejects(() => deleteQuote(ID), toLogin);
  assert.equal(fake.ops.length, 0);
});
