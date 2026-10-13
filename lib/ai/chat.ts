import "server-only";

import { getAiConfig } from "@/lib/ai/config";
import { SYSTEM_PROMPT, buildUserMessage, parseAnswer, type ChunkForPrompt, type ClaudeAnswer } from "@/lib/domain/prompt";

const URL = "https://api.anthropic.com/v1/messages";
const TIMEOUT_MS = 60_000;

/** Réponse de Claude à la question, à partir des seuls extraits fournis. Lève une erreur sans contenu ni clé en cas d'échec. */
export async function askClaude(question: string, chunks: ChunkForPrompt[]): Promise<ClaudeAnswer> {
  const { anthropicApiKey, chatModel } = getAiConfig();
  const res = await fetch(URL, {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": anthropicApiKey, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({
      model: chatModel,
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      // Pas de tool_choice forcé : ce modèle le refuse ; la consigne et parseAnswer imposent l'appel de l'outil.
      tools: [
        {
          name: "answer",
          description: "Réponse finale à l'utilisateur, avec les identifiants des extraits utilisés.",
          input_schema: {
            type: "object",
            properties: { answer: { type: "string" }, citations: { type: "array", items: { type: "string" } } },
            required: ["answer", "citations"],
          },
        },
      ],
      messages: [{ role: "user", content: buildUserMessage(question, chunks) }],
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`Claude a répondu ${res.status}.`);
  const json = await res.json();
  try {
    return parseAnswer(json);
  } catch (e) {
    // Aide au réglage : seule la raison d'arrêt est journalisée (jamais le contenu).
    console.error("Claude : réponse inattendue, stop_reason =", (json as { stop_reason?: string })?.stop_reason ?? "?");
    throw e;
  }
}
