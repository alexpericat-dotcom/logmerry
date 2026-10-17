import "server-only";

import { callClaudeTool, logUnexpected } from "@/lib/ai/claude-tool";
import { BACKLOG_MAX, COMPOSE_SYSTEM_PROMPT, REASON_MAX, parseComposeCall } from "@/lib/domain/sprint-composition";
import { SPRINT_GOAL_MAX } from "@/lib/domain/sprints";

/** Proposition brute de Claude (outil « compose_sprint ») pour le message fourni ; à vérifier ensuite par `verifyComposition`. Lève une erreur sans contenu ni clé en cas d'échec. */
export async function composeWithClaude(message: string): Promise<Record<string, unknown>> {
  const json = await callClaudeTool({
    system: COMPOSE_SYSTEM_PROMPT,
    maxTokens: 1500,
    message,
    tool: {
      name: "compose_sprint",
      description: "Stories du backlog à placer dans le sprint, dans l'ordre de priorité, et objectif du sprint s'il n'en a pas.",
      input_schema: {
        type: "object",
        properties: {
          stories: {
            type: "array",
            maxItems: BACKLOG_MAX,
            items: {
              type: "object",
              properties: {
                id: { type: "string", description: "L'identifiant exact de la story, recopié de la balise <story id=…> du backlog." },
                reason: { type: "string", description: `Une phrase de ${REASON_MAX} caractères au plus, au tutoiement.` },
              },
              required: ["id", "reason"],
            },
          },
          goal: { type: "string", description: `Objectif du sprint en une phrase de ${SPRINT_GOAL_MAX} caractères au plus ; seulement si le sprint n'en a pas.` },
        },
        required: ["stories"],
      },
    },
  });
  try {
    return parseComposeCall(json);
  } catch (e) {
    logUnexpected(json);
    throw e;
  }
}
