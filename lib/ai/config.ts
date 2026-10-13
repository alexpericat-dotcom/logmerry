import "server-only";

import { VARIABLES, readAiConfig, readEnvVar } from "@/lib/domain/ai-config";

/** Configuration complète des modèles d'IA, lue à l'appel (le build n'a pas besoin des clés). Serveur uniquement. */
export function getAiConfig() {
  return readAiConfig(process.env);
}

/** Clé Mistral seule : vectoriser n'a pas besoin de la clé Anthropic. */
export function getMistralApiKey() {
  return readEnvVar(process.env, VARIABLES.mistralApiKey);
}
