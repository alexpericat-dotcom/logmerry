/**
 * Mesure de la qualité de l'assistant sur le jeu de questions (story 8.14) : npm run test:rag
 *   npm run test:rag -- --record "commentaire"   ajoute une ligne datée au tableau des résultats de docs/rag-tests.md
 *
 * Crée le corpus de notes fictives de tests/rag-cases.json pour « démo A » (et une note que seul « démo B » possède,
 * pour le piège inter-comptes), les fait indexer par le vrai chemin (Mistral), pose chaque question au vrai assistant
 * (mêmes fonctions que la route : recherche hybride, Claude, vérification des citations), note chaque question (extrait
 * retrouvé ? réponse fidèle ?), affiche le score sur 20 par rapport à la cible de 18, puis supprime tout.
 * Même garde-fous que tests/isolation.test.ts : clé publique, comptes @example.com seulement. Les notes gardent leur titre
 * exact, sans préfixe (un préfixe de test fausserait les similarités) : le nettoyage supprime, dans ces comptes fictifs
 * seulement, les notes dont le titre est exactement celui d'une note du jeu.
 * Code de sortie 1 si le score est sous la cible ou si un extrait de l'autre compte est reçu.
 * Hors de `npm test` (réseau, identifiants, clés Mistral et Anthropic dans .env.local).
 */
import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";

import { signInTestAccount } from "./helpers/accounts.ts";

import { indexNote } from "@/app/(app)/notes/indexing";
import { askClaude } from "@/lib/ai/chat";
import { retrieveChunks } from "@/lib/db/retrieval";
import { answerQuestion } from "@/lib/domain/chat-flow";
import { MATCH_THRESHOLD } from "@/lib/domain/matching";
import { TARGET, judge, summarize, type Judgement, type RagCase } from "@/lib/domain/rag-score";

const RESULTS_FILE = "docs/rag-tests.md";
const PLACEHOLDER = "| (à remplir à la story 8.14)";

