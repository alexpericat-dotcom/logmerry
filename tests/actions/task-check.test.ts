import assert from "node:assert/strict";
import { test } from "node:test";

import { todayParis } from "../../lib/format.ts";
import type { CheckTarget } from "../../lib/domain/cockpit/today.ts";
import { checkTask } from "../../app/(app)/aujourd-hui/actions.ts";
import { Redirect, fake, filterValue, withHarness } from "../helpers/harness.ts";

const UUID = "11111111-1111-4111-8111-111111111111";

withHarness();

test("coche valide : upsert dans task_checks, cockpit revalidé", async () => {
  const r = await checkTask({ rule: 2, sourceId: UUID }, true);
  assert.deepEqual(r, {});
  const [op] = fake.on("task_checks", "upsert");
  assert.equal((op.payload as { rule_no: number }).rule_no, 2);
  assert.equal((op.payload as { source_id: string }).source_id, UUID);
  assert.equal((op.payload as { period_start: string }).period_start, todayParis()); // la coche est du jour de Paris
  assert.equal((op.options as { ignoreDuplicates: boolean }).ignoreDuplicates, true); // idempotente : un doublon est ignoré
  assert.deepEqual(fake.revalidated, ["/aujourd-hui"]);
});

test("règle 8 (mission à facturer) : la coche porte la mission, comme la règle 7", async () => {
  assert.deepEqual(await checkTask({ rule: 8, sourceId: UUID }, true), {});
  const [op] = fake.on("task_checks", "upsert");
  assert.equal((op.payload as { rule_no: number }).rule_no, 8);
  assert.equal((op.payload as { source_id: string }).source_id, UUID);
});

test("décocher : delete filtré par règle, jour et source (jamais tout supprimer)", async () => {
  await checkTask({ rule: 5, sourceId: UUID }, false);
  const [op] = fake.on("task_checks", "delete");
  assert.equal(filterValue(op, "eq", "rule_no"), 5);
  assert.equal(filterValue(op, "eq", "source_id"), UUID);
  assert.ok(op.filters.some((f) => f.kind === "eq" && f.args[0] === "period_start"));
});

test("plafond (règle 3) : décocher filtre aussi sur le plafond et le seuil", async () => {
  await checkTask({ rule: 3, ceilingKey: "ceiling_turnover_micro", threshold: 90 }, false);
  const [op] = fake.on("task_checks", "delete");
  assert.equal(filterValue(op, "eq", "ceiling_key"), "ceiling_turnover_micro");
  assert.equal(filterValue(op, "eq", "threshold"), 90);
  assert.ok(op.filters.some((f) => f.kind === "is" && f.args[0] === "source_id" && f.args[1] === null));
});

test("cible invalide : aucune écriture, message d'erreur", async () => {
  const invalid: CheckTarget[] = [{ rule: 2, sourceId: "pas-un-uuid" }, { rule: 2 }, { rule: 3, ceilingKey: "inconnu", threshold: 90 }, { rule: 8 }, { rule: 8, sourceId: "pas-un-uuid" }, { rule: 9 as 2 }];
  for (const target of invalid) {
    const r = await checkTask(target, true);
    assert.equal(r.message, "Enregistrement impossible. Réessaie.");
  }
  assert.equal(fake.ops.length, 0);
  assert.deepEqual(fake.revalidated, []);
});

test("sans session : redirection vers la connexion, aucune écriture", async () => {
  fake.claims = null;
  await assert.rejects(() => checkTask({ rule: 4 }, true), (e) => e instanceof Redirect && e.url === "/auth/login");
  assert.equal(fake.ops.length, 0);
});

test("session impossible à ouvrir : message d'échec, aucune requête", async () => {
  fake.failCreate = true;
  assert.equal((await checkTask({ rule: 4 }, true)).message, "Enregistrement impossible. Réessaie.");
  assert.equal(fake.ops.length, 0);
});

test("erreur de la base : message, cockpit non revalidé", async () => {
  fake.respond = () => ({ error: { code: "XX000" } });
  const r = await checkTask({ rule: 4 }, true);
  assert.equal(r.message, "Enregistrement impossible. Réessaie.");
  assert.deepEqual(fake.revalidated, []);
});
