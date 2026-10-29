// Crochets de chargement des tests d'actions serveur : comme ts-hooks.mjs, plus des doublures (next/cache, next/navigation, client Supabase, indexation des notes, modèles d'IA).
import { fileURLToPath, pathToFileURL } from "node:url";

import { resolve as base } from "./ts-hooks.mjs";

const STUBS = {
  "next/cache": "stubs/next-cache.ts",
  "next/navigation": "stubs/next-navigation.ts",
  "next/server": "stubs/next-server.ts",
  "@/lib/supabase/server": "stubs/supabase-server.ts",
  "@/lib/ai/backlog-order": "stubs/ai.ts",
  "@/lib/ai/sprint-composition": "stubs/ai.ts",
  "@/lib/ai/story-proposals": "stubs/ai.ts",
  "@/lib/ai/task-proposals": "stubs/ai.ts",
  "@/lib/ai/story-review": "stubs/ai.ts",
  "@/lib/ai/prompt-generation": "stubs/ai.ts",
  "@/lib/ai/summary": "stubs/ai.ts",
  "@/lib/ai/embeddings": "stubs/ai.ts",
  "@/lib/ai/chat": "stubs/ai.ts",
  "@/app/(app)/notes/indexing": "stubs/notes-indexing.ts", // appelle Mistral : jamais dans un test
};
const HERE = fileURLToPath(new URL("./", import.meta.url));

export async function resolve(specifier, context, next) {
  const stub = STUBS[specifier];
  if (stub) return { url: pathToFileURL(`${HERE}${stub}`).href, shortCircuit: true };
  return base(specifier, context, next);
}
