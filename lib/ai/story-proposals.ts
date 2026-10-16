import "server-only";

import { getAiConfig } from "@/lib/ai/config";
import { PROPOSAL_SYSTEM_PROMPT, PROPOSALS_MAX, parseToolInput } from "@/lib/domain/story-proposals";

const URL = "https://api.anthropic.com/v1/messages";
const TIMEOUT_MS = 60_000;

/** Propositions brutes de Claude (outil « propose_stories ») pour le message fourni ; à vérifier ensuite par `verifyProposals`. Lève une erreur sans contenu ni clé en cas d'échec. */
export async function proposeWithClaude(message: string, signal?: AbortSignal): Promise<unknown[]> {
  const { anthropicApiKey, chatModel } = getAiConfig();
  const res = await fetch(URL, {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": anthropicApiKey, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({
      model: chatModel,
      max_tokens: 3000,
      system: PROPOSAL_SYSTEM_PROMPT,
      // Pas de tool_choice forcé : ce modèle le refuse (voir l'assistant) ; la consigne et parseToolInput imposent l'appel de l'outil.
      tools: [
        {
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
      ],
      messages: [{ role: "user", content: message }],
    }),
    signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(TIMEOUT_MS)]) : AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`Claude a répondu ${res.status}.`);
  const json = await res.json();
  try {
    return parseToolInput(json);
  } catch (e) {
    // Aide au réglage : seule la raison d'arrêt est journalisée (jamais le contenu).
    console.error("Claude : proposition inattendue, stop_reason =", (json as { stop_reason?: string })?.stop_reason ?? "?");
    throw e;
  }
}
