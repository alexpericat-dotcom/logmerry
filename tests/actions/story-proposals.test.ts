import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { proposeStories } from "../../app/(app)/missions/proposal-actions.ts";
import { type Route, errorOf, fake, filterValue, routes, toLogin, withHarness } from "../helpers/harness.ts";

const MISSION = "1a1a1a1a-1a1a-41a1-81a1-1a1a1a1a1a1a";
const CLIENT = "2b2b2b2b-2b2b-42b2-82b2-2b2b2b2b2b2b";
const NOTE = "3c3c3c3c-3c3c-43c3-83c3-3c3c3c3c3c3c";
const FOREIGN = "4d4d4d4d-4d4d-44d4-84d4-4d4d4d4d4d4d";
const PROPOSAL = { title: "Automatiser la relance", role: "freelance", benefit: "être payé à temps", acceptance_criteria: "Un mail part le lendemain", points: 3 };

withHarness();

const mission: Route = ["missions:select", { data: [{ title: "Suivi des factures", client_id: CLIENT, client: { name: "Atelier Lumière" } }] }];
const backlog: Route = ["user_stories:select", { data: [{ title: "Story existante" }] }];
const aiCalls = () => fake.ai.calls.filter((c) => c.name === "propose");

describe("proposeStories", () => {
  test("envoie à l'IA le brief, la mission, la fiche et les titres du backlog ; renvoie les propositions vérifiées ; n'écrit rien", async () => {
    routes(mission, backlog);
    fake.ai.replies.propose = [PROPOSAL];
    const r = await proposeStories(MISSION, "Relancer les factures échues", []);
    assert.equal(r.ok, true);
    assert.deepEqual(r.ok && r.proposals.map((p) => p.title), ["Automatiser la relance"]);
    const [call] = aiCalls();
    for (const sent of ["Relancer les factures échues", "Suivi des factures", "Atelier Lumière", "Story existante"]) assert.ok(call.message.includes(sent), sent);
    assert.equal(call.args[1], false);
    assert.deepEqual(fake.ops.filter((o) => o.op !== "select"), []); // une proposition n'existe qu'à l'écran
  });

  test("notes cochées : seulement celles de la fiche de CETTE mission, actives (la requête filtre sur client_id et statut) ; une note forgée n'arrive pas à l'IA", async () => {
    routes(mission, backlog, ["notes:select", { data: [{ id: NOTE, title: "Compte rendu", body: "Le client veut un export mensuel", created_at: "2026-10-01" }] }]);
    fake.ai.replies.propose = [PROPOSAL];
    await proposeStories(MISSION, "", [NOTE, FOREIGN, "pas-un-uuid"]);
    const [read] = fake.on("notes", "select");
    assert.equal(filterValue(read, "eq", "client_id"), CLIENT);
    assert.equal(filterValue(read, "eq", "status"), "active");
    assert.deepEqual(read.filters.find((f) => f.kind === "in")?.args, ["id", [NOTE, FOREIGN]]); // l'identifiant invalide est écarté avant la requête
    assert.ok(aiCalls()[0].message.includes("Le client veut un export mensuel"));
    assert.ok(!aiCalls()[0].message.includes(FOREIGN)); // l'identifiant forgé n'apparaît nulle part dans ce qui part vers l'IA
  });

  test("rien à envoyer (ni brief ni note exploitable) : message, et l'IA n'est JAMAIS appelée", async () => {
    assert.match(errorOf(await proposeStories(MISSION, "  ", [])), /Colle un brief ou coche au moins une note/);
    assert.equal(fake.ops.length, 0); // le refus vient avant toute requête
    routes(mission, backlog, ["notes:select", { data: [] }]);
    const none = await proposeStories(MISSION, "", [NOTE]);
    assert.match(errorOf(none), /Aucune des notes cochées n'est disponible/);
    routes(mission, backlog, ["notes:select", { data: [{ id: NOTE, title: "Énorme", body: "x".repeat(40_000), created_at: "2026-10-01" }] }]);
    assert.match(errorOf(await proposeStories(MISSION, "", [NOTE])), /volumineuses/);
    assert.equal(aiCalls().length, 0);
  });

  test("un chiffre absent des sources fait écarter la proposition ; un titre déjà au backlog aussi", async () => {
    routes(mission, backlog);
    fake.ai.replies.propose = [PROPOSAL, { ...PROPOSAL, title: "Livrer en 47 jours" }, { ...PROPOSAL, title: "story existante" }];
    const r = await proposeStories(MISSION, "Relancer les factures", []);
    assert.deepEqual(r.ok && [r.proposals.length, r.dropped], [1, 2]);
  });

  test("l'IA ne propose rien d'exploitable : message ; l'IA tombe en panne : échec général, journal sans le brief ni la clé", async (t) => {
    routes(mission, backlog);
    fake.ai.replies.propose = [];
    assert.match(errorOf(await proposeStories(MISSION, "Brief SENTINELLE-BRIEF", [])), /rien proposé d'exploitable/);
    const log = t.mock.method(console, "error", () => {});
    fake.ai.replies.propose = new Error("timeout du modèle");
    const failed = await proposeStories(MISSION, "Brief SENTINELLE-BRIEF", []);
    assert.deepEqual(failed, { ok: false, error: "Proposition impossible pour le moment. Réessaie." });
    assert.deepEqual(log.mock.calls[0].arguments, ["Proposition de backlog impossible :", "timeout du modèle"]);
    assert.ok(!JSON.stringify(log.mock.calls).includes("SENTINELLE"));
  });

  test("avec tâches : seul `true` strict les demande à l'IA", async () => {
    routes(mission, backlog);
    fake.ai.replies.propose = [PROPOSAL];
    await proposeStories(MISSION, "Brief", [], true);
    await proposeStories(MISSION, "Brief", [], "oui" as unknown as boolean);
    assert.deepEqual(aiCalls().map((c) => c.args[1]), [true, false]);
  });

  test("brief trop long, mission disparue ou identifiant invalide : refus, l'IA n'est pas appelée", async () => {
    assert.match(errorOf(await proposeStories(MISSION, "x".repeat(100_000), [])), /trop long/);
    assert.match(errorOf(await proposeStories("x", "Brief", [])), /n'existe plus/);
    assert.match(errorOf(await proposeStories(MISSION, "Brief", [])), /n'existe plus/);
    assert.equal(aiCalls().length, 0);
  });

  test("sans session : redirection vers la connexion, ni requête ni appel à l'IA", async () => {
    fake.claims = null;
    await assert.rejects(() => proposeStories(MISSION, "Brief", []), toLogin);
    assert.equal(fake.ops.length + fake.ai.calls.length, 0);
  });
});
