import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, test } from "node:test";

import { AI_LIMIT_PER_DAY, AI_LIMIT_PER_MINUTE, parseQuotaResult, quotaFromRpc, quotaMessage } from "./ai-quota.ts";

describe("parseQuotaResult", () => {
  test("les trois réponses de la base sont reprises telles quelles", () => {
    for (const r of ["ok", "minute", "day"] as const) assert.equal(parseQuotaResult(r), r);
  });
  test("toute autre valeur refuse : mieux vaut bloquer que laisser passer sans compter", () => {
    for (const bad of [null, undefined, "", "OK", "true", true, 1, {}, ["ok"]]) assert.equal(parseQuotaResult(bad), "error");
  });
});

test("quotaFromRpc : une erreur de la base refuse, même si la donnée dit « ok » ; sinon la donnée décide", () => {
  assert.equal(quotaFromRpc({ data: "ok", error: { message: "x" } }), "error");
  assert.equal(quotaFromRpc({ data: null, error: new Error("réseau") }), "error");
  assert.equal(quotaFromRpc({ data: "ok", error: null }), "ok");
  assert.equal(quotaFromRpc({ data: "day", error: null }), "day");
  assert.equal(quotaFromRpc({ data: undefined, error: null }), "error");
});

test("les messages distinguent la minute, le jour et l'erreur", () => {
  assert.ok(quotaMessage("minute").includes("une minute"));
  assert.ok(quotaMessage("day").includes("24 heures"));
  assert.ok(quotaMessage("error").includes("indisponible"));
});

test("les plafonds sont ceux de la migration (20 par minute, 300 par jour)", () => {
  assert.equal(AI_LIMIT_PER_MINUTE, 20);
  assert.equal(AI_LIMIT_PER_DAY, 300);
  const sql = readFileSync(new URL("../../supabase/migrations/20261030100100_ai_quota_lockdown.sql", import.meta.url), "utf8");
  assert.ok(sql.includes(`per_minute >= ${AI_LIMIT_PER_MINUTE}`));
  assert.ok(sql.includes(`per_day >= ${AI_LIMIT_PER_DAY}`));
  assert.ok(sql.includes("security definer") && sql.includes("drop policy ai_calls_delete"), "la table n'est écrite que par la fonction");
});
