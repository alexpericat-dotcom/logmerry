// Crochets de chargement des tests du proxy : comme ts-hooks.mjs (alias « @/ », « server-only » vide), plus des doublures de `@supabase/ssr` et de `next/server`
// (aucun client réel, aucun serveur Next). Les doublures partagent leur état par `stubs/proxy-fake.ts`.
import { fileURLToPath, pathToFileURL } from "node:url";

import { resolve as base } from "./ts-hooks.mjs";

const STUBS = { "@supabase/ssr": "stubs/supabase-ssr.ts", "next/server": "stubs/next-server-proxy.ts" };
const HERE = fileURLToPath(new URL("./", import.meta.url));

export async function resolve(specifier, context, next) {
  const stub = STUBS[specifier];
  if (stub) return { url: pathToFileURL(`${HERE}${stub}`).href, shortCircuit: true };
  return base(specifier, context, next);
}
