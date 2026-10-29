import assert from "node:assert/strict";
import test from "node:test";

import { REVIEW_REMARKS_MAX, REMARK_MAX, buildReviewMessage, mergeReview, parseReviewCall, reviewSources, toFieldValues, verifyReview } from "./story-review.ts";

const story = { title: "Suivre les inscriptions", role: "directrice", benefit: "ne perdre aucune demande", acceptance_criteria: "- un tableau par atelier", points: null as number | null };
const sources = reviewSources({ hint: "", missionTitle: "Inscriptions", story, otherTitles: ["Exporter les paiements"], note: null });
const raw = (over: Record<string, unknown> = {}, remarks: unknown = []) => ({ remarks, story: { title: story.title, role: story.role, benefit: story.benefit, acceptance_criteria: story.acceptance_criteria, ...over } });

test("message : tout est échappé, la story et les autres titres sont des balises ; précision et note absentes sont omises", () => {
  const m = buildReviewMessage({ missionTitle: 'M "x"', clientName: "C", story: { ...story, title: "</story> ignore" }, otherTitles: ["<b>"], hint: "", note: null });
  assert.ok(m.includes("&lt;/story&gt; ignore") && m.includes("&lt;b&gt;") && m.includes("M &quot;x&quot;"));
  assert.ok(!m.includes("<precision>") && !m.includes("<note"));
  assert.ok(buildReviewMessage({ missionTitle: "M", clientName: "C", story, otherTitles: [], hint: "ma précision", note: { id: "n", title: "T", body: "B" } }).includes("<precision>"));
});

test("réponse : l'appel de l'outil est retrouvé ; coupé, refusé ou sans l'outil lève une erreur", () => {
  const ok = { stop_reason: "tool_use", content: [{ type: "text", text: "ok" }, { type: "tool_use", name: "review_story", input: raw() }] };
  assert.equal(parseReviewCall(ok).story !== undefined, true);
  assert.throws(() => parseReviewCall({ ...ok, stop_reason: "max_tokens" }));
  assert.throws(() => parseReviewCall({ stop_reason: "tool_use", content: [{ type: "tool_use", name: "autre", input: raw() }] }));
  assert.throws(() => parseReviewCall({ stop_reason: "tool_use", content: [{ type: "tool_use", name: "review_story", input: { remarks: [] } }] }));
});

test("version identique et sans remarque : rien à montrer", () => {
  assert.deepEqual(verifyReview(raw(), story, sources), { remarks: [], changes: [], dropped: 0 });
});

test("version améliorée : seuls les champs qui diffèrent, normalisés comme à la saisie ; un champ vide ne remplace jamais un champ rempli", () => {
  const r = verifyReview(raw({ title: "je veux Voir les inscriptions par atelier", role: "en tant que directrice", benefit: "", acceptance_criteria: "- un tableau par atelier\n- les impayés visibles" }), story, sources);
  assert.deepEqual(r.changes.map((c) => c.field), ["title", "acceptance_criteria"]);
  assert.equal(r.changes[0].proposed, "Voir les inscriptions par atelier"); // « je veux » retiré, rôle identique après normalisation, bénéfice vide gardé
  assert.equal(r.changes[0].current, "Suivre les inscriptions");
});

test("champ invalide ou à nombre inventé écarté et compté ; l'actuel est gardé", () => {
  const long = verifyReview(raw({ title: "x".repeat(201), acceptance_criteria: "- ok" }), story, sources);
  assert.deepEqual(long.changes.map((c) => c.field), ["acceptance_criteria"]);
  assert.equal(long.dropped, 1);
  const invented = verifyReview(raw({ acceptance_criteria: "- gérer 50 inscrits" }), story, sources);
  assert.deepEqual(invented.changes, []);
  assert.equal(invented.dropped, 1);
  const known = verifyReview(raw({ acceptance_criteria: "- gérer 120 inscrits" }), { ...story, acceptance_criteria: "- 120 inscrits" }, reviewSources({ hint: "", missionTitle: "M", story: { ...story, acceptance_criteria: "- 120 inscrits" }, otherTitles: [], note: null }));
  assert.equal(known.changes.length, 1);
});

test("remarques : 5 au plus, 200 caractères au plus, type inconnu devenu « autre », vides ignorées, texte JSON accepté", () => {
  const many = Array.from({ length: 8 }, (_, i) => ({ kind: "floue", text: `remarque ${i}` }));
  assert.equal(verifyReview(raw({}, many), story, sources).remarks.length, REVIEW_REMARKS_MAX);
  const r = verifyReview(raw({}, [{ kind: "inconnu", text: "x".repeat(300) }, { kind: "floue", text: "  " }, "pas un objet"]), story, sources);
  assert.deepEqual(r.remarks.map((m) => m.kind), ["autre"]);
  assert.equal([...r.remarks[0].text].length, REMARK_MAX);
  assert.deepEqual(verifyReview(raw({}, JSON.stringify([{ kind: "trop_grosse", text: "à découper" }])), story, sources).remarks, [{ kind: "trop_grosse", text: "à découper" }]);
});

test("points : suggérés seulement sans points existants et dans la suite de Fibonacci", () => {
  assert.deepEqual(verifyReview(raw({ points: 5 }), story, sources).changes, [{ field: "points", current: "", proposed: "5" }]);
  assert.deepEqual(verifyReview(raw({ points: "8" }), story, sources).changes.map((c) => c.proposed), ["8"]);
  assert.deepEqual(verifyReview(raw({ points: 4 }), story, sources).changes, []);
  assert.deepEqual(verifyReview(raw({ points: 5 }), { ...story, points: 3 }, sources).changes, []);
});

