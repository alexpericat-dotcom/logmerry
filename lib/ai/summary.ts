import "server-only";

import { getAiConfig } from "@/lib/ai/config";
import { SUMMARY_SYSTEM_PROMPT, buildSummaryMessage, parseSummary, verifySummary } from "@/lib/domain/summary";

const URL = "https://api.anthropic.com/v1/messages";
const TIMEOUT_MS = 60_000;

/** Résumé d'une note par Claude (titre et texte de cette seule note), vérifié avant d'être rendu. Lève une erreur sans contenu ni clé en cas d'échec. */
export async function summarizeWithClaude(note: { title: string; body: string }): Promise<string> {
  const { anthropicApiKey, chatModel } = getAiConfig();
  const res = await fetch(URL, {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": anthropicApiKey, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({
      model: chatModel,
      max_tokens: 800,
      system: SUMMARY_SYSTEM_PROMPT,
      messages: [{ role: "user", content: buildSummaryMessage(note.title, note.body) }],
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`Claude a répondu ${res.status}.`);
  return verifySummary(parseSummary(await res.json()), note);
}
