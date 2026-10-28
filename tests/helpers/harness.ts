/**
 * Faux client Supabase pour tester les actions serveur hors de Next (npm run test:actions). Il ne simule pas la base : il ENREGISTRE chaque requête
 * (table, opération, données, filtres, colonnes relues) et répond ce que le test lui dicte (`fake.respond`). Un test peut donc prouver qu'une action
 * écrit dans la bonne table, avec le bon filtre (`.eq("status", "draft")`), qu'elle relit bien la ligne (`.select("id")`) et qu'elle traduit les erreurs.
 * `next/cache`, `next/navigation` et `@/lib/supabase/server` sont remplacés par des doublures (tests/helpers/stubs, branchées par action-hooks.mjs).
 */
import assert from "node:assert/strict";
import { afterEach, beforeEach } from "node:test";

export type Filter = { kind: string; args: unknown[] };
export type Op = {
  table: string;
  op: "select" | "insert" | "update" | "upsert" | "delete" | "rpc";
  payload?: unknown;
  options?: unknown;
  filters: Filter[];
  /** Colonnes de `.select(...)` : sur une écriture, signe que l'action relit les lignes touchées. */
  columns?: string;
  returning: boolean;
  terminal?: "single" | "maybeSingle";
};
export type Reply = { data?: unknown; error?: { code?: string; message?: string } | null };

export class Redirect extends Error {
  url: string;
  constructor(url: string) {
    super(`NEXT_REDIRECT ${url}`);
    this.url = url;
  }
}

export const fake = {
  ops: [] as Op[],
  /** Chemins revalidés ; un type (`"page"`, `"layout"`) s'écrit à la suite : `/missions/[id]#page`. */
  revalidated: [] as string[],
  /** Erreurs du harnais lui-même (méthode du client non gérée) : un test ne doit jamais passer grâce à elles. */
  problems: [] as string[],
  /** `createClient()` lève (réseau, cookies) : l'action doit répondre « échec », pas planter. */
  failCreate: false,
  claims: { sub: "00000000-0000-4000-8000-000000000001" } as Record<string, unknown> | null,
  respond: ((): Reply => ({ data: [], error: null })) as (op: Op) => Reply,
  /** À appeler avant chaque test : plus de requête, session ouverte, réponse vide. */
  reset() {
    this.ops = [];
    this.revalidated = [];
    this.problems = [];
    this.failCreate = false;
    this.claims = { sub: "00000000-0000-4000-8000-000000000001" };
    this.respond = () => ({ data: [], error: null });
  },
  /** Les requêtes sur une table (et, si donnée, une opération). */
  on(table: string, op?: Op["op"]) {
    return this.ops.filter((o) => o.table === table && (!op || o.op === op));
  },
};

/** Branche le harnais sur le fichier de test : remise à zéro avant chaque test, et échec si le client factice a reçu un appel qu'il ne connaît pas. */
export function withHarness() {
  beforeEach(() => fake.reset());
  afterEach(() => assert.deepEqual(fake.problems, [], "le client factice a reçu un appel non géré : l'action l'a peut-être avalé comme un échec"));
}

/** La valeur d'un filtre `kind` sur une colonne, ex. `filterValue(op, "eq", "status")` → la valeur demandée. */
export const filterValue = (op: Op, kind: string, column: string): unknown => op.filters.find((f) => f.kind === kind && f.args[0] === column)?.args[1];

const FILTERS = ["eq", "neq", "is", "in", "like", "ilike", "gt", "gte", "lt", "lte", "or", "not", "contains", "order", "limit", "range", "match", "filter"];

function builder(table: string) {
  const op: Op = { table, op: "select", filters: [], returning: false };
  let started = false;
  const start = (kind: Op["op"], payload?: unknown, options?: unknown) => {
    op.op = kind;
    op.payload = payload;
    op.options = options;
    started = true;
    return b;
  };
  const run = () => {
    fake.ops.push(op);
    const r = fake.respond(op);
    let data = r.data ?? null;
    let error = r.error ?? null;
    if (op.terminal && Array.isArray(data)) {
      data = data[0] ?? null;
      if (data === null && op.terminal === "single" && !error) error = { code: "PGRST116", message: "no rows" };
    }
    return { data, error };
  };
  const b: Record<string, unknown> = {
    select(columns?: string) {
      if (started) op.returning = true;
      op.columns = columns ?? "*";
      started = true;
      return b;
    },
    insert: (payload: unknown, options?: unknown) => start("insert", payload, options),
    update: (payload: unknown) => start("update", payload),
    upsert: (payload: unknown, options?: unknown) => start("upsert", payload, options),
    delete: () => start("delete"),
    single() {
      op.terminal = "single";
      return b;
    },
    maybeSingle() {
      op.terminal = "maybeSingle";
      return b;
    },
    then: (resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) => Promise.resolve(run()).then(resolve, reject),
  };
  for (const kind of FILTERS) {
    b[kind] = (...args: unknown[]) => {
      op.filters.push({ kind, args });
      return b;
    };
  }
  // Une méthode inconnue ne doit pas passer pour une erreur de la base (withSession l'avalerait) : on la note, et le test échoue.
  return new Proxy(b, {
    get(target, prop) {
      if (prop in target || typeof prop !== "string") return target[prop as string];
      fake.problems.push(`${table}.${prop}`);
      return () => {
        throw new Error(`harnais : méthode non gérée ${prop}`);
      };
    },
  });
}

/** Le client que `createClient()` renvoie aux actions. */
export const client = {
  from: (table: string) => builder(table),
  rpc(name: string, args?: unknown) {
    const op: Op = { table: name, op: "rpc", payload: args, filters: [], returning: false };
    return Promise.resolve().then(() => {
      fake.ops.push(op);
      const r = fake.respond(op);
      return { data: r.data ?? null, error: r.error ?? null };
    });
  },
  auth: {
    getClaims: async () => (fake.claims ? { data: { claims: fake.claims }, error: null } : { data: null, error: { message: "no session" } }),
    getUser: async () => (fake.claims ? { data: { user: { id: fake.claims.sub } }, error: null } : { data: { user: null }, error: { message: "no session" } }),
  },
};
