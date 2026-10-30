import assert from "node:assert/strict";
import test from "node:test";

import * as content from "./portfolio-content.ts";

const texts = JSON.stringify(content);
// « n8n » est un nom d'outil, pas un chiffre ; l'année du pied de page et l'adresse de contact ne sont pas des promesses.
const withoutAllowed = texts.replace(/n8n/gi, "").replace(/\d{4}/g, "").replace(/alexandre\.pericat@gmail\.com/g, "");

test("aucun tarif, montant ni chiffre promis dans les textes publics (formules sans prix)", () => {
  assert.ok(!/[€$£]|\beuros?\b|\bHT\b|\bTTC\b|\d/.test(withoutAllowed), "chiffre ou montant dans les textes");
});

test("aucun « À confirmer » ni marque de brouillon visible du public", () => {
  assert.ok(!/à confirmer|lorem|todo|xxx/i.test(texts));
});

test("vouvoiement : pas de tutoiement dans les textes", () => {
  const visible = JSON.stringify([content.HERO, content.LEVER, content.PROCESS, content.SERVICES, content.SKILLS, content.SHOWCASE, content.CONTACT]);
  assert.ok(!/\b(tu|ton|ta|tes|toi)\b/i.test(visible));
});

test("la chaîne « problème métier → maintenance » de la référence : six étapes dans l'ordre ; cinq formules ; trois points d'appui ; quatre familles d'outils", () => {
  assert.deepEqual(
    content.PROCESS.steps.map((s) => s.title),
    ["Problème métier", "Analyse du processus", "Architecture", "IA, automatisation et données", "Déploiement", "Maintenance"],
  );
  assert.equal(content.SERVICES.items.length, 5);
  assert.equal(content.LEVER.points.length, 3);
  assert.equal(content.SKILLS.groups.length, 4);
  for (const x of [...content.PROCESS.steps, ...content.SERVICES.items, ...content.LEVER.points]) assert.ok(x.title.trim() && x.text.trim());
  for (const g of content.SKILLS.groups) assert.ok(g.title.trim() && g.items.length > 0 && g.items.every((i) => i.trim()), g.title);
});

test("le positionnement oppose l'outil au métier", () => {
  assert.match(content.LEVER.before, /outil/i);
  assert.match(content.LEVER.after, /fonctionnement d'une entreprise/);
});

test("l'adresse de contact est celle donnée par Alex", () => {
  assert.equal(content.CONTACT_EMAIL, "alexandre.pericat@gmail.com");
});
