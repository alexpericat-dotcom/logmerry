export type AiConfig = { anthropicApiKey: string; mistralApiKey: string; chatModel: string };

const VARIABLES = {
  anthropicApiKey: "ANTHROPIC_API_KEY",
  mistralApiKey: "MISTRAL_API_KEY",
  chatModel: "AI_CHAT_MODEL",
} as const;

/** Lit la configuration IA dans `env` ; une variable absente ou vide lève une erreur qui la nomme (jamais sa valeur). */
export function readAiConfig(env: Record<string, string | undefined>): AiConfig {
  const config = {} as AiConfig;
  for (const [key, name] of Object.entries(VARIABLES) as [keyof AiConfig, string][]) {
    const value = env[name]?.trim();
    if (!value) throw new Error(`Variable d'environnement manquante : ${name}`);
    config[key] = value;
  }
  return config;
}
