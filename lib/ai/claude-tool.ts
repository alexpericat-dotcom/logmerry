import "server-only";

import { getAiConfig } from "@/lib/ai/config";

const URL = "https://api.anthropic.com/v1/messages";
const TIMEOUT_MS = 60_000;

/** Réponse JSON de l'API Messages (Claude) pour un message, avec ou sans outil ; lève une erreur sans contenu ni clé en cas d'échec réseau, de délai (60 s) ou de statut d'erreur. */
export async function callClaudeTool(opts: { system: string; tool?: object; message: string; maxTokens: number }): Promise<unknown> {
  const { anthropicApiKey, chatModel } = getAiConfig();
  const res = await fetch(URL, {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": anthropicApiKey, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({
      model: chatModel,
      max_tokens: opts.maxTokens,
      system: opts.system,
      // Pas de tool_choice forcé : ce modèle le refuse ; la consigne et l'analyse de la réponse imposent l'appel de l'outil.
      ...(opts.tool && { tools: [opts.tool] }),
      messages: [{ role: "user", content: opts.message }],
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`Claude a répondu ${res.status}.`);
  return res.json();
}

/** Aide au réglage : seule la raison d'arrêt est journalisée (jamais le contenu). */
export function logUnexpected(json: unknown) {
  console.error("Claude : proposition inattendue, stop_reason =", (json as { stop_reason?: string })?.stop_reason ?? "?");
}
