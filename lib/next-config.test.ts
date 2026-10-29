import assert from "node:assert/strict";
import { test } from "node:test";

import nextConfig from "../next.config.ts";

test("next.config applique les en-têtes de sécurité à toutes les routes", async () => {
  const rules = await nextConfig.headers?.();
  assert.equal(rules?.length, 1);
  assert.equal(rules?.[0].source, "/:path*");
  assert.equal(rules?.[0].headers.find((h) => h.key === "X-Frame-Options")?.value, "DENY");
});
