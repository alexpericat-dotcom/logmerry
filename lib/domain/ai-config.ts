export type AiConfig = { anthropicApiKey: string; mistralApiKey: string; chatModel: string };

export const VARIABLES = {
  anthropicApiKey: "ANTHROPIC_API_KEY",
  mistralApiKey: "MISTRAL_API_KEY",
  chatModel: "AI_CHAT_MODEL",
} as const;

/** Valeur d'une variable d'environnement ; absente ou vide : erreur qui la nomme (jamais sa valeur). */
export function readEnvVar(env: Record<string, string | undefined>, name: string): string {
  const value = env[name]?.trim();
  if (!value) throw new Error(`Variable d'environnement manquante : ${name}`);
  return value;
}

/** Lit toute la configuration IA ; chaque appelant qui n'a besoin que d'un fournisseur lit sa seule variable. */
export function readAiConfig(env: Record<string, string | undefined>): AiConfig {
  const config = {} as AiConfig;
  for (const [key, name] of Object.entries(VARIABLES) as [keyof AiConfig, string][]) {
    config[key] = readEnvVar(env, name);
  }
  return config;
}
