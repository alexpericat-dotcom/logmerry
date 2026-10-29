// Chargeur des tests de composants : comme ts-hooks.mjs (alias « @/ », « server-only » vide), plus les fichiers .tsx, que Node ne lit pas :
// ils sont transformés par TypeScript (déjà installé), avec la même option JSX que tsconfig.json (« react-jsx »).
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import ts from "typescript";

import { resolve as appResolve } from "./ts-hooks.mjs";

const STUBS = {
  "next/navigation": new URL("./stubs/next-navigation-client.ts", import.meta.url).href,
  "next/link": new URL("./stubs/next-link.tsx", import.meta.url).href,
  // Server Actions : on teste les composants, pas les actions (testées dans tests/actions).
  "@/app/(app)/calendrier/actions": new URL("./stubs/calendrier-actions.ts", import.meta.url).href,
  "@/app/(app)/factures/payment-actions": new URL("./stubs/payment-actions.ts", import.meta.url).href,
  "@/app/(app)/factures/actions": new URL("./stubs/invoice-actions.ts", import.meta.url).href,
  "@/app/(app)/clients/quote-actions": new URL("./stubs/quote-actions.ts", import.meta.url).href,
  "@/app/(app)/regles/actions": new URL("./stubs/rule-actions.ts", import.meta.url).href,
};

/** Les imports faits depuis `node_modules` gardent la résolution de Node : ts-hooks.mjs résout tout paquet depuis la racine, ce qui donnerait à jsdom
 *  la mauvaise version de `lru-cache` (la sienne est imbriquée). */
export async function resolve(specifier, context, next) {
  if (STUBS[specifier]) return { url: STUBS[specifier], shortCircuit: true };
  if (context.parentURL?.includes("/node_modules/")) return next(specifier, context);
  return appResolve(specifier, context, next);
}

export async function load(url, context, next) {
  if (!url.endsWith(".tsx")) return next(url, context);
  const source = await readFile(fileURLToPath(url), "utf8");
  const { outputText } = ts.transpileModule(source, {
    fileName: fileURLToPath(url),
    compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  });
  return { format: "module", source: outputText, shortCircuit: true };
}
