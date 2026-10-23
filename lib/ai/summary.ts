import "server-only";

import { callClaudeTool } from "@/lib/ai/claude-tool";
import { SUMMARY_SYSTEM_PROMPT, buildSummaryMessage, parseSummary, verifySummary } from "@/lib/domain/summary";

/** Résumé d'une note par Claude (titre et texte de cette seule note), vérifié avant d'être rendu. Lève une erreur sans contenu ni clé en cas d'échec. */
export async function summarizeWithClaude(note: { title: string; body: string }): Promise<string> {
  const json = await callClaudeTool({ system: SUMMARY_SYSTEM_PROMPT, message: buildSummaryMessage(note.title, note.body), maxTokens: 800 });
  return verifySummary(parseSummary(json), note);
}
