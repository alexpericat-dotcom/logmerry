import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

import { TOOL_ICONS, toolIconPath } from "./portfolio-tools.ts";

test("chaque outil avec logo a son fichier, et c'est un simple tracé : ni script, ni lien externe, ni image incorporée, ni style", () => {
  for (const [tool, slug] of Object.entries(TOOL_ICONS)) {
    const file = `public/images/tools/${slug}.svg`;
    assert.ok(existsSync(file), `${tool} : ${file} manquant`);
    const svg = readFileSync(file, "utf8");
    assert.ok(svg.startsWith("<svg") && svg.includes("<path"), `${tool} : pas un tracé`);
    assert.ok(!/<script|\bon\w+\s*=|href\s*=|<image|<foreignObject|<style|<use|javascript:|data:/i.test(svg), `${tool} : contenu actif ou externe`);
    assert.ok(svg.length < 10_000, `${tool} : fichier anormalement lourd`);
  }
});

test("l'adresse d'un logo n'existe que pour un outil connu (pas de clé héritée de Object, pas d'échappement de dossier)", () => {
  assert.equal(toolIconPath("n8n"), "/images/tools/n8n.svg");
  assert.equal(toolIconPath("Supabase"), "/images/tools/supabase.svg");
  for (const unknown of ["toString", "__proto__", "../secret", "Excel", ""]) assert.equal(toolIconPath(unknown), null, unknown);
});

test("les trois outils demandés par Alex ont leur logo : n8n, Supabase, Notion (et PostgreSQL)", () => {
  for (const tool of ["n8n", "Supabase", "Notion", "PostgreSQL"]) assert.ok(toolIconPath(tool), tool);
});

test("le dossier des logos documente leur origine, leur licence et que ce sont des marques de leurs propriétaires", () => {
  const readme = readFileSync("public/images/tools/README.md", "utf8");
  assert.match(readme, /Simple Icons/);
  assert.match(readme, /CC0/);
  assert.match(readme, /marques de leurs propriétaires/);
});

import { VALIDATED_TOOLS } from "./portfolio-content.ts";

test("chaque outil validé a son logo", () => {
  for (const tool of VALIDATED_TOOLS) assert.ok(toolIconPath(tool), tool);
});
