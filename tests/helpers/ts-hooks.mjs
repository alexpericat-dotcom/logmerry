// Crochets de chargement pour exécuter hors de Next les modules de l'application : « server-only » vide
// et alias « @/ » vers la racine du projet. Servent aux scripts de mesure (npm run test:rag).
import { existsSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = fileURLToPath(new URL("../../", import.meta.url));

export async function resolve(specifier, context, next) {
  if (specifier === "server-only") return { url: "data:text/javascript,", shortCircuit: true };
  if (specifier.startsWith("@/")) {
    const base = `${ROOT}${specifier.slice(2)}`;
    const file = [".ts", ".tsx", ""].map((e) => base + e).find((f) => existsSync(f) && !f.endsWith("/"));
    if (file) return { url: pathToFileURL(file).href, shortCircuit: true };
  }
  // Paquets : résolus depuis la racine du projet, même pour un fichier chargé d'ailleurs.
  if (!/^(\.|\/|node:|data:|file:)/.test(specifier)) {
    return next(specifier, { ...context, parentURL: pathToFileURL(`${ROOT}package.json`).href });
  }
  return next(specifier, context);
}
