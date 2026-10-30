import assert from "node:assert/strict";
import test from "node:test";

import * as content from "./portfolio-content.ts";

const year = String(new Date().getFullYear());
const texts = JSON.stringify(content);
// Seuls sont retirés : l'année du pied de page, l'adresse de contact et le nom d'outil « n8n ». Tout autre chiffre est une promesse.
const promises = texts.replaceAll(year, "").replace(/alexandre\.pericat@gmail\.com/g, "").replace(/\bn8n\b/gi, "");

test("aucun chiffre, tarif ni mot de prix dans les textes publics (formules sans prix)", () => {
  assert.ok(!/\d/.test(promises), `chiffre dans : ${promises.match(/.{20}\d.{20}/)?.[0]}`);
  assert.ok(!/[€$£]|\beuros?\b|\bHT\b|\bTTC\b|gratuit|devis|tarif|prix|forfait/i.test(promises));
});

test("aucun « À confirmer » ni marque de brouillon visible du public", () => {
  assert.ok(!/à confirmer|lorem|todo|xxx/i.test(texts));
});

test("vouvoiement : aucune forme de tutoiement dans TOUT le contenu (titre, description, pied de page, objet du courriel compris)", () => {
  // `\b` de JavaScript ne connaît pas les lettres accentuées (« coûte » contiendrait « te ») : bornes Unicode explicites.
  const tutoiement = /(?<![\p{L}'])(tu|te|toi|ton|ta|tes|tien|tiens|tienne|tiennes)(?![\p{L}])|(?<![\p{L}])[tT]'(?=\p{L})/u;
  assert.ok(!tutoiement.test(texts), texts.match(new RegExp(`.{15}${tutoiement.source}.{15}`, "u"))?.[0]);
  assert.ok(tutoiement.test("Je t'aide"), "le motif détecte bien « t'aide »");
  assert.ok(tutoiement.test("tu peux"), "le motif détecte bien « tu »");
  assert.ok(!tutoiement.test("la tâche qui coûte le plus, et votre équipe"), "pas de faux positif sur « coûte » ni « tâche »");
});

test("la chaîne « problème métier → maintenance » de la référence : six étapes dans l'ordre", () => {
  assert.deepEqual(
    content.PROCESS.steps.map((s) => s.title),
    ["Problème métier", "Analyse du processus", "Architecture", "IA, automatisation et données", "Déploiement", "Maintenance"],
  );
});

test("contenu validé par Alex, figé : positionnement, cinq formules, quatre familles d'outils et leurs outils", () => {
  assert.equal(content.LEVER.title, "L'outil vient après le problème.");
  assert.deepEqual(content.LEVER.points.map((p) => p.title), ["Le métier d'abord", "Une IA qui rend des comptes", "Vos données restent les vôtres"]);
  assert.deepEqual(content.SERVICES.items.map((s) => s.title), ["Audit et cadrage", "Automatisation", "Application et données sur mesure", "Assistant IA sur vos documents", "Maintenance et évolution"]);
  assert.deepEqual(content.SKILLS.groups, [
    { title: "Automatisation et intégration", items: ["n8n", "API", "Webhooks", "JSON", "OAuth"] },
    { title: "Données", items: ["Supabase", "PostgreSQL", "Baserow", "Airtable"] },
    { title: "Intelligence artificielle", items: ["API Claude, OpenAI, Gemini", "RAG", "Agents IA"] },
    { title: "Cadrage et fiabilité", items: ["Architecture", "Sécurité", "RGPD", "Gestion de projet", "Compréhension métier"] },
  ]);
  for (const x of [...content.PROCESS.steps, ...content.SERVICES.items, ...content.LEVER.points]) assert.ok(x.title.trim() && x.text.trim());
});

test("le positionnement oppose l'outil au métier", () => {
  assert.match(content.LEVER.before, /outil/i);
  assert.match(content.LEVER.after, /fonctionnement d'une entreprise/);
});

test("contact : l'adresse donnée par Alex et un objet de courriel défini", () => {
  assert.equal(content.CONTACT_EMAIL, "alexandre.pericat@gmail.com");
  assert.ok(content.CONTACT_SUBJECT.trim());
});
