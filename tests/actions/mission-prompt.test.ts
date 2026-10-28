import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { generateMissionPrompt } from "../../app/(app)/missions/prompt-actions.ts";
import { type Route, errorOf, fake, routes, toLogin, withHarness, writes } from "../helpers/harness.ts";

const MISSION = "8b8b8b8b-8b8b-48b8-88b8-8b8b8b8b8b8b";
const S1 = "9c9c9c9c-9c9c-49c9-89c9-9c9c9c9c9c9c";

withHarness();

const mission = (title = "Suivi des factures"): Route => ["missions:select", { data: [{ title, status: "in_progress", start_date: "2026-10-01", end_date: null, client: { name: "Atelier Lumière" } }] }];
const backlog: Route[] = [
  ["user_stories:select", { data: [{ id: S1, title: "Relancer Atelier Lumière", role: "freelance", benefit: "", acceptance_criteria: "", points: 3, status: "todo" }] }],
  ["tasks:select", { data: [{ story_id: S1, title: "Écrire le mail", done: false }] }],
];
const aiCalls = () => fake.ai.calls.filter((c) => c.name === "prompt");
const OPTIONS = { level: "mission", objective: "Automatiser les relances", includeClient: true };

describe("generateMissionPrompt", () => {
  test("« la mission seule » : aucun backlog lu ; le contexte part tel quel, la consigne de l'IA est assemblée avec ; rien n'est écrit", async () => {
    routes(mission());
    fake.ai.replies.prompt = "Tu es un assistant No-Code. Pose-moi d'abord tes questions.";
    const r = await generateMissionPrompt(MISSION, OPTIONS);
    assert.equal(r.ok, true);
    assert.ok(r.ok && r.prompt.startsWith("Tu es un assistant No-Code.") && r.prompt.includes("Suivi des factures"));
    assert.equal(fake.on("user_stories").length + fake.on("tasks").length, 0);
    assert.deepEqual(writes(), []);
  });

  test("jamais de note envoyée : aucune lecture de la table des notes, quel que soit le niveau", async () => {
    routes(mission(), ...backlog);
    fake.ai.replies.prompt = "Consigne.";
    await generateMissionPrompt(MISSION, { ...OPTIONS, level: "all" });
    assert.equal(fake.on("notes").length, 0);
    assert.ok(fake.on("tasks", "select")[0].filters.some((f) => f.kind === "in"));
  });

  test("« sans le nom du client » : le nom est retiré PARTOUT (fiche, titre de story, objectif) de ce qui part vers l'IA ; coché, il reste", async () => {
    routes(mission("Mission Atelier Lumière"), ...backlog);
    fake.ai.replies.prompt = "Consigne.";
    await generateMissionPrompt(MISSION, { level: "all", objective: "Relances pour Atelier Lumière", includeClient: false });
    assert.ok(!aiCalls()[0].message.includes("Atelier Lumière"), "le nom du client ne doit pas partir");
    assert.ok(aiCalls()[0].message.includes("le client"));
    fake.reset();
    routes(mission(), ...backlog);
    fake.ai.replies.prompt = "Consigne.";
    await generateMissionPrompt(MISSION, { level: "all", objective: "", includeClient: true });
    assert.ok(aiCalls()[0].message.includes("Atelier Lumière"));
  });

  test("« sans le nom du client » : aussi dans le rôle, le bénéfice, les critères et les tâches, et sous ses variantes (casse, accents)", async () => {
    routes(
      mission("Mission ATELIER LUMIÈRE"),
      ["user_stories:select", { data: [{ id: S1, title: "Story Atelier Lumiere", role: "gérant chez atelier lumière", benefit: "aider Atelier Lumière", acceptance_criteria: "validé par ATELIER LUMIERE", points: 3, status: "todo" }] }],
      ["tasks:select", { data: [{ story_id: S1, title: "Appeler atelier lumière", done: false }] }],
    );
    fake.ai.replies.prompt = "Consigne.";
    await generateMissionPrompt(MISSION, { level: "all", objective: "Pour Atelier LUMIERE", includeClient: false });
    assert.ok(!/atelier\s+lumi[eè]re/i.test(aiCalls()[0].message), "le nom du client, sous aucune forme, ne doit partir");
  });

  test("un chiffre présent dans la mission, l'objectif ou une tâche est gardé (la vérification ne jette pas tout)", async () => {
    routes(mission("Suivi 2026"), backlog[0], ["tasks:select", { data: [{ story_id: S1, title: "Relancer 12 familles", done: false }] }]);
    fake.ai.replies.prompt = "Pour 2026, relance 12 familles puis 3 jours plus tard.";
    assert.equal((await generateMissionPrompt(MISSION, { level: "all", objective: "Viser 3 jours", includeClient: true })).ok, true);
  });

  test("consigne avec un chiffre absent de la mission : refusée ; consigne vide : refusée ; trop longue : refusée", async () => {
    routes(mission());
    fake.ai.replies.prompt = "Prévois 47 relances par jour.";
    assert.match(errorOf(await generateMissionPrompt(MISSION, OPTIONS)), /chiffre absent de ta mission/);
    fake.ai.replies.prompt = "   ";
    assert.match(errorOf(await generateMissionPrompt(MISSION, OPTIONS)), /rien produit d'exploitable/);
    fake.ai.replies.prompt = "x".repeat(50_000);
    assert.match(errorOf(await generateMissionPrompt(MISSION, OPTIONS)), /trop longue/);
  });

  test("l'IA tombe en panne : échec général, journal sans mission, backlog ni objectif", async (t) => {
    routes(mission());
    const log = t.mock.method(console, "error", () => {});
    fake.ai.replies.prompt = new Error("erreur du modèle");
    assert.deepEqual(await generateMissionPrompt(MISSION, { ...OPTIONS, objective: "Objectif SENTINELLE" }), { ok: false, error: "Génération impossible pour le moment. Réessaie." });
    assert.deepEqual(log.mock.calls[0].arguments, ["Génération de prompt impossible :", "erreur du modèle"]);
    assert.ok(!JSON.stringify(log.mock.calls).includes("SENTINELLE") && !JSON.stringify(log.mock.calls).includes("Suivi"));
  });

  test("999 tâches : accepté ; niveau « tout » sans story : aucune lecture de tâches ; erreur de lecture de la mission : échec général", async () => {
    routes(mission(), backlog[0], ["tasks:select", { data: Array.from({ length: 999 }, () => ({ story_id: S1, title: "t", done: false })) }]);
    fake.ai.replies.prompt = "Consigne.";
    assert.equal((await generateMissionPrompt(MISSION, { ...OPTIONS, level: "all" })).ok, true);
    fake.reset();
    routes(mission(), ["user_stories:select", { data: [] }]);
    fake.ai.replies.prompt = "Consigne.";
    assert.equal((await generateMissionPrompt(MISSION, { ...OPTIONS, level: "all" })).ok, true);
    assert.equal(fake.on("tasks").length, 0);
    fake.reset();
    routes(["missions:select", { error: { code: "XX000" } }]);
    assert.match(errorOf(await generateMissionPrompt(MISSION, OPTIONS)), /Génération impossible/);
    assert.equal(aiCalls().length, 0);
  });

  test("backlog de 1 000 tâches ou plus : refus (un compte tronqué fausserait l'avancement) ; statut de story inconnu : échec, jamais « à faire »", async () => {
    routes(mission(), backlog[0], ["tasks:select", { data: Array.from({ length: 1000 }, () => ({ story_id: S1, title: "t", done: false })) }]);
    assert.match(errorOf(await generateMissionPrompt(MISSION, { ...OPTIONS, level: "all" })), /trop de tâches/);
    routes(mission(), ["user_stories:select", { data: [{ id: S1, title: "S", role: null, benefit: null, acceptance_criteria: null, points: null, status: "archivée" }] }]);
    assert.match(errorOf(await generateMissionPrompt(MISSION, { ...OPTIONS, level: "all" })), /Génération impossible/);
    assert.equal(aiCalls().length, 0);
  });

  test("options invalides, mission disparue, identifiant invalide : refus sans appel à l'IA", async () => {
    assert.match(errorOf(await generateMissionPrompt(MISSION, { ...OPTIONS, level: "tout" })), /Choisis le contenu du prompt/);
    assert.ok(errorOf(await generateMissionPrompt(MISSION, { ...OPTIONS, objective: 5 as unknown as string })).length > 0);
    assert.equal(fake.ops.length, 0);
    assert.match(errorOf(await generateMissionPrompt(MISSION, OPTIONS)), /n'existe plus/);
    assert.match(errorOf(await generateMissionPrompt("x", OPTIONS)), /n'existe plus/);
    assert.equal(aiCalls().length, 0);
  });

  test("sans session : redirection vers la connexion, ni requête ni appel à l'IA", async () => {
    fake.claims = null;
    await assert.rejects(() => generateMissionPrompt(MISSION, OPTIONS), toLogin);
    assert.equal(fake.ops.length + fake.ai.calls.length, 0);
  });
});