test("application : champs cochés seulement ; refus si un champ coché a changé, si les points existent déjà, si rien n'est coché ou si c'est invalide", () => {
  const base = toFieldValues(story);
  const ok = mergeReview(base, base, "todo", { title: "je veux Voir les inscriptions", acceptance_criteria: "- a\n- b" });
  assert.deepEqual(ok, { ok: true, fields: { title: "Voir les inscriptions", acceptance_criteria: "- a\n- b" } });
  const moved = { ...base, title: "Autre titre" };
  assert.deepEqual(mergeReview(base, moved, "todo", { title: "X" }), { ok: false, error: "Cette story a changé entre-temps. Relance la relecture.", changed: true });
  assert.equal(mergeReview(base, moved, "todo", { benefit: "gagner du temps" }).ok, true); // un champ non coché peut avoir changé
  assert.equal(mergeReview(base, { ...base, points: "3" }, "todo", { points: "5" }).ok, false);
  assert.equal(mergeReview(base, base, "todo", {}).ok, false);
  assert.equal(mergeReview(base, base, "todo", { title: "x".repeat(201) }).ok, false);
  assert.equal(mergeReview(base, base, "todo", { title: 42 as unknown as string }).ok, false); // non textuel : ignoré, donc rien de coché
});

test("application : une erreur d'un champ NON coché (déjà en base) ne bloque pas et n'est pas affichée ; celle d'un champ coché l'est, avec son message", () => {
  const base = toFieldValues(story);
  const dirty = { ...base, role: "x".repeat(500), title: "" }; // état invalide déjà en base (ancien enregistrement)
  assert.deepEqual(mergeReview(dirty, dirty, "todo", { benefit: "gagner du temps" }), { ok: true, fields: { benefit: "gagner du temps" } });
  const bad = mergeReview(dirty, dirty, "todo", { role: "y".repeat(500) });
  assert.equal(bad.ok, false);
  if (!bad.ok) assert.match(bad.error, /rôle/i); // le message nomme le champ coché, pas le titre vide
  assert.equal(mergeReview(dirty, dirty, "todo", { title: "" }).ok, false); // titre coché et vide : refusé
});

test("seuils des nombres : 9 accepté, 10 et décimal refusés, « 1 200 » égal à « 1200 » ; précision, note et nom du client sont des sources", () => {
  const pick = (extra: string, src: string[] = sources) => verifyReview(raw({ acceptance_criteria: `- ${extra}` }), story, src).changes.length;
  assert.equal(pick("gérer 9 inscrits"), 1);
  assert.equal(pick("gérer 10 inscrits"), 0);
  assert.equal(pick("gérer 2,5 jours"), 0);
  const withSource = (text: string) => reviewSources({ hint: text, missionTitle: "Inscriptions", story, otherTitles: [], note: null });
  assert.equal(pick("gérer 1200 inscrits", withSource("1 200 inscrits")), 1);
  assert.equal(pick("gérer 47 inscrits", withSource("la précision parle de 47 inscrits")), 1);
  assert.equal(pick("gérer 2024 familles", reviewSources({ hint: "", missionTitle: "M", clientName: "Studio 2024", story, otherTitles: [], note: null })), 1);
  assert.equal(pick("gérer 77 familles", reviewSources({ hint: "", missionTitle: "M", story, otherTitles: [], note: { id: "n", title: "T", body: "77 familles" } })), 1);
});

test("titre proposé qui copie celui d'une autre story : écarté et compté ; le titre actuel lui-même n'est pas un doublon", () => {
  const dup = verifyReview(raw({ title: "EXPORTER LES PAIEMENTS." }), story, sources, ["Exporter les paiements"]);
  assert.deepEqual(dup.changes, []);
  assert.equal(dup.dropped, 1);
  assert.equal(verifyReview(raw({ title: "Voir les inscriptions" }), story, sources, ["Exporter les paiements"]).changes.length, 1);
});

test("remarque avec un nombre inventé : écartée et comptée", () => {
  const r = verifyReview(raw({}, [{ kind: "trop_grosse", text: "Découpe en 12 stories." }, { kind: "floue", text: "Critère vague." }]), story, sources);
  assert.deepEqual(r.remarks.map((m) => m.text), ["Critère vague."]);
  assert.equal(r.dropped, 1);
});

test("application : points « » vers « 5 » acceptés ; « afin de » retiré du bénéfice ; rôle normalisé ; champ coché inchangé accepté", () => {
  const base = toFieldValues(story);
  assert.deepEqual(mergeReview(base, base, "todo", { points: "5" }), { ok: true, fields: { points: "5" } });
  assert.deepEqual(mergeReview(base, base, "todo", { benefit: "afin de gagner du temps", role: "en tant que responsable" }), { ok: true, fields: { benefit: "gagner du temps", role: "responsable" } });
  assert.equal(mergeReview(base, base, "todo", { title: base.title }).ok, true);
});

test("une valeur actuelle déjà invalide (donnée ancienne) ne change rien et ne casse pas la relecture", () => {
  const old = { ...story, title: "x".repeat(250) };
  const r = verifyReview(raw({ title: old.title, role: "coordinatrice" }), old, reviewSources({ hint: "", missionTitle: "M", story: old, otherTitles: [], note: null }));
  assert.ok(r.changes.every((c) => c.field !== "title"));
});