function env(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Variable manquante : ${name} (voir .env.local et .env.test.local)`);
  return value;
}

const signIn = async (who: "A" | "B") => (await signInTestAccount(who)).client;

type Corpus = { notes: { key: string; type: string; title: string; body: string }[]; questions: RagCase[] };
const corpus = JSON.parse(readFileSync("tests/rag-cases.json", "utf8")) as Corpus;

// Note que seul « démo B » possède : la question du piège inter-comptes (« tarif de Mme Dupont ») ne doit rien en recevoir.
const DUPONT = { title: "Tarif de Mme Dupont", body: "Mme Dupont paie un forfait de 900 euros par mois pour son accompagnement." };

// Mesures de latence et de jetons (livrable « rapport d'évaluation ») : un `fetch` enveloppé, SEULEMENT dans ce script, lit le temps et l'usage renvoyés par Mistral et
// Claude. Le code de l'application n'est pas touché. Phase « indexation » (embeddings des notes) puis « questions » (recherche, Claude).
type Phase = "indexation" | "questions";
let phase: Phase = "indexation";
const metrics = {
  claude: [] as { ms: number; input: number; output: number }[],
  mistral: { indexation: { calls: 0, tokens: 0 }, questions: { calls: 0, tokens: 0 } },
  perQuestionMs: [] as number[],
};
const realFetch = globalThis.fetch;
globalThis.fetch = async (input, init) => {
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  const t0 = performance.now();
  const res = await realFetch(input, init);
  const ms = performance.now() - t0;
  try {
    if (url.startsWith("https://api.anthropic.com/")) {
      const u = ((await res.clone().json()) as { usage?: { input_tokens?: number; output_tokens?: number } }).usage;
      metrics.claude.push({ ms, input: u?.input_tokens ?? 0, output: u?.output_tokens ?? 0 });
    } else if (url.startsWith("https://api.mistral.ai/")) {
      const u = ((await res.clone().json()) as { usage?: { total_tokens?: number; prompt_tokens?: number } }).usage;
      metrics.mistral[phase].calls++;
      metrics.mistral[phase].tokens += u?.total_tokens ?? u?.prompt_tokens ?? 0;
    }
  } catch {
    // Une mesure manquée ne doit jamais faire échouer le test.
  }
  return res;
};

const a = await signIn("A");
const b = await signIn("B");
// Les notes créées par le script : identifiants retenus (par compte), pour ne supprimer que celles-là.
const created: { A: string[]; B: string[] } = { A: [], B: [] };
const TITLES = [...corpus.notes.map((n) => n.title), DUPONT.title];
const BODIES = new Map<string, string>([...corpus.notes.map((n) => [n.title, n.body] as [string, string]), [DUPONT.title, DUPONT.body]]);

/** Reste d'une exécution interrompue : seules les notes de même titre ET de même texte que le jeu sont supprimées ; une note différente arrête le script. */
async function removeLeftovers() {
  for (const c of [a, b]) {
    const { data, error } = await c.from("notes").select("id, title, body").in("title", TITLES);
    assert.ifError(error);
    const foreign = (data ?? []).filter((n) => BODIES.get(n.title) !== n.body);
    if (foreign.length) throw new Error(`Une note de même titre mais de texte différent existe (« ${foreign[0].title} ») : le script ne la supprime pas. Renomme-la ou supprime-la, puis relance.`);
    if (data?.length) assert.ifError((await c.from("notes").delete().in("id", data.map((n) => n.id))).error);
  }
}

async function cleanup() {
  for (const [who, c] of [["A", a], ["B", b]] as const) {
    if (!created[who].length) continue;
    const { error } = await c.from("notes").delete().in("id", created[who]);
    if (error) console.error(`NETTOYAGE INCOMPLET (compte ${who}) : ${error.message}`);
  }
}

const titleOf = (key: string) => corpus.notes.find((n) => n.key === key)!.title;
const rows: string[] = [];
const judgements: Judgement[] = [];
let leaks = 0;
let errors = 0;
const knownTexts = corpus.notes.flatMap((n) => [n.title, n.body]);

try {
  await removeLeftovers();
  for (const n of corpus.notes) {
    const title = n.title;
    const { data, error } = await a.from("notes").insert({ title, body: n.body, type: n.type }).select("id").single();
    assert.ifError(error);
    created.A.push(data!.id);
    assert.equal(await indexNote(a, data!.id, { title, body: n.body }), "indexed", `indexation de « ${n.title} » échouée`);
  }
  const noteB = await b.from("notes").insert({ title: DUPONT.title, body: DUPONT.body }).select("id").single();
  assert.ifError(noteB.error);
  created.B.push(noteB.data!.id);
  assert.equal(await indexNote(b, noteB.data!.id, DUPONT), "indexed");

  phase = "questions";
  for (const c of corpus.questions) {
    let j: Judgement;
    const q0 = performance.now();
    try {
      const r = await answerQuestion(c.question, { retrieve: (q) => retrieveChunks(a, q), ask: askClaude });
      const titles = r.sources.map((s) => s.title);
      j = judge(c, { found: r.found, answer: r.answer, sourceTitles: titles }, titleOf, knownTexts);
      // Fuite : une source qui n'est pas une de mes notes (donc la note de B), ou le fait de B (900 euros) dans la réponse de A.
      // Le nom « Dupont » seul n'en est pas une : il vient de la question, que l'assistant a le droit de répéter.
      const mine = new Set(created.A);
      const leak = r.sources.some((s) => !mine.has(s.noteId))
        ? "source qui n'est pas une note du compte"
        : /\b900\b|neuf cents/i.test(r.answer)
          ? "montant de l'autre compte"
          : null;
      if (leak) {
        leaks++;
        j = { ...j, pass: false, note: `FUITE : ${leak}` };
      }
    } catch (e) {
      // Une erreur d'infrastructure (réseau, quota, clé) n'est pas un échec de qualité : comptée à part.
      errors++;
      j = { extract: false, faithful: false, pass: false, note: `ERREUR (pas un échec de qualité) : ${e instanceof Error ? e.message.slice(0, 120) : "inconnue"}` };
    }
    metrics.perQuestionMs.push(performance.now() - q0);
    judgements.push(j);
    rows.push(`${String(c.n).padStart(2)} ${j.pass ? "OK   " : "ÉCHEC"} ${c.question.slice(0, 56).padEnd(56)}${j.note ? `  → ${j.note}` : ""}`);
  }
} finally {
  await cleanup();
}

const { passed, total, meetsTarget } = summarize(judgements);
const model = env("AI_CHAT_MODEL");
console.log(rows.join("\n"));
console.log(`\nSCORE ${passed}/${total} (cible ${TARGET}/20) | seuil de similarité ${MATCH_THRESHOLD} | modèle ${model} | fuites ${leaks} | erreurs ${errors}`);

const sorted = [...metrics.perQuestionMs].sort((x, y) => x - y);
const pct = (p: number) => sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))] ?? 0;
const sum = (xs: number[]) => xs.reduce((x, y) => x + y, 0);
const claudeIn = sum(metrics.claude.map((m) => m.input));
const claudeOut = sum(metrics.claude.map((m) => m.output));
console.log(
  `MESURES | latence par question (recherche + Claude) : moyenne ${Math.round(sum(sorted) / (sorted.length || 1))} ms, médiane ${Math.round(pct(0.5))} ms, 95e centile ${Math.round(pct(0.95))} ms, max ${Math.round(sorted.at(-1) ?? 0)} ms` +
    ` | Claude : ${metrics.claude.length} appels, ${claudeIn} jetons en entrée, ${claudeOut} jetons en sortie, ${Math.round(sum(metrics.claude.map((m) => m.ms)) / (metrics.claude.length || 1))} ms par appel` +
    ` | Mistral embed : indexation ${metrics.mistral.indexation.calls} appels, ${metrics.mistral.indexation.tokens} jetons ; questions ${metrics.mistral.questions.calls} appels, ${metrics.mistral.questions.tokens} jetons`,
);

const i = process.argv.indexOf("--record");
if (i !== -1 && errors > 0) {
  console.error("Exécution NON enregistrée : des questions ont échoué pour une raison d'infrastructure, le score ne mesure pas la qualité.");
} else if (i !== -1) {
  const comment = (process.argv[i + 1] ?? "").replace(/\s+/g, " ").replace(/\|/g, "/").trim();
  if (!comment) console.error("Attention : --record sans commentaire ; la ligne est ajoutée avec un commentaire vide.");
  const date = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Paris" });
  const failed = judgements.map((j, k) => (j.pass ? null : corpus.questions[k].n)).filter((n) => n !== null);
  const row = `| ${date} | ${passed} sur ${total} | ${String(MATCH_THRESHOLD).replace(".", ",")} | \`${model}\` | ${comment}${failed.length ? ` Échecs : n° ${failed.join(", ")}.` : " Aucun échec."} |`;
  const doc = readFileSync(RESULTS_FILE, "utf8");
  assert.ok(doc.includes(PLACEHOLDER), `ligne repère introuvable dans ${RESULTS_FILE}`);
  writeFileSync(RESULTS_FILE, doc.replace(PLACEHOLDER, () => `${row}\n${PLACEHOLDER}`)); // fonction : le texte du commentaire n'est jamais interprété par `replace`
  console.log(`Ligne ajoutée à ${RESULTS_FILE}.`);
}

// Code 1 : fuite ou score sous la cible ; code 2 : erreurs d'infrastructure. `exitCode` (pas `process.exit`) pour ne pas tronquer la sortie.
process.exitCode = leaks > 0 || (errors === 0 && !meetsTarget) ? 1 : errors > 0 ? 2 : 0;
