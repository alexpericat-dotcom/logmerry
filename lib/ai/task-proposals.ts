import "server-only";

import { callClaudeTool, logUnexpected } from "@/lib/ai/claude-tool";
import { parseToolCall } from "@/lib/domain/story-proposals";
import { TASK_PROPOSALS_MAX, TASK_SYSTEM_PROMPT } from "@/lib/domain/task-proposals";

/** Tâches brutes de Claude (outil « propose_tasks ») pour le message fourni ; à vérifier ensuite par `verifyTaskProposals`. Lève une erreur sans contenu ni clé en cas d'échec. */
export async function proposeTasksWithClaude(message: string): Promise<unknown[]> {
  const json = await callClaudeTool({
    system: TASK_SYSTEM_PROMPT,
    maxTokens: 1500,
    message,
    tool: {
      name: "propose_tasks",
      description: "Tâches pour réaliser la user story, dans l'ordre logique de réalisation.",
      input_schema: {
        type: "object",
        properties: {
          tasks: {
            type: "array",
            maxItems: TASK_PROPOSALS_MAX,
            items: { type: "object", properties: { title: { type: "string", description: "Action concrète à l'infinitif : « Créer le tableau des inscriptions »." } }, required: ["title"] },
          },
        },
        required: ["tasks"],
      },
    },
  });
  try {
    return parseToolCall(json, "propose_tasks", "tasks");
  } catch (e) {
    logUnexpected(json);
    throw e;
  }
}
