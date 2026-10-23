import "server-only";

import { callClaudeTool } from "@/lib/ai/claude-tool";
import { SYSTEM_PROMPT, buildUserMessage, parseAnswer, type ChunkForPrompt, type ClaudeAnswer } from "@/lib/domain/prompt";

/** Réponse de Claude à la question, à partir des seuls extraits fournis. Lève une erreur sans contenu ni clé en cas d'échec. */
export async function askClaude(question: string, chunks: ChunkForPrompt[]): Promise<ClaudeAnswer> {
  const json = await callClaudeTool({
    system: SYSTEM_PROMPT,
    maxTokens: 1024,
    message: buildUserMessage(question, chunks),
    tool: {
      name: "answer",
      description: "Réponse finale à l'utilisateur, avec les identifiants des extraits utilisés.",
      input_schema: {
        type: "object",
        properties: { answer: { type: "string" }, citations: { type: "array", items: { type: "string" } } },
        required: ["answer", "citations"],
      },
    },
  });
  try {
    return parseAnswer(json);
  } catch (e) {
    // Aide au réglage : seule la raison d'arrêt est journalisée (jamais le contenu).
    console.error("Claude : réponse inattendue, stop_reason =", (json as { stop_reason?: string })?.stop_reason ?? "?");
    throw e;
  }
}
