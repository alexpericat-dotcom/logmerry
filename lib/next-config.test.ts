import assert from "node:assert/strict";
import { test } from "node:test";

import nextConfig from "../next.config.ts";

test("next.config applique les en-têtes de sécurité à toutes les routes", async () => {
  const rules = await nextConfig.headers?.();
  assert.equal(rules?.length, 1);
  assert.equal(rules?.[0].source, "/:path*");
  assert.equal(rules?.[0].headers.find((h) => h.key === "X-Frame-Options")?.value, "DENY");
});

// Le paramètre de requête force Node à recharger le module : la configuration lit l'environnement à son chargement.
const freshConfig = (tag: string) => String(new URL(`../next.config.ts?${tag}`, import.meta.url));

test("next/image n'accepte que le dossier public du bucket « portfolio » de Supabase (et rien sans adresse configurée)", async () => {
  const saved = process.env.NEXT_PUBLIC_SUPABASE_URL;
  try {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://abc.supabase.co";
    const { default: fresh } = (await import(freshConfig("with-url"))) as { default: typeof nextConfig };
    assert.deepEqual(fresh.images?.remotePatterns, [{ protocol: "https", hostname: "abc.supabase.co", pathname: "/storage/v1/object/public/portfolio/**" }]);
    process.env.NEXT_PUBLIC_SUPABASE_URL = "";
    const { default: empty } = (await import(freshConfig("without-url"))) as { default: typeof nextConfig };
    assert.deepEqual(empty.images?.remotePatterns, []);
  } finally {
    if (saved === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    else process.env.NEXT_PUBLIC_SUPABASE_URL = saved;
  }
});
