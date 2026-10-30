/**
 * Garde-fous de sécurité vérifiés à chaque `npm test` et en CI, sans base ni clé (audit du 30 octobre 2026, lot C) : ils lisent les migrations et le code.
 * Ils ne remplacent pas `test:isolation` (qui prouve le comportement réel de la base) : ils attrapent l'oubli avant qu'il n'arrive en production.
 */
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { describe, test } from "node:test";

const ROOT = new URL("../", import.meta.url);
const read = (path: string) => readFileSync(new URL(path, ROOT), "utf8");

/** Toutes les migrations, dans l'ordre, sans les commentaires. */
const sql = readdirSync(new URL("supabase/migrations/", ROOT))
  .filter((f) => f.endsWith(".sql"))
  .sort()
  .map((f) => read(`supabase/migrations/${f}`).replace(/--.*$/gm, ""))
  .join("\n");

/** Fichiers de code (hors tests) sous ces dossiers. */
function codeFiles(dirs: string[], extra: string[] = []): string[] {
  const out = [...extra];
  for (const dir of dirs) {
    for (const f of readdirSync(new URL(dir, ROOT), { recursive: true }) as string[]) {
      if (/\.(ts|tsx|mjs|js)$/.test(f) && !/\.test\.(ts|tsx)$/.test(f) && !f.includes("node_modules")) out.push(`${dir}${f}`);
    }
  }
  return out;
}

