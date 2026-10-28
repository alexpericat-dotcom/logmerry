import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { proposeTasks } from "../../app/(app)/missions/task-proposal-actions.ts";
import { type Route, errorOf, fake, filterValue, routes, toLogin, withHarness, writes } from "../helpers/harness.ts";

const STORY = "5e5e5e5e-5e5e-45e5-85e5-5e5e5e5e5e5e";
const CLIENT = "6f6f6f6f-6f6f-46f6-86f6-6f6f6f6f6f6f";
const NOTE = "7a7a7a7a-7a7a-47a7-87a7-7a7a7a7a7a7a";

withHarness();

const story = (over: Record<string, unknown> = {}) => ({ title: "Relancer les factures", role: "freelance", benefit: "être payé", acceptance_criteria: "", points: 3, source_note_id: null, mission: { title: "Suivi", client_id: CLIENT, client: { name: "Atelier Lumière" } }, ...over });
const base = (over: Record<string, unknown> = {}, tasks: string[] = ["Écrire le modèle de mail"]): Route[] => [
  ["user_stories:select", { data: [story(over)] }],
  ["tasks:select", { data: tasks.map((title) => ({ title })) }],
];
const aiCalls = () => fake.ai.calls.filter((c) => c.name === "tasks");

describe("proposeTasks", () => {
  test("envoie la story, les tâches déjà présentes et la précision ; renvoie les nouvelles tâches ; n'écrit rien", async () => {
    routes(...base());
    fake.ai.replies.tasks = ["Programmer l'envoi", { title: "Tester sur une facture" }];
    const r = await proposeTasks(STORY, "Prévoir un test");
    assert.deepEqual(r.ok && r.tasks, ["Programmer l'envoi", "Tester sur une facture"]);
    for (const sent of ["Relancer les factures", "Suivi", "Atelier Lumière", "Écrire le modèle de mail", "Prévoir un test"]) assert.ok(aiCalls()[0].message.includes(sent), sent);
    assert.equal(filterValue(fake.on("tasks", "select")[0], "eq", "story_id"), STORY); // les tâches de CETTE story
    assert.equal(fake.on("notes").length, 0); // pas de note d'origine : aucune lecture de notes
    assert.deepEqual(writes(), []);
  });

  test("doublon d'une tâche existante ou chiffre inventé : écartés et comptés ; si tout est écarté, le message dit pourquoi", async () => {
    routes(...base());
    fake.ai.replies.tasks = ["écrire le modèle de mail !", "Relancer 47 familles", "Nouvelle tâche"];
    const some = await proposeTasks(STORY, "");
    assert.deepEqual(some.ok && [some.tasks, some.duplicates, some.dropped], [["Nouvelle tâche"], 1, 1]);
    fake.ai.replies.tasks = ["Relancer 12 familles", "Nouvelle tâche", "Nouvelle tâche !", "   ", 42];
    const kept = await proposeTasks(STORY, "Il y a 12 familles"); // « 12 » vient de la précision : gardé ; doublon interne, vide et non-texte : écartés
    assert.deepEqual(kept.ok && [kept.tasks, kept.duplicates, kept.dropped], [["Relancer 12 familles", "Nouvelle tâche"], 1, 2]);
    fake.ai.replies.tasks = ["écrire le modèle de mail", "Relancer 47 familles"];
    assert.match(errorOf(await proposeTasks(STORY, "")), /1 déjà dans la liste, 1 invalide ou avec un chiffre absent de tes sources/);
  });

  test("note d'origine : seulement si elle est active et de la fiche du client de la mission", async () => {
    routes(...base({ source_note_id: NOTE }), ["notes:select", { data: [{ id: NOTE, title: "CR", body: "Détail SENTINELLE-NOTE", created_at: "2026-10-01" }] }]);
    fake.ai.replies.tasks = ["Autre tâche"];
    await proposeTasks(STORY, "");
    const [read] = fake.on("notes", "select");
    assert.equal(filterValue(read, "eq", "client_id"), CLIENT);
    assert.equal(filterValue(read, "eq", "status"), "active");
    assert.ok(aiCalls()[0].message.includes("SENTINELLE-NOTE"));
    assert.deepEqual(read.filters.find((f) => f.kind === "in")?.args, ["id", [NOTE]]);
    fake.reset();
    routes(...base({ source_note_id: NOTE }), ["notes:select", { data: [] }]); // lien mort : ignoré
    fake.ai.replies.tasks = ["Autre tâche"];
    assert.equal((await proposeTasks(STORY, "")).ok, true);
    assert.ok(!aiCalls()[0].message.includes("SENTINELLE-NOTE"));
  });

  test("l'IA tombe en panne : échec général, journal sans contenu ; story disparue, identifiant ou précision invalides : l'IA n'est pas appelée", async (t) => {
    routes(...base());
    const log = t.mock.method(console, "error", () => {});
    fake.ai.replies.tasks = new Error("erreur du modèle");
    assert.deepEqual(await proposeTasks(STORY, "Précision SENTINELLE"), { ok: false, error: "Proposition impossible pour le moment. Réessaie." });
    assert.deepEqual(log.mock.calls[0].arguments, ["Proposition de tâches impossible :", "erreur du modèle"]);
    assert.ok(!JSON.stringify(log.mock.calls).includes("SENTINELLE"));
    fake.reset();
    assert.match(errorOf(await proposeTasks(STORY, "")), /n'existe plus/);
    assert.match(errorOf(await proposeTasks("x", "")), /n'existe plus/);
    assert.ok(errorOf(await proposeTasks(STORY, 42 as unknown as string)).length > 0);
    assert.equal(aiCalls().length, 0);
  });

  test("sans session : redirection vers la connexion, ni requête ni appel à l'IA", async () => {
    fake.claims = null;
    await assert.rejects(() => proposeTasks(STORY, ""), toLogin);
    assert.equal(fake.ops.length + fake.ai.calls.length, 0);
  });
});
