// Crochets de chargement des tests d'actions serveur : comme ts-hooks.mjs, plus trois doublures (next/cache, next/navigation, client Supabase).
import { fileURLToPath, pathToFileURL } from "node:url";

import { resolve as base } from "./ts-hooks.mjs";

const STUBS = {
  "next/cache": "stubs/next-cache.ts",
  "next/navigation": "stubs/next-navigation.ts",
  "@/lib/supabase/server": "stubs/supabase-server.ts",
};
const HERE = fileURLToPath(new URL("./", import.meta.url));

export async function resolve(specifier, context, next) {
  const stub = STUBS[specifier];
  if (stub) return { url: pathToFileURL(`${HERE}${stub}`).href, shortCircuit: true };
  return base(specifier, context, next);
}
