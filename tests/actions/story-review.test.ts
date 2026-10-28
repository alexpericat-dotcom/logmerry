import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { applyStoryReview, reviewStory } from "../../app/(app)/missions/story-review-actions.ts";
import { type Route, errorOf, fake, filterValue, routes, toLogin, withHarness, writes } from "../helpers/harness.ts";

const STORY = "1a1a1a1a-1a1a-41a1-81a1-1a1a1a1a1a1a";
const MISSION = "2b2b2b2b-2b2b-42b2-82b2-2b2b2b2b2b2b";
const CLIENT = "3c3c3c3c-3c3c-43c3-83c3-3c3c3c3c3c3c";
const NOTE = "4d4d4d4d-4d4d-44d4-84d4-4d4d4d4d4d4d";
const UPDATED = "2026-10-28T10:00:00.000Z";

withHarness();

const row = (over: Record<string, unknown> = {}) => ({
  mission_id: MISSION, source_note_id: null, title: "Relancer les factures", role: "freelance", benefit: "", acceptance_criteria: "", points: null, status: "todo", updated_at: UPDATED,
  mission: { title: "Suivi des factures", client_id: CLIENT, client: { name: "Atelier Lumière" } }, ...over,
});
const stories = (over: Record<string, unknown> = {}): Route[] => [
  ["user_stories:select", (op) => (op.columns?.startsWith("mission_id") ? { data: [row(over)] } : { data: [{ title: "Autre story" }] })],
];
const aiCalls = () => fake.ai.calls.filter((c) => c.name === "review");

