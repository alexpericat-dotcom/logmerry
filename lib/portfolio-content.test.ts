import assert from "node:assert/strict";
import test from "node:test";

import * as content from "./portfolio-content.ts";

const year = String(new Date().getFullYear());
const texts = JSON.stringify(content);
// Seuls sont retirés : l'année du pied de page, l'adresse de contact, le nom d'outil « n8n » et l'année de la source de la citation. Tout autre chiffre est une promesse.
const promises = texts.replaceAll(year, "").replace(/alexandre\.pericat@gmail\.com/g, "").replace(/\bn8n\b/gi, "").replace("Wherever You Go, There You Are, 1994", "");

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

test("contenu validé par Alex, figé : positionnement et cinq formules", () => {
  assert.equal(content.LEVER.title, "L'outil vient après le problème.");
  assert.deepEqual(content.LEVER.points.map((p) => p.title), ["Le métier d'abord", "Une IA qui rend des comptes", "Vos données restent les vôtres"]);
  assert.deepEqual(content.SERVICES.items.map((s) => s.title), ["Audit et cadrage", "Automatisation", "Application et données sur mesure", "Assistant IA sur vos documents", "Maintenance et évolution"]);
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

test("le choix de la stack est présenté comme sur mesure, jamais comme une liste imposée", () => {
  assert.match(content.PROCESS.steps[2].text, /stack technique sur mesure/);
  assert.match(content.STACK.intro, /stack technique choisie sur mesure/);
});

test("« Sous le capot » : front, back, base de données, hébergement (VPS, auto-hébergement) et RGPD", () => {
  assert.deepEqual(content.STACK.layers.map((l) => l.title), ["Front", "Back", "Base de données", "Hébergement et auto-hébergement", "Données personnelles et RGPD"]);
  const all = JSON.stringify(content.STACK);
  for (const word of ["VPS", "auto-hébergé", "PostgreSQL", "Supabase", "RGPD"]) assert.ok(all.includes(word), word);
  // Aucune promesse juridique : on parle de conception attentive, jamais de « conforme » ni de garantie.
  assert.ok(!/conforme|certifi|garanti|100 ?%/i.test(all));
});

test("hero : texte d'Alex, mot pour mot (3 novembre 2026)", () => {
  assert.equal(content.HERO.eyebrow, "Automatisation & IA pour les entreprises");
  assert.equal(content.HERO.title, "Laissez la vague faire le travail.");
  assert.equal(content.HERO.lead, "La puissance est déjà là : le no-code et l'IA. Je la mets au service de vos processus, pour que vos équipes retrouvent du temps pour ce qui compte.");
  assert.equal(content.HERO.primary, "Voir les réalisations");
  assert.equal(content.HERO.secondary, "Parler de votre problème");
  assert.ok(content.HERO.imageAlt.trim(), "la photo a un texte alternatif");
});

test("épigraphe : la citation donnée par Alex, traduite et attribuée (auteur, ouvrage, année)", () => {
  assert.deepEqual(content.PROCESS.epigraph, { text: "On n'arrête pas les vagues, mais on peut apprendre à surfer.", author: "Jon Kabat-Zinn", source: "Wherever You Go, There You Are, 1994" });
});

test("outils : seuls ceux validés par Alex (30 octobre 2026), sans notation ni étoile ; chaque outil cité sur la page est dans la liste", () => {
  assert.deepEqual(content.VALIDATED_TOOLS, ["n8n", "Supabase", "PostgreSQL", "Baserow", "Airtable", "OpenAI", "Claude", "Gemini"]);
  for (const layer of content.STACK.layers) for (const tool of layer.tools) assert.ok(content.VALIDATED_TOOLS.includes(tool), `outil non validé : ${tool}`);
  assert.ok(!/[★☆⭐]|étoile|\/5\b|note :/i.test(texts));
});
