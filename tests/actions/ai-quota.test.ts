import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { composeSprint } from "../../app/(app)/missions/sprint-composition-actions.ts";
import { generateMissionPrompt } from "../../app/(app)/missions/prompt-actions.ts";
import { proposeBacklogOrder } from "../../app/(app)/missions/backlog-order-actions.ts";
import { proposeStories } from "../../app/(app)/missions/proposal-actions.ts";
import { proposeTasks } from "../../app/(app)/missions/task-proposal-actions.ts";
import { reviewStory } from "../../app/(app)/missions/story-review-actions.ts";
import { createNote, retryIndexing, updateNote } from "../../app/(app)/notes/actions.ts";
import { searchBySense } from "../../app/(app)/notes/sense-actions.ts";
import { summarizeNote } from "../../app/(app)/notes/summary-actions.ts";
import { indexAllNotes } from "../../app/(app)/parametres/actions.ts";
import { QUOTA_MESSAGES } from "../../lib/domain/ai-quota.ts";
import { fake, form, redirectsTo, routes, toLogin, type Route, withHarness } from "../helpers/harness.ts";

// Audit de sécurité, lot B : chaque point d'entrée de l'IA compte l'appel AVANT de le faire, et refuse sans appeler le modèle quand le plafond est atteint.
withHarness();

const ID = "12121212-1212-4212-8212-121212121212";
const MISSION = "5e5e5e5e-5e5e-45e5-85e5-5e5e5e5e5e5e";
const CLIENT = "2b2b2b2b-2b2b-42b2-82b2-2b2b2b2b2b2b";
const A = "a1a1a1a1-a1a1-41a1-81a1-a1a1a1a1a1a1";
const B = "b2b2b2b2-b2b2-42b2-82b2-b2b2b2b2b2b2";
const SPRINT = "7a7a7a7a-7a7a-47a7-87a7-7a7a7a7a7a7a";

const story = (id: string) => ({ id, title: `Story ${id.slice(0, 2)}`, role: null, benefit: null, acceptance_criteria: null, points: 3, status: "todo", sprint_id: null });
const storyRow = { mission_id: MISSION, source_note_id: null, title: "Relancer", role: "freelance", benefit: "", acceptance_criteria: "", points: null, status: "todo", updated_at: "2026-10-28T10:00:00.000Z", mission: { title: "Suivi", client_id: CLIENT, client: { name: "Atelier" } } };

/** Un point d'entrée de l'IA : ce qu'il faut poser pour qu'il arrive jusqu'à l'appel, et l'appel qu'il fait. */
const entries: { name: string; setup: Route[]; run: () => Promise<{ ok?: boolean; error?: string; message?: string }>; ai: string }[] = [
  { name: "proposeStories", ai: "propose", run: () => proposeStories(MISSION, "Relancer les factures", []), setup: [["missions:select", { data: [{ title: "Suivi", client_id: CLIENT, client: { name: "Atelier" } }] }], ["user_stories:select", { data: [{ title: "Existante" }] }]] },
  { name: "proposeTasks", ai: "tasks", run: () => proposeTasks(A, ""), setup: [["user_stories:select", { data: [{ title: "Relancer", role: "", benefit: "", acceptance_criteria: "", points: 3, source_note_id: null, mission: { title: "Suivi", client_id: CLIENT, client: { name: "Atelier" } } }] }], ["tasks:select", { data: [] }]] },
  { name: "reviewStory", ai: "review", run: () => reviewStory(A, ""), setup: [["user_stories:select", (op) => (op.columns?.startsWith("mission_id") ? { data: [storyRow] } : { data: [{ title: "Autre" }] })]] },
  { name: "composeSprint", ai: "compose", run: () => composeSprint(SPRINT, 8, ""), setup: [["sprints:select", { data: [{ name: "Sprint 1", goal: null, start_date: "2026-11-02", end_date: "2026-11-13", status: "planned", mission_id: MISSION, mission: { title: "Suivi", client: { name: "Atelier" } } }] }], ["user_stories:select", { data: [story(A)] }]] },
  { name: "proposeBacklogOrder", ai: "order", run: () => proposeBacklogOrder(MISSION, ""), setup: [["missions:select", { data: [{ title: "Suivi", client: { name: "Atelier" } }] }], ["user_stories:select", (op) => (op.columns?.startsWith("id, title") ? { data: [story(A), story(B)] } : { data: [] })]] },
  { name: "generateMissionPrompt", ai: "prompt", run: () => generateMissionPrompt(MISSION, { level: "mission", objective: "Automatiser", includeClient: true }), setup: [["missions:select", { data: [{ title: "Suivi", status: "in_progress", start_date: "2026-10-01", end_date: null, client: { name: "Atelier" } }] }]] },
  { name: "summarizeNote", ai: "summary", run: () => summarizeNote(ID), setup: [["notes:select", { data: [{ title: "CR", body: "Texte" }] }]] },
];

