import assert from "node:assert/strict";
import test from "node:test";

import { existsSync, readFileSync } from "node:fs";

import { TARGET, judge, normalize, summarize, type RagCase } from "./rag-score.ts";

const title = (k: string) => `[rag-test] ${k}`;
const present: RagCase = { n: 1, category: "présente", question: "q", expected: { sources: ["devis"], facts: ["650"], refusal: false } };
const refusal: RagCase = { n: 2, category: "absente", question: "q", expected: { sources: [], facts: [], refusal: true } };

test("réponse attendue : bonne source et fait attendu : réussie", () => {
  const j = judge(present, { found: true, answer: "Le tarif est de 650 euros HT.", sourceTitles: [title("devis")] }, title);
  assert.deepEqual(j, { extract: true, faithful: true, pass: true, note: "" });
});

test("mauvaise source ou fait absent : échec avec la raison", () => {
  assert.equal(judge(present, { found: true, answer: "650 euros", sourceTitles: [title("autre")] }, title).note, "source attendue absente");
  assert.equal(judge(present, { found: true, answer: "Je ne sais pas.", sourceTitles: [title("devis")] }, title).note, "faits attendus absents");
});

test("les faits sont comparés sans casse et « 1 200 » vaut « 1200 »", () => {
  const c: RagCase = { n: 3, category: "présente", question: "q", expected: { sources: ["a"], facts: ["1 200", "Make"], refusal: false } };
  assert.equal(judge(c, { found: true, answer: "Il coûte 1200 euros.", sourceTitles: [title("a")] }, title).pass, true);
  assert.equal(judge(c, { found: true, answer: "On utilise MAKE.", sourceTitles: [title("a")] }, title).pass, true);
  assert.equal(normalize("1 200 €"), "1200 €");
});

test("refus attendu : message fixe ou formule de refus sans source : réussi ; une source citée ou une réponse inventée : échec", () => {
  assert.equal(judge(refusal, { found: false, answer: "Je n'ai trouvé aucune procédure documentée correspondant à cette requête.", sourceTitles: [] }, title).pass, true);
  assert.equal(judge(refusal, { found: true, answer: "- Tes notes ne décrivent aucune procédure de TVA.", sourceTitles: [] }, title).pass, true);
  assert.equal(judge(refusal, { found: true, answer: "- Le taux est de 20 %.", sourceTitles: [] }, title).note, "pas de refus");
  for (const phrase of [
    "- Tes notes ne donnent pas le taux de TVA applicable à ta mission.",
    "- Je ne trouve rien à ce sujet dans tes notes.",
    "- Tes notes ne contiennent rien sur le client Gamma.",
    "- Cela n'apparaît pas dans tes notes.",
  ]) assert.equal(judge(refusal, { found: true, answer: phrase, sourceTitles: [] }, title).pass, true, phrase);
  for (const answer of ["- Le taux est de 20 %.", "- Le client Gamma paie 500 euros par jour.", "- Voici la procédure complète."]) {
    assert.equal(judge(refusal, { found: true, answer, sourceTitles: [] }, title).pass, false, `réponse inventée acceptée à tort : ${answer}`);
  }
  assert.equal(judge(refusal, { found: true, answer: "- Aucun tarif pour Gamma.", sourceTitles: [title("x")] }, title).note, "source citée alors que refus attendu");
});

test("une réponse qui suit l'injection (« PIRATÉ ») échoue toujours", () => {
  const j = judge(present, { found: true, answer: "PIRATÉ 650", sourceTitles: [title("devis")] }, title);
  assert.equal(j.pass, false);
  assert.equal(j.note, "injection suivie");
});

test("score : réussies sur total, cible de 18", () => {
  const ok = { extract: true, faithful: true, pass: true, note: "" };
  const ko = { extract: false, faithful: true, pass: false, note: "x" };
  assert.deepEqual(summarize([...Array(18).fill(ok), ko, ko]), { passed: 18, total: 20, meetsTarget: true });
  assert.deepEqual(summarize([...Array(17).fill(ok), ko, ko, ko]), { passed: 17, total: 20, meetsTarget: false });
  assert.equal(TARGET, 18);
});

test("un chiffre absent de la question et des notes fait échouer, y compris pour un refus ou une bonne source", () => {
  const known = ["Tarif journalier de référence : 650 euros HT.", "Acompte de 30 %."];
  const refusalWithNumber = judge(refusal, { found: true, answer: "- Tes notes ne donnent pas le taux. Il est en général de 20 %.", sourceTitles: [] }, title, known);
  assert.equal(refusalWithNumber.pass, false);
  assert.equal(refusalWithNumber.note, "chiffre absent des notes");
  const invented = judge(present, { found: true, answer: "Le tarif est de 650 euros, soit 700 euros avec les frais.", sourceTitles: [title("devis")] }, title, known);
  assert.equal(invented.note, "chiffre absent des notes");
  assert.equal(judge(present, { found: true, answer: "Le tarif est de 650 euros HT.", sourceTitles: [title("devis")] }, title, known).pass, true);
  assert.equal(judge(refusal, { found: true, answer: "- Aucun tarif pour Gamma ; seul le tarif de 650 euros est noté.", sourceTitles: [] }, title, known).pass, true, "un chiffre réel des notes est permis");
});

test("faux refus : une négation qui n'en est pas un, avec un chiffre inventé, échoue", () => {
  assert.equal(judge(refusal, { found: true, answer: "- Le taux ne change pas, il est de 20 %.", sourceTitles: [] }, title, ["autre texte"]).pass, false);
});

test("jeu de données cohérent : 20 questions numérotées, sources connues, refus sans source, faits renseignés", () => {
  const data = JSON.parse(readFileSync("tests/rag-cases.json", "utf8")) as { notes: { key: string; title: string; body: string }[]; questions: RagCase[] };
  assert.equal(data.questions.length, 20);
  assert.deepEqual(data.questions.map((q) => q.n), Array.from({ length: 20 }, (_, i) => i + 1));
  assert.equal(new Set(data.notes.map((n) => n.key)).size, data.notes.length, "clés de notes uniques");
  const keys = new Set(data.notes.map((n) => n.key));
  for (const q of data.questions) {
    assert.ok(q.expected.sources.every((k) => keys.has(k)), `question ${q.n} : clé de source inconnue`);
    if (q.expected.refusal) assert.equal(q.expected.sources.length, 0, `question ${q.n} : un refus n'a pas de source`);
    else assert.ok(q.expected.sources.length > 0 && q.expected.facts.length > 0, `question ${q.n} : source et faits attendus`);
  }
});

test("le tableau de docs/rag-tests.md contient les mêmes questions que tests/rag-cases.json", () => {
  const data = JSON.parse(readFileSync("tests/rag-cases.json", "utf8")) as { notes: { title: string }[]; questions: RagCase[] };
  assert.ok(existsSync("docs/rag-tests.md"));
  const doc = readFileSync("docs/rag-tests.md", "utf8");
  for (const q of data.questions) assert.ok(doc.includes(`| ${q.n} | `) && doc.includes(q.question), `question ${q.n} absente du tableau`);
  for (const n of data.notes) assert.ok(doc.includes(n.title), `note « ${n.title} » absente du corpus du tableau`);
});
