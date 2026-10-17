import "server-only";

import { callClaudeTool, logUnexpected } from "@/lib/ai/claude-tool";
import { REMARK_KINDS, REVIEW_REMARKS_MAX, REVIEW_SYSTEM_PROMPT, parseReviewCall } from "@/lib/domain/story-review";

/** Relecture brute de Claude (outil « review_story ») pour le message fourni ; à vérifier ensuite par `verifyReview`. Lève une erreur sans contenu ni clé en cas d'échec. */
export async function reviewWithClaude(message: string): Promise<Record<string, unknown>> {
  const json = await callClaudeTool({
    system: REVIEW_SYSTEM_PROMPT,
    maxTokens: 2500,
    message,
    tool: {
      name: "review_story",
      description: "Remarques sur la user story et version améliorée de la story.",
      input_schema: {
        type: "object",
        properties: {
          remarks: {
            type: "array",
            maxItems: REVIEW_REMARKS_MAX,
            items: {
              type: "object",
              properties: {
                kind: { type: "string", enum: [...REMARK_KINDS], description: "Type de la remarque." },
                text: { type: "string", description: "Une phrase de 200 caractères au plus." },
              },
              required: ["kind", "text"],
            },
          },
          story: {
            type: "object",
            properties: {
              title: { type: "string", description: "À l'infinitif, sans « je veux »." },
              role: { type: "string", description: "Sans « en tant que »." },
              benefit: { type: "string", description: "À l'infinitif, sans « afin de »." },
              acceptance_criteria: { type: "string", description: "2 à 5 puces commençant par « - »." },
              points: { type: "number", description: "1, 2, 3, 5, 8 ou 13 ; seulement si la story n'a pas de points." },
            },
            required: ["title", "role", "benefit", "acceptance_criteria"],
          },
        },
        required: ["remarks", "story"],
      },
    },
  });
  try {
    return parseReviewCall(json);
  } catch (e) {
    logUnexpected(json);
    throw e;
  }
}