describe("plafond d'appels à l'IA : refus avant l'appel", () => {
  for (const e of entries) {
    test(`${e.name} : plafond atteint (minute, jour, compteur en panne) : message adapté, le modèle n'est pas appelé`, async () => {
      for (const q of ["minute", "day", "error"] as const) {
        fake.reset();
        routes(...e.setup);
        fake.quota = q;
        const r = await e.run();
        assert.equal(r.ok, false, q);
        assert.equal(r.error, QUOTA_MESSAGES[q], q);
        assert.equal(fake.ai.calls.filter((c) => c.name === e.ai).length, 0, `${q} : l'IA a été appelée`);
        assert.equal(fake.quotaCalls, 1, q);
      }
    });

    test(`${e.name} : appel permis : le plafond est compté AVANT l'appel au modèle (une seule fois), puis le modèle est appelé`, async () => {
      routes(...e.setup);
      let countedAtCall = -1;
      const reply = { propose: [], tasks: [], review: { remarks: [], story: {} }, compose: { stories: [] }, order: { order: [] }, prompt: "Consigne", summary: "Résumé" }[e.ai as "propose"];
      fake.ai.replies[e.ai] = () => ((countedAtCall = fake.quotaCalls), reply);
      await e.run();
      assert.equal(countedAtCall, 1, "le plafond doit être compté avant l'appel (ni après, ni deux fois)");
      assert.equal(fake.quotaCalls, 1);
      assert.equal(fake.ai.calls.filter((c) => c.name === e.ai).length, 1);
    });

    test(`${e.name} : sans session : connexion, ni plafond consommé ni modèle appelé`, async () => {
      fake.claims = null;
      await assert.rejects(e.run, toLogin);
      assert.equal(fake.quotaCalls, 0);
      assert.equal(fake.ai.calls.length, 0);
    });
  }

  test("une entrée invalide ne consomme pas de plafond (le contrôle vient après la validation)", async () => {
    assert.equal((await proposeStories("x", "texte", [])).ok, false);
    assert.equal((await proposeTasks("x", "")).ok, false);
    assert.equal((await summarizeNote("x")).ok, false);
    assert.equal((await generateMissionPrompt(MISSION, { level: "nope", objective: "", includeClient: true })).ok, false);
    assert.equal((await reviewStory("x", "")).ok, false);
    assert.equal((await composeSprint("x", 8, "")).ok, false);
    assert.equal((await proposeBacklogOrder("x", "")).ok, false);
    assert.equal(fake.quotaCalls, 0);
  });

  test("searchBySense : plafond atteint : aucun résultat, message, ni vectorisation ni recherche", async () => {
    fake.quota = "minute";
    const r = await searchBySense("relance des factures");
    assert.deepEqual([r.results, r.message, r.searched], [[], QUOTA_MESSAGES.minute, undefined]);
    assert.equal(fake.ai.calls.length, 0);
    assert.equal(fake.ops.length, 0);
  });
});

