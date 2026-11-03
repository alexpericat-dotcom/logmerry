import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

// Réalisation « Automatisation des inscriptions à des ateliers de formation » (6 novembre 2026). Le script d'insertion est la source de ses textes.
const sql = readFileSync("docs/realisation-ateliers.sql", "utf8");
// Les commentaires du script expliquent les règles : seul le contenu inséré est contrôlé.
const content = sql.split("\n").filter((line) => !line.trimStart().startsWith("--")).join("\n");

test("BLOQUE LA FUSION tant qu'un emplacement « [À COMPLÉTER PAR MOI : ...] » reste dans la réalisation (description, raisons du choix, validation)", () => {
  const left = content.match(/\[À COMPLÉTER PAR MOI[^\]]*\]/g) ?? [];
  assert.deepEqual(left, [], `à remplir par Alex avant de fusionner : ${left.join(" ; ")}`);
});

test("« PostgreSQL » n'est jamais écrit seul : toujours « Baserow (base relationnelle reposant sur PostgreSQL) »", () => {
  const all = content.match(/PostgreSQL/gi) ?? [];
  const sanctioned = content.match(/Baserow, reposant sur PostgreSQL/g) ?? [];
  assert.ok(all.length > 0 && all.length === sanctioned.length, "chaque PostgreSQL suit « Baserow, reposant sur »");
  assert.ok(!/\bpostgres(?!ql)\b/i.test(content));
  assert.ok(!/\b(\w+ ){0,2}PostgreSQL\b/.test(content.replace(/Baserow, reposant sur PostgreSQL/g, "")), "aucune autre mention de PostgreSQL");
});

test("rien n'est affirmé sur des contraintes d'unicité garanties par la base", () => {
  assert.ok(!/uniq|unicit|doublon|duplicate/i.test(content));
});

test("la stack est exactement celle donnée, et la réalisation est créée non publiée, sans accord ni statut", () => {
  assert.match(content, /array\['n8n', 'Baserow', 'Telegram Bot API', 'Gmail API', 'SMS OVH'\]/);
  assert.match(content, /false,\n\s+false,\n\s+false\n/, "stack_is_recommended, client_consent, published : faux");
  assert.ok(!/\bstatus\b/.test(content.split("insert into public.realisations (")[1].split(")")[0]), "le statut n'est pas fourni : il reste à choisir dans l'application");
});