describe("migrations : sécurité par ligne", () => {
  type Event = { at: number; kind: "create" | "drop" | "rls-on" | "rls-off" | "policy+" | "policy-"; table: string; policy?: string };
  const events: Event[] = [];
  const mine = (schema: string | undefined) => !schema || schema.replace(/"/g, "").toLowerCase() === "public"; // sans schéma = `public` (search_path par défaut)
  const ident = `(?:("?\\w+"?)\\.)?"?(\\w+)"?`;
  for (const m of sql.matchAll(new RegExp(`\\b(create|drop) table (?:if not exists |if exists )?${ident}`, "gi")))
    if (mine(m[2])) events.push({ at: m.index!, kind: m[1].toLowerCase() as "create" | "drop", table: m[3].toLowerCase() });
  for (const m of sql.matchAll(new RegExp(`alter table (?:only )?(?:if exists )?${ident}\\s+(enable|disable) row level security`, "gi")))
    if (mine(m[1])) events.push({ at: m.index!, kind: m[3].toLowerCase() === "enable" ? "rls-on" : "rls-off", table: m[2].toLowerCase() });
  for (const m of sql.matchAll(new RegExp(`\\b(create|drop) policy (?:if exists )?"?(\\w+)"? on ${ident}`, "gi")))
    if (mine(m[3])) events.push({ at: m.index!, kind: m[1].toLowerCase() === "create" ? "policy+" : "policy-", table: m[4].toLowerCase(), policy: m[2] });

  /** L'état final, en rejouant les migrations dans l'ordre : tables vivantes, celles avec la sécurité par ligne, politiques restantes. */
  const tables = new Set<string>();
  const rls = new Set<string>();
  const policies = new Map<string, Set<string>>();
  for (const e of events.sort((x, y) => x.at - y.at)) {
    if (e.kind === "create") tables.add(e.table);
    else if (e.kind === "drop") {
      tables.delete(e.table);
      rls.delete(e.table);
      policies.delete(e.table);
    }
    else if (e.kind === "rls-on") rls.add(e.table);
    else if (e.kind === "rls-off") rls.delete(e.table);
    else {
      const set = policies.get(e.table) ?? new Set<string>();
      if (e.kind === "policy+") set.add(e.policy!);
      else set.delete(e.policy!);
      policies.set(e.table, set);
    }
  }

  test("le test voit bien les tables (sinon il passerait à vide)", () => {
    assert.ok(tables.size >= 17, `${tables.size} tables trouvées`);
    for (const t of ["notes", "note_chunks", "messages", "invoices", "ai_calls"]) assert.ok(tables.has(t), t);
  });

  test("chaque table de `public` a la sécurité par ligne activée (et jamais désactivée ensuite)", () => {
    assert.deepEqual([...tables].filter((t) => !rls.has(t)), []);
  });

  test("chaque table de `public` garde au moins une politique", () => {
    assert.deepEqual([...tables].filter((t) => !(policies.get(t)?.size ?? 0)), []);
  });

  test("toute politique est réservée aux comptes connectés (`to authenticated`) : sans `to`, elle serait ouverte à tous", () => {
    const statements = sql.match(/create policy[^;]*;/gi) ?? [];
    assert.ok(statements.length >= 40, `${statements.length} politiques trouvées`);
    const roles = (st: string) => st.match(/\bfor\s+\w+\s+to\s+([\w\s,]+?)\s+(?:using|with\s+check)/i)?.[1].trim().toLowerCase();
    assert.deepEqual(statements.filter((st) => roles(st) !== "authenticated").map((st) => st.slice(0, 70)), []);
  });

  test("toute politique relie les lignes au compte connecté (`auth.uid()`) : jamais `using (true)`", () => {
    const statements = sql.match(/create policy[^;]*;/gi) ?? [];
    assert.deepEqual(statements.filter((st) => !/auth\.uid\(\)/i.test(st)).map((st) => st.slice(0, 70)), []);
  });

  test("aucun droit n'est donné à `anon`", () => {
    assert.deepEqual([...sql.matchAll(/\bgrant\b[^;]*\bto\b[^;]*\banon\b/gi)].map((m) => m[0].slice(0, 80)), []);
  });

  test("toute fonction SECURITY DEFINER a un `search_path` fixé", () => {
    const blocks = sql.split(/\n(?=\s*create\s)/i).filter((b) => /^\s*create (or replace )?function/i.test(b) && /security definer/i.test(b));
    assert.ok(blocks.length >= 2, "le test doit voir rule_version_is_mine et consume_ai_quota");
    assert.deepEqual(blocks.filter((b) => !/set search_path\s*(=|to)/i.test(b)).map((b) => b.slice(0, 80)), []);
  });
});

describe("code : secrets", () => {
  const files = codeFiles(["app/", "lib/", "components/", "scripts/", "tests/"], ["proxy.ts", "next.config.ts"]).filter((f) => f !== "lib/security-static.test.ts");

  test("le test voit bien le code (sinon il passerait à vide)", () => {
    assert.ok(files.length > 100, `${files.length} fichiers`);
  });

  /** Le code sans ses commentaires : un commentaire peut dire « jamais service_role ». */
  const code = (f: string) => read(f).replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");

  test("aucune clé `service_role` dans le code (ni dans les scripts ni dans les tests)", () => {
    const word = ["service", "role"].join("_");
    const found = files.filter((f) => new RegExp(word, "i").test(code(f)) && !f.endsWith("database.types.ts"));
    assert.deepEqual(found, []);
  });

  test("seules l'adresse et la clé PUBLIQUE de Supabase portent le préfixe NEXT_PUBLIC_ (visible dans le navigateur)", () => {
    const used = new Set<string>();
    for (const f of files) for (const m of code(f).matchAll(/NEXT_PUBLIC_[A-Z0-9_]+/g)) used.add(m[0]);
    for (const f of [".env.example", ".env.test.local.example"]) for (const m of read(f).matchAll(/^\s*(NEXT_PUBLIC_[A-Z0-9_]+)=/gm)) used.add(m[1]);
    assert.deepEqual([...used].sort(), ["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "NEXT_PUBLIC_SUPABASE_URL"]);
  });

  test("les fichiers d'environnement locaux sont ignorés par Git, et les exemples ne contiennent pas de valeur secrète", () => {
    const ignore = read(".gitignore");
    assert.ok(/^\.env\*\.local$/m.test(ignore) && /^\.env$/m.test(ignore));
    for (const f of [".env.example", ".env.test.local.example"]) {
      const secret = read(f).split("\n").filter((l) => /^[A-Z_]*(KEY|PASSWORD|SECRET|TOKEN)[A-Z_]*=\S/.test(l) && !/your-/.test(l));
      assert.deepEqual(secret, [], f);
    }
  });

  test("les clés d'IA ne sont lues que côté serveur : `lib/ai/config.ts` est `server-only`, et aucun composant client n'importe `lib/ai` ni la configuration de l'IA", () => {
    assert.ok(/import "server-only"/.test(read("lib/ai/config.ts")));
    const direct = files.filter((f) => /process\.env\.(ANTHROPIC|MISTRAL)/.test(code(f)) && !f.startsWith("scripts/") && !f.startsWith("tests/"));
    assert.deepEqual(direct.filter((f) => !/import "server-only"/.test(read(f))), []);
    const clients = files.filter((f) => /^\s*["']use client["']/.test(read(f)));
    assert.ok(clients.length > 20, `${clients.length} composants client trouvés`);
    assert.deepEqual(clients.filter((f) => /from "@\/lib\/ai\/|from "@\/lib\/domain\/ai-config"/.test(read(f))), []);
  });
});

describe("migrations : droits d'`anon`", () => {
  test("`anon` n'a aucun droit sur les tables de `public`, ni par défaut sur les futures (lot D)", () => {
    assert.ok(/revoke all on all tables in schema public from anon/i.test(sql));
    assert.ok(/alter default privileges for role postgres in schema public revoke all on tables from anon/i.test(sql));
    assert.ok(/alter default privileges for role postgres in schema public revoke execute on functions from public, anon/i.test(sql));
  });
});
