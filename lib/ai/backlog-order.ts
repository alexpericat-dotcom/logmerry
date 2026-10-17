import "server-only";

import { callClaudeTool, logUnexpected } from "@/lib/ai/claude-tool";
import { ORDER_MAX, ORDER_SYSTEM_PROMPT, REASON_MAX, parseOrderCall } from "@/lib/domain/backlog-order";

/** Ordre brut de Claude (outil « order_backlog ») pour le message fourni ; à vérifier ensuite par `verifyOrder`. Lève une erreur sans contenu ni clé en cas d'échec. */
export async function orderWithClaude(message: string): Promise<Record<string, unknown>> {
  const json = await callClaudeTool({
    system: ORDER_SYSTEM_PROMPT,
    maxTokens: 2500,
    message,
    tool: {
      name: "order_backlog",
      description: "Liste complète des stories du backlog dans le nouvel ordre, avec une raison pour chaque story déplacée.",
      input_schema: {
        type: "object",
        properties: {
          order: {
            type: "array",
            maxItems: ORDER_MAX,
            items: {
              type: "object",
              properties: {
                id: { type: "string", description: "L'identifiant exact de la story, recopié de la balise <story id=…>." },
                reason: { type: "string", description: `Une phrase de ${REASON_MAX} caractères au plus, seulement si la story est déplacée.` },
              },
              required: ["id"],
            },
          },
        },
        required: ["order"],
      },
    },
  });
  try {
    return parseOrderCall(json);
  } catch (e) {
    logUnexpected(json);
    throw e;
  }
}
