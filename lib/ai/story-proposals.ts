import "server-only";

import { callClaudeTool, logUnexpected } from "@/lib/ai/claude-tool";
import { PROPOSAL_SYSTEM_PROMPT, PROPOSALS_MAX, parseToolInput } from "@/lib/domain/story-proposals";

/** Propositions brutes de Claude (outil « propose_stories ») pour le message fourni ; à vérifier ensuite par `verifyProposals`. Lève une erreur sans contenu ni clé en cas d'échec. */
export async function proposeWithClaude(message: string): Promise<unknown[]> {
  const json = await callClaudeTool({
    system: PROPOSAL_SYSTEM_PROMPT,
    maxTokens: 3000,
    message,
    tool: {
      name: "propose_stories",
      description: "Propositions de user stories pour le backlog de la mission, de la plus à la moins prioritaire.",
      input_schema: {
        type: "object",
        properties: {
          stories: {
            type: "array",
            maxItems: PROPOSALS_MAX,
            items: {
              type: "object",
              properties: {
                title: { type: "string", description: "À l'infinitif, sans « je veux » : « Suivre les inscriptions »." },
                role: { type: "string", description: "Sans « en tant que » : « responsable des ateliers »." },
                benefit: { type: "string", description: "À l'infinitif, sans « afin de » : « relancer à temps les familles »." },
                acceptance_criteria: { type: "string", description: "2 à 4 puces commençant par « - »." },
                points: { type: "number", description: "Points d'effort : 1, 2, 3, 5, 8 ou 13." },
                note: { type: "string", description: "Identifiant de la note d'où vient la story, sinon vide." },
              },
              required: ["title", "role", "benefit", "acceptance_criteria"],
            },
          },
        },
        required: ["stories"],
      },
    },
  });
  try {
    return parseToolInput(json);
  } catch (e) {
    logUnexpected(json);
    throw e;
  }
}
