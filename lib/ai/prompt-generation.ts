import "server-only";

import { callClaudeTool, logUnexpected } from "@/lib/ai/claude-tool";
import { PROMPT_MAX, PROMPT_SYSTEM_PROMPT, parsePromptCall } from "@/lib/domain/prompt-generation";

/** Consigne brute de Claude (outil « write_prompt ») pour le message fourni ; à vérifier ensuite par `verifyInstruction`. Lève une erreur sans contenu ni clé en cas d'échec. */
export async function writePromptWithClaude(message: string): Promise<string> {
  const json = await callClaudeTool({
    system: PROMPT_SYSTEM_PROMPT,
    maxTokens: 3500,
    message,
    tool: {
      name: "write_prompt",
      description: "La partie « instruction » du prompt destiné à l'assistant ; le contexte de la mission est ajouté ensuite par le code.",
      input_schema: {
        type: "object",
        properties: { prompt: { type: "string", description: `Consigne rédigée à l'adresse de l'assistant destinataire, ${PROMPT_MAX} caractères au plus.` } },
        required: ["prompt"],
      },
    },
  });
  try {
    return parsePromptCall(json);
  } catch (e) {
    logUnexpected(json);
    throw e;
  }
}