describe("notes : réindexation conditionnelle et plafond", () => {
  const VALID = { title: "Compte rendu", body: "Texte de la note", type: "note", client_id: "", new_name: "", new_origin: "" };
  const existing = (over: Record<string, unknown> = {}): Route[] => [
    ["notes:select", { data: [{ title: "Compte rendu", body: "Texte de la note", index_status: "indexed", ...over }] }],
    ["notes:update", { data: [{ id: ID }] }],
  ];
  const payload = () => fake.on("notes", "update")[0].payload as { index_status?: string };

  test("titre et texte inchangés sur une note déjà indexée : aucun statut remis en attente, aucun appel à Mistral, aucun plafond consommé", async () => {
    routes(...existing());
    await assert.rejects(() => updateNote(ID, {}, form(VALID)), redirectsTo("/notes"));
    assert.equal("index_status" in payload(), false);
    assert.deepEqual(fake.indexed, []);
    assert.equal(fake.quotaCalls, 0);
  });

  test("texte modifié : statut « pending », un plafond consommé, note indexée", async () => {
    routes(...existing({ body: "Ancien texte" }));
    await assert.rejects(() => updateNote(ID, {}, form(VALID)), redirectsTo("/notes"));
    assert.equal(payload().index_status, "pending");
    assert.deepEqual(fake.indexed, [ID]);
    assert.equal(fake.quotaCalls, 1);
  });

  test("titre modifié seul : réindexé aussi (le titre est vectorisé avec chaque extrait)", async () => {
    routes(...existing({ title: "Ancien titre" }));
    await assert.rejects(() => updateNote(ID, {}, form(VALID)), redirectsTo("/notes"));
    assert.deepEqual(fake.indexed, [ID]);
  });

  test("inchangée mais pas encore indexée (en attente ou en échec) : indexée", async () => {
    for (const status of ["pending", "failed"]) {
      fake.reset();
      routes(...existing({ index_status: status }));
      await assert.rejects(() => updateNote(ID, {}, form(VALID)), redirectsTo("/notes"));
      assert.equal(payload().index_status, "pending", status);
      assert.deepEqual(fake.indexed, [ID], status);
    }
  });

  test("plafond atteint à l'enregistrement : la note est enregistrée (en attente), pas indexée, aucune erreur", async () => {
    fake.quota = "minute";
    routes(...existing({ body: "Ancien texte" }));
    await assert.rejects(() => updateNote(ID, {}, form(VALID)), redirectsTo("/notes"));
    assert.equal(payload().index_status, "pending");
    assert.deepEqual(fake.indexed, []);
    fake.reset();
    fake.quota = "day";
    fake.respond = () => ({ data: [{ id: ID }] });
    await assert.rejects(() => createNote({}, form(VALID)), redirectsTo("/notes"));
    assert.equal(fake.on("notes", "insert").length, 1);
    assert.deepEqual(fake.indexed, []);
  });

  test("retryIndexing : plafond atteint : message, rien d'indexé ; sinon un plafond consommé", async () => {
    routes(["notes:select", { data: [{ title: "CR", body: "Texte" }] }]);
    fake.quota = "minute";
    assert.equal((await retryIndexing(ID)).message, QUOTA_MESSAGES.minute);
    fake.quota = "day";
    assert.equal((await retryIndexing(ID)).message, QUOTA_MESSAGES.day);
    fake.quota = "minute";
    assert.deepEqual(fake.indexed, []);
    fake.reset();
    routes(["notes:select", { data: [{ title: "CR", body: "Texte" }] }]);
    assert.deepEqual(await retryIndexing(ID), {});
    assert.equal(fake.quotaCalls, 1);
  });

  const NOTES = ["a", "b", "c"].map((x, n) => ({ id: `00000000-0000-4000-8000-00000000000${n + 1}`, title: `Note ${x}`, body: "Texte", index_status: "pending" }));

  test("indexAllNotes : une unité de plafond par note indexée (pas par clic)", async () => {
    routes(["notes:select", { data: NOTES }]);
    const r = await indexAllNotes();
    assert.deepEqual([r.indexed, r.failed, r.remaining, r.message], [3, 0, 0, undefined]);
    assert.equal(fake.quotaCalls, 3);
    assert.equal(fake.indexed.length, 3);
  });

  test("indexAllNotes : plafond atteint au milieu du lot : on s'arrête, les notes restantes sont comptées, le message du plafond est affiché", async () => {
    routes(["notes:select", { data: NOTES }]);
    fake.quotaQueue = ["ok", "minute"];
    const r = await indexAllNotes();
    assert.deepEqual([r.indexed, r.failed, r.remaining, r.message], [1, 0, 2, QUOTA_MESSAGES.minute]);
    assert.deepEqual(fake.indexed, [NOTES[0].id]);
    assert.equal(fake.quotaCalls, 2, "aucun appel de plus après le refus");
  });

  test("indexAllNotes : plafond atteint d'emblée : rien d'indexé, toutes les notes restent à faire", async () => {
    routes(["notes:select", { data: NOTES }]);
    fake.quota = "day";
    const r = await indexAllNotes();
    assert.deepEqual([r.indexed, r.failed, r.remaining, r.message], [0, 0, 3, QUOTA_MESSAGES.day]);
    assert.deepEqual(fake.indexed, []);
  });
});
