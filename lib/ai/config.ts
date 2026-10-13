import "server-only";

import { readAiConfig } from "@/lib/domain/ai-config";

/** Configuration des modèles d'IA, lue à l'appel (le build n'a pas besoin des clés). Serveur uniquement. */
export function getAiConfig() {
  return readAiConfig(process.env);
}
