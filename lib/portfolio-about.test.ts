import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import test from "node:test";

import { ABOUT } from "./portfolio-about.ts";

const texts = JSON.stringify(ABOUT);

test("BLOQUE LA FUSION tant qu'un emplacement « [À COMPLÉTER PAR MOI : ...] » reste sur la page Qui suis-je (brouillon, phrase sport, année de fin, photo)", () => {
  const left = texts.match(/\[À COMPLÉTER PAR MOI[^\]]*\]/g) ?? [];
  assert.deepEqual(left, [], `à remplir par Alex avant de fusionner : ${[...new Set(left)].join(" ; ")}`);
});

test("le bloc sur l'impact est celui d'Alex, mot pour mot, après la phrase sur le sport", () => {
  assert.equal(
    ABOUT.impact,
    "Je me soucie de l'impact de ce que je construis. L'IA consomme de l'énergie et je ne prétends pas le contraire. C'est pourquoi je commence par la solution la plus simple, et je n'ajoute de l'IA que là où elle apporte ce que rien d'autre n'apporte.",
  );
  const page = readFileSync("app/portfolio/qui-suis-je/page.tsx", "utf8");
  assert.ok(page.indexOf("ABOUT.sport") < page.indexOf("ABOUT.impact"));
});

test("parcours : liste ordonnée, au passé, e-commerce sans nom d'employeur ; le dernier poste est terminé", () => {
  assert.deepEqual(ABOUT.path.map((s) => s.period), ["2011–2021", "2021–2024", "2024–2026", "Depuis juin 2026"]);
  assert.equal(ABOUT.pathNote, "Dans l'e-commerce");
  assert.match(readFileSync("app/portfolio/qui-suis-je/page.tsx", "utf8"), /<ol /);
});

test("ni adresse, téléphone ni e-mail en clair ; pas de mot « logistique »", () => {
  const page = readFileSync("app/portfolio/qui-suis-je/page.tsx", "utf8");
  assert.ok(!/@|\+?\d[\d .]{8,}\d/.test(texts), "ni @ ni numéro dans les textes");
  assert.ok(!/mailto:|CONTACT_EMAIL|mailtoHref/.test(page), "le contact ne passe pas par l'adresse");
  assert.ok(!/logisti/i.test(texts));
});

test("le seul chiffre est celui de la frise ; le bouton mène à la section de contact existante, sans formulaire inventé", () => {
  const withoutPath = JSON.stringify({ ...ABOUT, path: [] });
  assert.ok(!/\d/.test(withoutPath), "aucun chiffre hors de la frise");
  assert.equal(ABOUT.cta.label, "Parler de votre problème");
  assert.equal(ABOUT.cta.href, "/portfolio#contact");
});

// Termes d'écoblanchiment interdits dans les pages publiques (4 novembre 2026). Exceptions : liste validée par Alex, vide pour l'instant.
const FORBIDDEN = ["éco-responsable", "écologique", "vert", "durable", "neutre en carbone", "faible empreinte", "green"];
const ALLOWED: string[] = [];
const PUBLIC_FILES = [
  ...readdirSync("lib").filter((f) => /^portfolio-.*\.ts$/.test(f) && !f.endsWith(".test.ts")).map((f) => `lib/${f}`),
  ...readdirSync("components").filter((f) => /^portfolio-.*\.tsx$/.test(f)).map((f) => `components/${f}`),
  "app/portfolio/page.tsx",
  "app/portfolio/qui-suis-je/page.tsx",
];

test("aucun terme d'écoblanchiment dans les pages publiques, et rien d'affirmé sur l'impact environnemental de l'automatisation", () => {
  for (const file of PUBLIC_FILES) {
    let source = readFileSync(file, "utf8");
    for (const ok of ALLOWED) source = source.replaceAll(ok, "");
    for (const term of FORBIDDEN) {
      const pattern = new RegExp(`(?<![\\p{L}-])${term}(?:e|es|s)?(?![\\p{L}-])`, "iu");
      assert.ok(!pattern.test(source), `« ${term} » dans ${file} : ${source.match(new RegExp(`.{0,30}${pattern.source}.{0,30}`, "iu"))?.[0]}`);
    }
  }
  assert.ok(PUBLIC_FILES.includes("lib/portfolio-about.ts"));
});