describe("reviewStory", () => {
  test("envoie la story, la mission, la fiche, les autres titres et la précision ; renvoie remarques et champs proposés ; n'écrit rien", async () => {
    routes(...stories());
    fake.ai.replies.review = { remarks: [{ kind: "criteres", text: "Précise les critères" }], story: { benefit: "être payé à temps" } };
    const r = await reviewStory(STORY, "Insiste sur le bénéfice");
    assert.equal(r.ok, true);
    assert.deepEqual(r.ok && r.changes.map((c) => c.field), ["benefit"]);
    const others = fake.on("user_stories", "select").find((o) => o.columns === "title")!;
    assert.equal(filterValue(others, "eq", "mission_id"), MISSION); // les autres stories de CETTE mission seulement
    assert.ok(others.filters.some((f) => f.kind === "neq" && f.args[0] === "id" && f.args[1] === STORY));
    assert.equal(r.ok && r.remarks.length, 1);
    for (const sent of ["Relancer les factures", "Suivi des factures", "Atelier Lumière", "Autre story", "Insiste sur le bénéfice"]) assert.ok(aiCalls()[0].message.includes(sent), sent);
    assert.deepEqual(writes(), []);
  });

  test("note d'origine : envoyée seulement si elle est active et de la fiche du client de la mission ; un lien mort est ignoré", async () => {
    routes(...stories({ source_note_id: NOTE }), ["notes:select", { data: [{ id: NOTE, title: "Compte rendu", body: "Texte SENTINELLE-NOTE", created_at: "2026-10-01" }] }]);
    fake.ai.replies.review = { remarks: [], story: {} };
    await reviewStory(STORY, "");
    const [read] = fake.on("notes", "select");
    assert.equal(filterValue(read, "eq", "client_id"), CLIENT);
    assert.equal(filterValue(read, "eq", "status"), "active");
    assert.deepEqual(read.filters.find((f) => f.kind === "in")?.args, ["id", [NOTE]]); // la note d'origine, pas toutes celles de la fiche
    assert.ok(aiCalls()[0].message.includes("SENTINELLE-NOTE"));
    fake.reset();
    routes(...stories({ source_note_id: NOTE }), ["notes:select", { data: [] }]);
    fake.ai.replies.review = { remarks: [], story: {} };
    await reviewStory(STORY, "");
    assert.ok(!aiCalls()[0].message.includes("SENTINELLE-NOTE"));
  });

  test("sans note d'origine : aucune lecture de notes ; un chiffre présent dans une source est gardé, un chiffre inventé dans un champ proposé écarte le champ", async () => {
    routes(...stories());
    fake.ai.replies.review = { remarks: [{ kind: "autre", text: "Garde les 12 familles" }], story: { benefit: "payé en 47 jours" } };
    const r = await reviewStory(STORY, "Il y a 12 familles à relancer");
    assert.equal(fake.on("notes").length, 0);
    assert.deepEqual(r.ok && [r.remarks.length, r.changes.length, r.dropped], [1, 0, 1]); // « 12 » vient de la précision ; « 47 » n'existe nulle part
  });

  test("un chiffre absent des sources fait écarter la remarque (comptée)", async () => {
    routes(...stories());
    fake.ai.replies.review = { remarks: [{ kind: "autre", text: "Découpe en 47 stories" }, { kind: "autre", text: "Ajoute un critère" }], story: {} };
    const r = await reviewStory(STORY, "");
    assert.deepEqual(r.ok && [r.remarks.length, r.dropped], [1, 1]);
  });

  test("l'IA tombe en panne : échec général ; le journal ne contient ni story, ni note, ni mission, ni fiche, ni précision", async (t) => {
    routes(...stories({ source_note_id: NOTE }), ["notes:select", { data: [{ id: NOTE, title: "CR", body: "Texte SENTINELLE-NOTE", created_at: "2026-10-01" }] }]);
    const log = t.mock.method(console, "error", () => {});
    const warn = t.mock.method(console, "warn", () => {});
    fake.ai.replies.review = new Error("erreur du modèle");
    assert.deepEqual(await reviewStory(STORY, "Précision SENTINELLE"), { ok: false, error: "Relecture impossible pour le moment. Réessaie." });
    assert.deepEqual(log.mock.calls[0].arguments, ["Relecture de story impossible :", "erreur du modèle"]);
    const all = JSON.stringify([...log.mock.calls, ...warn.mock.calls]);
    for (const secret of ["SENTINELLE", "Relancer", "Suivi des factures", "Atelier"]) assert.ok(!all.includes(secret), secret);
  });

  test("story disparue, identifiant ou précision invalides : refus, l'IA n'est pas appelée", async () => {
    assert.match(errorOf(await reviewStory(STORY, "")), /n'existe plus/);
    fake.reset();
    assert.match(errorOf(await reviewStory("x", "")), /n'existe plus/);
    assert.ok(errorOf(await reviewStory(STORY, 42 as unknown as string)).length > 0);
    assert.equal(fake.ops.length + aiCalls().length, 0);
  });
});

describe("applyStoryReview", () => {
  const base = { title: "Relancer les factures", role: "freelance", benefit: "", acceptance_criteria: "", points: "" };
  const current = () => routes(["user_stories:select", { data: [row()] }], ["user_stories:update", { data: [{ id: STORY }] }]);

  test("n'écrit que les champs choisis (jamais statut, position, sprint ni tâches), conditionné à la date de dernière modification lue", async () => {
    current();
    const r = await applyStoryReview(STORY, base, { benefit: "être payé à temps", points: "3" });
    assert.deepEqual(r, { ok: true, applied: ["benefit", "points"] });
    const [op] = fake.on("user_stories", "update");
    assert.deepEqual(op.payload, { benefit: "être payé à temps", points: 3 });
    assert.equal(filterValue(op, "eq", "id"), STORY);
    assert.equal(filterValue(op, "eq", "updated_at"), UPDATED); // une modification arrivée entre la lecture et l'écriture fait refuser
    assert.equal(op.returning, true);
    assert.deepEqual(fake.revalidated, [`/missions/${MISSION}`, "/missions"]);
  });

  test("un champ choisi a changé depuis la relecture (autre onglet), quel que soit le champ : rien n'est écrit", async () => {
    for (const [field, now] of [["role", "consultant"], ["title", "Autre titre"], ["acceptance_criteria", "Un critère"]] as const) {
      fake.reset();
      routes(["user_stories:select", { data: [row({ [field]: now })] }]);
      const r = await applyStoryReview(STORY, base, { [field]: "proposé" });
      assert.deepEqual([field, r.ok, !r.ok && r.gone], [field, false, true]);
      assert.deepEqual(writes(), []);
    }
  });

  test("champ vidé : NULL en base (jamais « » ni 0), les points se convertissent ; titre vide refusé (non écrit)", async () => {
    routes(["user_stories:select", { data: [row({ benefit: "ancien", points: null })] }], ["user_stories:update", { data: [{ id: STORY }] }]);
    await applyStoryReview(STORY, { ...base, benefit: "ancien" }, { benefit: "" });
    assert.deepEqual(fake.on("user_stories", "update")[0].payload, { benefit: null });
    fake.reset();
    routes(["user_stories:select", { data: [row()] }]);
    const r = await applyStoryReview(STORY, base, { title: "  " });
    assert.deepEqual([r.ok, !r.ok && !r.gone], [false, true]); // refus de valeur : l'écran ne se recharge pas
    assert.deepEqual(writes(), []);
  });

  test("la ligne a bougé entre la lecture et l'écriture (aucune ligne touchée) : « a changé entre-temps », rien de revalidé", async () => {
    routes(["user_stories:select", { data: [row()] }], ["user_stories:update", { data: [] }]);
    assert.match(errorOf(await applyStoryReview(STORY, base, { benefit: "x" })), /a changé entre-temps/);
    assert.deepEqual(fake.revalidated, []);
  });

  test("aucun champ coché, base incomplète, valeur invalide, story disparue, identifiant invalide : refus sans écriture", async () => {
    current();
    assert.match(errorOf(await applyStoryReview(STORY, base, {})), /Coche au moins un champ/);
    assert.match(errorOf(await applyStoryReview(STORY, {} as typeof base, { benefit: "x" })), /Relance la relecture/);
    const badPoints = await applyStoryReview(STORY, base, { points: "4" }); // 4 n'est pas une valeur de points
    assert.deepEqual([badPoints.ok, !badPoints.ok && badPoints.gone, errorOf(badPoints).includes("points")], [false, undefined, true]);
    routes();
    assert.match(errorOf(await applyStoryReview(STORY, base, { benefit: "x" })), /n'existe plus/);
    assert.match(errorOf(await applyStoryReview("x", base, { benefit: "x" })), /n'existe plus/);
    assert.deepEqual(writes(), []);
  });

  test("erreur de la base (lecture, écriture) ou statut de story inconnu : échec sans plantage ; sans session : redirection", async () => {
    routes(["user_stories:select", { error: { code: "XX000" } }]);
    assert.match(errorOf(await applyStoryReview(STORY, base, { benefit: "x" })), /Enregistrement impossible/);
    routes(["user_stories:select", { data: [row()] }], ["user_stories:update", { error: { code: "XX000" } }]);
    assert.match(errorOf(await applyStoryReview(STORY, base, { benefit: "x" })), /Enregistrement impossible/);
    routes(["user_stories:select", { data: [row({ status: "archivée" })] }]);
    assert.match(errorOf(await applyStoryReview(STORY, base, { benefit: "x" })), /Relecture impossible/);
    assert.deepEqual(writes(), ["user_stories:update"]); // seule l'écriture en erreur de ci-dessus a été tentée
    fake.reset();
    fake.claims = null;
    await assert.rejects(() => applyStoryReview(STORY, base, { benefit: "x" }), toLogin);
    await assert.rejects(() => reviewStory(STORY, ""), toLogin);
    assert.equal(fake.ops.length + fake.ai.calls.length, 0);
  });
});
