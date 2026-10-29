// Chargeur des tests de composants : comme ts-hooks.mjs (alias « @/ », « server-only » vide), plus les fichiers .tsx, que Node ne lit pas :
// ils sont transformés par TypeScript (déjà installé), avec la même option JSX que tsconfig.json (« react-jsx »).
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import ts from "typescript";

import { resolve as appResolve } from "./ts-hooks.mjs";

/** Les imports faits depuis `node_modules` gardent la résolution de Node : ts-hooks.mjs résout tout paquet depuis la racine, ce qui donnerait à jsdom
 *  la mauvaise version de `lru-cache` (la sienne est imbriquée). */
export async function resolve(specifier, context, next) {
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
